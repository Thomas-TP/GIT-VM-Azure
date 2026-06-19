# CLAUDE.md — Contexte projet GIT VM Portal

> Fichier de contexte pour l'IA (Claude Code) **et** pour l'équipe. Lis-le en premier
> avant toute intervention sur ce repo. Mis à jour le 2026-06-19.

---

## 1. En une phrase

Plateforme **self-service de provisioning de VM** pour le Geneva Institute of Technology (GIT) :
un étudiant/formateur se connecte en **SSO Microsoft (Entra ID)**, demande une VM depuis un
catalogue, un validateur approuve/refuse, la VM est **provisionnée automatiquement sur AWS EC2**
avec une **clé SSH unique**, et est **détruite à sa date de fin**.

Projet de **hackathon** (conditions entreprise réelle, client = GIT). Binôme : Thomas P. & Abderahmane.

## 2. Échéances (CRITIQUE)

| Date | Jalon | Statut |
|---|---|---|
| **Ven. 19 juin 2026** | Revue d'architecture obligatoire (≈ aujourd'hui) | 🔴 en cours |
| **Ven. 26 juin 2026** | Démo live 10 min + remise des livrables | 🔴 J-7 |

La démo du 26 est **live et obligatoire**. Le parcours de bout en bout doit fonctionner :
`demande → validation → notification → provisioning → outils installés → destruction programmée`.
**Un plan B (vidéo + env. de secours) est exigé par le cahier des charges.**

## 3. Stack réelle (≠ plan initial)

> ⚠️ Le dossier `Hackathon Digital Gamin Juin 2026` (hors repo) décrivait un plan
> **Infomaniak + OpenTofu + Ansible + FastAPI + PostgreSQL**. Ce plan **n'est PAS** celui
> implémenté. Le projet a pivoté vers la stack ci-dessous. Ne pas se référer à l'ancien plan
> pour les choix techniques actuels.

| Couche | Techno réelle |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + react-i18next |
| Backend | Cloudflare Worker (**Hono**) — API JSON + cron `scheduled` |
| Base de données | Cloudflare **D1** (SQLite) |
| Hébergement | Cloudflare Workers Static Assets (SPA) |
| Auth | Microsoft **Entra ID** (OIDC authorization code flow, in-Worker, sans librairie) |
| Compute | **AWS EC2** (`eu-central-2`, Zurich), signé avec `aws4fetch` (appels API directs) |
| Email | EmailJS (REST) |
| Erreurs | Sentry (optionnel) |

URL de prod : `https://git-vm-portal.thomas-prudhomme.workers.dev`
Repo GitHub : `https://github.com/Thomas-TP/GIT-VM`

## 4. Carte du code

```
src/
  index.ts      Worker Hono : routes OIDC (/auth/*), API (/api/*), cron scheduled()
  oidc.ts       Entra ID : authorizeUrl / exchangeCode / userFromIdToken
  crypto.ts     JWT maison (sign/verify HMAC), AES-GCM (chiffrement clés SSH), randomToken
  db.ts         Toutes les requêtes D1 (requests, vms, users, audit, metrics)
  aws.ts        Client EC2 minimal (RunInstances, Describe, Terminate, Start/Stop/Reboot…)
  presets.ts    Catalogue : PERF (instance types) × STORAGE (disque) × OS (AMI) + coûts
  email.ts      Notifications EmailJS (new request, approved, rejected, ready)
  sentry.ts     Report d'erreurs
  types.ts      Env (bindings + secrets) + types partagés
migrations/     D1 : 0001 init, 0002 ssh_keys, 0003 composed_presets, 0004 comments
web/src/
  App.tsx       Routeur + garde d'auth (query /api/me, sinon <Login/>)
  pages/        Login, Dashboard, Admin, RequestDetail
  components/    AppShell, RequestsTable, NewRequestDialog, UsersPanel, Comments…
  api.ts        Client HTTP typé vers le Worker
scripts/        Helpers AWS one-off (discover/setup/cleanup/e2e/amis)
wrangler.jsonc  Config Worker : bindings D1, vars publiques, crons
```

## 5. Modèle de données (D1, état actuel)

- `users(email PK, name, role[member|admin], created_at)`
- `vm_requests(id, user_email, purpose, preset, storage, os, region, status, admin_note, decided_by, created_at, decided_at)`
  - `status ∈ pending | approved | rejected | provisioning | active | failed | terminated`
- `vms(id, request_id, aws_instance_id, public_ip, state, ssh_key_name, ssh_private_key[chiffré], ssh_user, created_at, terminated_at)`
- `audit_log(id, actor, action, target, detail, created_at)`
- `comments` (migration 0004)

> 🔴 **Manque structurel** : pas de `start_date` / `end_date`, pas de `group_id` / `qty`,
> pas de rôle `trainer`. Voir `docs/analyse/` et `docs/roadmap/`.

## 6. Le pattern central : le réconciliateur

La **DB = état désiré**. Une cron (`*/2 * * * *`) **réconcilie** le réel AWS avec la DB :
- `provisioning → active` quand l'instance tourne avec une IP publique (+ email « prête »),
- détection de **drift** (instance supprimée hors portail → `terminated`),
- **retry** des provisioning échoués (max 3),
- cron `0 19 * * *` : **stop** des VM running (garde-fou coûts).

C'est un pattern **robuste et idempotent** : c'est le point fort de l'archi, à mettre en avant
en revue. Toute nouvelle automatisation de cycle de vie (auto-destroy, extinction nuit/WE,
notif d'échéance) doit **s'ajouter à ce réconciliateur**, pas créer un mécanisme parallèle.

## 7. Sécurité (état actuel — solide)

- **Clé SSH ed25519 unique par VM**, générée par AWS, **chiffrée AES-GCM au repos** (clé dérivée de `SESSION_SECRET`), téléchargeable uniquement par le propriétaire ou un admin. ✅ Dépasse l'exigence « pas de mot de passe root partagé ».
- Sessions = JWT HMAC signé maison, cookie `HttpOnly; Secure; SameSite=Lax`.
- `audit_log` sur toutes les actions sensibles.
- Secrets via `wrangler secret put` (jamais commités).
- ⚠️ Isolation réseau : **un seul** subnet + security group (pas d'isolation par classe).

## 8. Commandes

```bash
npm install && npm --prefix web install      # deps
npx wrangler dev                             # worker (API) :8787
npm --prefix web run dev                     # SPA hot-reload (proxy /api → :8787)
npm --prefix web run build                   # build SPA → web/dist
npx wrangler deploy                          # déploie worker + assets
npx wrangler d1 migrations apply git_vm_portal --remote   # migrations DB
npx wrangler tail git-vm-portal --format pretty           # logs live (debug)
npm test ; npm run typecheck ; npm run lint  # qualité
```

Secrets requis (`wrangler secret put <NAME>`) :
`SESSION_SECRET`, `ENTRA_CLIENT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EMAILJS_PRIVATE_KEY`.

## 9. Priorités actuelles (J-7) — voir `docs/roadmap/`

1. 🔴 **Débloquer le login** (config Entra/secret/domaine — le code worker est sain). Voir `docs/analyse/04-diagnostic-login.md`.
2. 🔴 **Dates début/fin obligatoires** + **destruction auto à `end_date`** (Must).
3. 🔴 **Rôle formateur + demande groupée de N machines** (Must).
4. 🔴 **Ansible** : installation des outils du cours (Must).
5. 🟠 Templates = cours, isolation par classe, monitoring ressources, dashboard coûts.

## 10. Règles de travail sur ce repo

- **Ne pas casser l'existant qui fonctionne.** Le socle AWS+Workers est déployé et marche : on
  **ajoute** et on **corrige**, on ne réécrit pas, on ne pivote pas.
- Toute évolution de cycle de vie passe par le **réconciliateur** (§6).
- **Documentation continue** : ADR pour chaque décision (`docs/adr/`), c'est un livrable noté.
- Garder un **plan B de démo** vivant en permanence (vidéo + env. de secours).
- Convention de code : suivre le style existant (TS strict, Hono, pas de dépendances lourdes).
- Langue de la doc : **français** (équipe + client francophones).
```