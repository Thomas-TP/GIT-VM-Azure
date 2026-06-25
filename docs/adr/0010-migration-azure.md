# ADR 0010 — Migration de la couche compute vers Azure Virtual Machines

**Statut** : Acté (2026-06-25) · **Supersède partiellement** [ADR 0001](0001-garder-aws-et-cloudflare-workers.md)
et [ADR 0002](0002-provisioning-api-directe-vs-terraform.md) (couche compute uniquement).

## Contexte

Le portail existe en variante **AWS EC2** fonctionnelle. On veut une **variante Azure** (exercice
multi-cloud) **sans réécrire l'application** : même UX, même base de code, même réconciliateur. Deux
contraintes externes fortes :

- **Abonnement « Azure for Students »** : SKU **B-series / F-series / 1 vCPU bloqués**
  (`NotAvailableForSubscription`) dans toutes les régions ; quota **6 vCPU** et **3 IP publiques** par
  région ; les types `snapshots`/`disks` n'acceptent pas l'API `2024-07-01`.
- **Compte Cloudflare (Free)** : **5 cron triggers max**, déjà tous consommés par les autres variantes
  (AWS / Huawei / OpenStack).

## Décision

1. **Remplacer `src/aws.ts` par `src/azure.ts`** : client **Azure Resource Manager** (REST + JSON),
   auth **service-principal** (client-credentials → Bearer). Les **noms de fonctions exportées sont
   conservés** (createKeyPair, launchInstance, describeInstance, start/stop/reboot/terminate, snapshots,
   maxCpuOverWindow, costExplorer, listManagedInstances) → **le réconciliateur `index.ts` est
   inchangé**. Les `PowerState/*` Azure sont mappés vers les états attendus.
2. **Migrations D1 additives** : on **garde** les colonnes `aws_instance_id` / `aws_snapshot_id`, qui
   stockent désormais des identifiants Azure opaques (nom de VM / nom de snapshot).
3. **Catalogue** (`presets.ts`) : tailles **Dsv3 / Dasv4 / Esv3** (≥ 2 vCPU), disques managés, images
   Marketplace, **Azure Linux 3** à la place d'Amazon Linux.
4. **Réconciliateur piloté en externe** : pas de `triggers.crons` ; une **GitHub Action** appelle
   `POST /api/internal/cron` (Bearer `CRON_SECRET`). `scheduled()` est conservé pour un retour au cron
   natif si le compte passe en Workers Paid.
5. **Nouveau Worker** `git-vm-portal-azure` + **D1** `git_vm_portal_azure`, sans toucher à l'existant AWS.

## Justification

- Toute la dépendance cloud était déjà **isolée** dans un seul module → coût de portage minimal et
  risque de régression faible (le pipeline de cycle de vie n'est pas réécrit — cohérent avec ADR 0004).
- ARM REST se signe avec un simple Bearer → **pas de SDK**, idéal pour un Worker (vs SigV4 d'AWS).
- Garder les colonnes D1 respecte la règle « migrations additives » (pas de reconstruction de table).

## Conséquences

- (+) Même architecture, même UX, même réconciliateur ; bascule transparente côté utilisateur.
- (+) Auth plus simple (Bearer) ; cascade de suppression via `deleteOption: Delete`.
- (−) **Limites Students** : ~3 VM concurrentes, 6 vCPU, pas de B/F-series, catalogue mini 2 vCPU.
- (−) **Cron via GitHub Actions** : cadence 5 min (vs 2 min natif) et latence possible.
- (−) Le **durcissement/outils Windows** passe par une **extension CustomScript** appliquée à
  l'activation (le customData Windows n'est pas auto-exécuté), au lieu du UserData EC2Launch.
- (−) Le service-principal a les droits **ARM** mais pas **Graph** → la redirect URI Entra se configure
  à la main.

## Alternatives écartées

- **Réécrire le réconciliateur** pour Azure : inutile, casserait la cohérence (ADR 0004).
- **Cron natif Cloudflare** : impossible sans Workers Paid (limite 5/5 du compte).
- **Durable Object alarm** (self-cron sans quota) : plus de code ; gardé comme option future si la
  GitHub Action s'avère trop peu réactive.
- **Changer de région** pour débloquer les SKU : inutile — les blocages sont au niveau abonnement
  (toutes régions) ; seule la famille de SKU compte.
