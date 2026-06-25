<div align="center">

# 🖥️ GIT VM Portal — Azure

**Plateforme self-service de provisioning de machines virtuelles**
SSO Microsoft → demande → validation → VM **Azure** automatique → arrêt à l'échéance.
Le tout sur **Cloudflare Workers**.

**Prod** : <https://git-vm-portal-azure.thomas-prudhomme.workers.dev>
&nbsp;·&nbsp; **Repo** : <https://github.com/Thomas-TP/GIT-VM-Azure>

</div>

> 🔁 **Variante Azure** du portail (le projet original cible AWS EC2). Même architecture, même
> base de code, même UX — seule la couche compute change : **Azure Resource Manager** au lieu d'EC2.
> Voir [`AGENTS.md`](AGENTS.md) pour les détails et les spécificités Azure.

---

## ✨ Fonctionnalités

- 🔐 **SSO Microsoft Entra ID** (OIDC authorization-code, in-Worker, aucun mot de passe stocké).
- 🖥️ **Demande de VM en libre-service** depuis un catalogue **performance × stockage × OS** ;
  **1 à 4 VM** d'un coup, chacune **nommée** et configurée ; >1 VM ⇒ **groupe** (piloté ensemble).
- 🐧 **5 systèmes** : Ubuntu 24.04, Debian 12, **Azure Linux 3**, **Windows Server 2022** et
  **Windows poste de travail** (bureau). Linux en SSH (clé), Windows en RDP (mot de passe).
- 👥 **3 rôles** : membre · **formateur** (page « Demande groupée » : 1–30 VM attribuées à des
  utilisateurs) · admin.
- ✅ **Workflow de validation** (admin approuve/refuse, à la VM ou au groupe) + **notifications**.
- ⚙️ **Provisioning Azure automatique** et idempotent via un **réconciliateur** (cycle de vie complet).
- 🔑 **Accès sécurisé par VM** : clé SSH **chiffrée AES-GCM** (Linux) ou **mot de passe RDP** chiffré
  (Windows) — propriétaire uniquement. Guides intégrés (MobaXterm, Termius, Bureau à distance).
- 💾 **Snapshots de disque managé** : créer / supprimer, **snapshot auto avant suppression**,
  **restaurer** une VM depuis un snapshot à la création.
- ⏱️ **Cycle de vie** : dates obligatoires, **suppression auto à l'échéance**, **arrêt sur
  inactivité** (CPU Azure Monitor), extinction nocturne, **planification** start/stop par VM.
- 🛡️ **Durcissement sécurité** : DNS filtré (Cloudflare for Families), blocage P2P/torrent, hostname
  verrouillé, **+ egress du NSG verrouillé** (filtrage réseau non contournable, `azure-harden-nsg.mjs`).
- 📊 **Console admin unifiée** (demandes + machines), **coûts réels** (Azure Cost Management), export
  CSV, **audit**.
- 🌗 Thème clair/sombre · 🌐 FR/EN.

## 🧱 Stack

| Couche | Techno |
|---|---|
| Frontend | React 19 · Vite · TypeScript · Tailwind v4 · TanStack Query · react-i18next |
| Backend | Cloudflare Worker (**Hono**) — API JSON + réconciliateur |
| Base de données | Cloudflare **D1** (SQLite) |
| Hébergement | Cloudflare Workers Static Assets (SPA) + Worker (API) |
| Auth | Microsoft **Entra ID** (OIDC) |
| Compute | **Azure Virtual Machines** (ARM REST, `switzerlandnorth`), auth service-principal |
| Email | EmailJS (REST) · Erreurs : Sentry (optionnel) |

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances (worker + SPA)
npm install && npm --prefix web install

# 2. Migrer la base locale
npx wrangler d1 migrations apply git_vm_portal_azure --local

# 3. Lancer le worker (API) et la SPA
npx wrangler dev                 # → http://localhost:8787  (API)
npm --prefix web run dev         # → http://localhost:5173  (SPA, proxy /api → :8787)
```

> Les secrets locaux se mettent dans un fichier `.dev.vars` (non commité). Voir
> [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## 🗺️ Architecture en bref

```
Navigateur ──HTTPS──> Cloudflare Worker (Hono)
   │  React SPA            │  OIDC Entra ID · API JSON · réconciliateur
   │  (static assets)      ├──> D1 (SQLite)  = état désiré
   │                       ├──> Azure Resource Manager (Bearer SP) = provisioning réel
   │                       └──> EmailJS = notifications
   └─ Le réconciliateur réconcilie en continu l'état réel Azure avec la DB (provisioning→active,
      drift, expiry). Piloté par GitHub Actions (POST /api/internal/cron) — voir AGENTS.md §cron.
```

## 📁 Structure

```
src/            Worker Cloudflare (API, OIDC, azure.ts, email, D1, réconciliateur)
migrations/     Migrations de schéma D1
web/            SPA React (build → web/dist, servie en static assets)
scripts/        Helpers Azure one-off (azure-setup, azure-harden-nsg, azure-images)
.github/        Workflow GitHub Actions qui pilote le réconciliateur (cron.yml)
docs/           Architecture, déploiement, configuration, ADR
wrangler.jsonc  Config Worker + bindings
AGENTS.md       Guide d'entrée pour agents IA & nouveaux devs
```

## 🚢 Déploiement

Déploiement **automatique via Cloudflare Workers Builds** : un push/merge sur **`main`** déclenche
build + migrations D1 + déploiement. Voir [`AGENTS.md`](AGENTS.md) §12.

## 🔐 Secrets

Config publique dans `wrangler.jsonc` (`vars`). Secrets via `wrangler secret put` (jamais commités) :
`SESSION_SECRET`, `ENTRA_CLIENT_SECRET`, `AZURE_CLIENT_SECRET`, `EMAILJS_PRIVATE_KEY`, `CRON_SECRET`.

## 📄 Licence

Projet éducatif interne — tous droits réservés.
</content>
