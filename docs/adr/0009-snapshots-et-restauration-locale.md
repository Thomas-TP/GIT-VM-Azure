# ADR 0009 — Snapshots EBS et restauration locale (vs export OVA)

**Statut** : Acté (2026-06-22) · complète [ADR 0008](0008-suppression-auto-a-l-echeance.md)
(qui renvoyait le sujet « snapshot avant suppression » à un futur ADR).

## Contexte

[ADR 0008](0008-suppression-auto-a-l-echeance.md) supprime les VM à l'échéance (action
irréversible) et listait le « snapshot avant suppression » comme évolution possible. Le client a
ensuite demandé : (1) pouvoir **sauvegarder** une VM, (2) la **restaurer** à la création, et (3)
pouvoir récupérer la VM **sur VMware/VirtualBox en local** (format OVA évoqué).

## Décision

**Sauvegarde = snapshot EBS** (`CreateSnapshot` du volume racine), pas d'export OVA.

- Bouton **« Créer un snapshot »** sur la page VM + case **« snapshot auto avant suppression /
  expiration »** (`vm_requests.snapshot_on_delete`). Le réconciliateur déclenche le snapshot avant
  `terminate` (suppression manuelle **et** `enforceExpiry`) et synchronise l'état (`*/2 min`).
- **Restauration à la création** : on choisit un snapshot terminé ; la VM démarre depuis une **AMI
  enregistrée** à partir du snapshot (`RegisterImage`, même disque/OS). cloud-init ré-injecte la clé
  SSH au nouveau boot.
- **Récupération locale (VMware/VirtualBox)** : **pas d'export OVA**. Le portail affiche une recette
  copiable par snapshot : **`coldsnap download`** (EBS Direct APIs) → image brute →
  **`qemu-img convert`** en `.vdi` / `.vmdk`.

## Justification

- **L'export OVA AWS (`CreateInstanceExportTask`) est inapplicable ici.** D'après la doc AWS, VM
  Export **ne peut pas exporter** une instance contenant du logiciel tiers fourni par AWS :
  **Windows** et **toute instance issue d'une AMI AWS Marketplace / Amazon** sont refusées
  (`NotExportable`), en plus des limites « un seul volume / une seule ENI / pas de chiffrement ».
  Le catalogue propose Windows et Amazon Linux → l'OVA échouerait sur une partie des VM.
- **coldsnap + qemu-img est universel** : fonctionne pour **tous** les OS (y compris Windows et
  Amazon Linux), à partir du snapshot EBS qu'on crée déjà — **aucune infra** (pas de bucket S3, pas
  de rôle `vmimport`, pas de tâche d'export asynchrone).
- Le téléchargement se fait **en local** avec les identifiants AWS du client (le Worker ne manipule
  pas des Go de données ; il fournit seulement la commande prête à l'emploi).

## Conséquences

- (+) Sauvegarde / restauration couvrant tout le catalogue, sans surface AWS supplémentaire.
- (+) Récupération locale fiable et documentée, indépendante des restrictions OVA.
- (−) La récupération locale n'est **pas** un bouton « télécharger » : elle demande à l'opérateur
  d'exécuter `coldsnap` + `qemu-img` localement (prérequis : binaire coldsnap, `qemu-img`, droits
  `ebs:ListSnapshotBlocks` / `ebs:GetSnapshotBlock`).
- (−) Coût stockage des snapshots EBS (faible, $/Go-mois) — à surveiller via l'alerte budget $50.

## Alternatives écartées

- **Export OVA via `CreateInstanceExportTask` + S3** : refusé par AWS pour Windows / images Amazon,
  fragile (mono-volume), et lourd (bucket S3 + rôle `vmimport` + polling asynchrone). Écarté.
- **Service de conversion côté Worker** : transférer des Go de disque via un Worker est inadapté
  (limites CPU/mémoire/temps) ; la conversion locale est plus simple et gratuite.
