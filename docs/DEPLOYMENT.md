# Déploiement — GIT VM Portal (Azure)

> Comment le projet est **construit, migré et publié**. Lis [`CONFIGURATION.md`](CONFIGURATION.md)
> pour les variables/secrets. Dernière mise à jour : 2026-06-25.

---

## 1. TL;DR — comment livrer

1. Travaille sur une **branche**, ouvre une **PR**, fais passer la CI (typecheck/lint/test/build).
2. **Merge sur `main`**.
3. **Cloudflare Workers Builds** prend le relais automatiquement : build → migrations D1 → déploiement.
4. Vérifie en live : `curl https://git-vm-portal-azure.thomas-prudhomme.workers.dev/api/presets`.

> ❌ **Ne lance pas `wrangler deploy` à la main** en fonctionnement normal : Cloudflare le fait.

## 2. Deux pipelines distincts (ne pas confondre)

| | GitHub Actions (`.github/workflows/ci.yml`) | Cloudflare Workers Builds |
|---|---|---|
| Déclencheur | push sur `main` + pull requests | push/merge sur `main` |
| Rôle | **Vérifier** : typecheck worker + SPA, lint, tests, build | **Construire + migrer + déployer** |
| Déploie ? | **Non** | **Oui** |

> Une **3ᵉ** GitHub Action (`.github/workflows/cron.yml`) ne build/déploie rien : elle **pilote le
> réconciliateur** en production (voir §9).

## 3. Configuration Cloudflare Workers Builds

Dashboard Cloudflare → Worker `git-vm-portal-azure` → **Settings → Build** :

- **Git repository** : `Thomas-TP/GIT-VM-Azure`, **production branch** `main`.
- **Build command** :
  ```
  npm install && npm --prefix web install && npm --prefix web run build
  ```
- **Deploy command** :
  ```
  npx wrangler d1 migrations apply git_vm_portal_azure --remote && npx wrangler deploy
  ```
- **Builds for non-production branches** : **Disabled** → une PR/branche **ne déploie rien**.

> 🔑 Le deploy command applique les **migrations D1 remote automatiquement, avant `wrangler deploy`**.
> Ajouter `migrations/NNNN_*.sql` + merger sur `main` suffit. Les secrets posés par `wrangler secret
> put` **persistent** entre les déploiements gérés — rien à re-saisir.

## 4. Ce que fait un déploiement

```
Merge main → Cloudflare Build → npm install x2 → build SPA (web/dist)
           → wrangler d1 migrations apply --remote → wrangler deploy (Worker + assets) → Prod
```

`wrangler deploy` lit `wrangler.jsonc` : binding D1, `vars` publiques, **assets** (`web/dist`, fallback
SPA), `run_worker_first` (les routes OIDC/API atteignent le Worker avant le fallback SPA).

## 5. Vérifier un déploiement

```bash
curl https://git-vm-portal-azure.thomas-prudhomme.workers.dev/healthz      # {"ok":true}
curl https://git-vm-portal-azure.thomas-prudhomme.workers.dev/api/presets  # catalogue Azure
npx wrangler tail git-vm-portal-azure --format pretty                      # logs live
```

## 6. Rollback

- **Option A (recommandée)** : `git revert <commit>` sur `main` → re-déploie la version précédente.
  Les migrations étant additives, un revert de code ne « dé-migre » pas.
- **Option B** : Cloudflare dashboard → Worker → **Deployments** → *Rollback*.

## 7. Déploiement manuel (secours / 1er déploiement)

Le **tout premier** déploiement se fait à la main (il crée le Worker) ; ensuite Workers Builds prend le
relais. Nécessite un `wrangler login` (ou `CLOUDFLARE_API_TOKEN`) avec droits Workers + D1.

```bash
npm --prefix web run build
npx wrangler d1 migrations apply git_vm_portal_azure --remote
npx wrangler deploy
```

## 8. Mise en place initiale (one-time)

Déjà fait pour cet environnement, documenté pour reproductibilité :

1. **Réseau Azure** : `node scripts/azure-setup.mjs` (creds Azure dans l'env) → crée le RG, le VNet +
   subnet et le NSG (entrée SSH 22 + RDP 3389), enregistre les providers, et **imprime** `AZURE_SUBNET_ID`
   + `AZURE_NSG_ID` à reporter dans `wrangler.jsonc`.
2. **Durcissement réseau** (après validation) : `node scripts/azure-harden-nsg.mjs` verrouille l'egress
   du NSG (default-deny + allowlist : 80/443, DNS Cloudflare uniquement, NTP, plateforme Azure).
3. **Images** : `node scripts/azure-images.mjs` vérifie les URN Marketplace de `src/presets.ts`.
4. **D1** : `wrangler d1 create git_vm_portal_azure` → reporter l'`database_id` dans `wrangler.jsonc` →
   `wrangler d1 migrations apply git_vm_portal_azure --remote`.
5. **Secrets** : `wrangler secret put <NAME>` pour chacun (voir [CONFIGURATION.md](CONFIGURATION.md) §3).
6. **Entra** : redirect URI = `https://<domaine>/auth/callback` sur l'app GIT-VM-Azure.
7. **Cloudflare Build** : connecter le repo, renseigner build/deploy commands (§3).
8. **Cron driver** : pousser `.github/workflows/cron.yml` + secret GitHub `CRON_SECRET` (= secret Worker).

## 9. Réconciliateur — pilote cron externe ⚠️

Le compte Cloudflare (plan **Free**) est plafonné à **5 cron triggers**, déjà tous pris par les autres
variantes (AWS / Huawei / OpenStack). **Il n'y a donc PAS de `triggers.crons`** dans `wrangler.jsonc`.

À la place, une **GitHub Action** (`.github/workflows/cron.yml`) appelle l'endpoint du Worker :

| Déclencheur GitHub Actions | Appel | Action |
|---|---|---|
| `*/5 * * * *` | `POST /api/internal/cron` (Bearer `CRON_SECRET`) | réconciliation + plannings + retries + échéances + idle-stop + snapshots |
| `0 19 * * *` | `POST /api/internal/cron?job=stop` | extinction nocturne (garde-fou coûts) |

Le handler `scheduled()` reste présent dans `src/index.ts` : si un jour le compte passe en **Workers
Paid**, il suffit de remettre `"triggers": { "crons": ["*/2 * * * *", "0 19 * * *"] }` dans
`wrangler.jsonc` pour repasser au cron natif (cadence 2 min) et désactiver la GitHub Action.

> Alternative plus réactive : un service cron externe (cron-job.org…) appelant le même endpoint toutes
> les 1–2 min (GitHub Actions a un minimum de 5 min et peut prendre du retard).

## 10. Domaine

Prod sur `*.workers.dev` : `https://git-vm-portal-azure.thomas-prudhomme.workers.dev` (= `APP_URL`).
Pour un domaine custom : ajouter une route/Custom Domain au Worker et mettre à jour `APP_URL` **et** la
redirect URI Entra.
