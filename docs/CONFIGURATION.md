# Configuration & secrets — GIT VM Portal (Azure)

> Toutes les variables, les secrets, les permissions et les procédures de **publication / rotation
> des credentials**. Référence transverse de sécurité — voir [ADR 0006](adr/0006-gestion-des-secrets.md)
> et [ADR 0010](adr/0010-migration-azure.md). Dernière mise à jour : 2026-06-25.

---

## 1. Principe

- **Config publique** (non sensible) → `wrangler.jsonc` → `vars`. Commitée.
- **Secrets** (sensibles) → **Cloudflare Wrangler Secrets** (`wrangler secret put`). **Jamais commités.**
- **En local** → fichier `.dev.vars` (ignoré par Git) pour vars + secrets de dev.

> 🚫 **Aucun secret en clair dans le repo, les logs, les commits ou le chat.** Les scripts Azure lisent
> les creds depuis l'environnement, jamais en dur. Si on te transmet un secret, utilise-le en local et
> **fais-le roter ensuite**.

## 2. Variables publiques (`wrangler.jsonc` → `vars`)

| Variable | Exemple / valeur | Rôle |
|---|---|---|
| `ALLOWED_EMAIL_DOMAINS` | `satom.ch,git.swiss` | Domaines email autorisés à se connecter |
| `ADMIN_EMAILS` | `thomas.prudhomme@satom.ch,…` | Admins « bootstrap » (toujours admin) |
| `ENTRA_TENANT_ID` | `33a7a298-…` | Tenant Entra ID (login SSO) |
| `ENTRA_CLIENT_ID` | `09d86c63-…` | App registration Entra « GIT-VM-Azure » (login) |
| `AZURE_TENANT_ID` | `33a7a298-…` | Tenant du service-principal compute |
| `AZURE_CLIENT_ID` | `50f50b56-…` | App ID du service-principal (« Claude ») |
| `AZURE_SUBSCRIPTION_ID` | `2ffd87ba-…` | Abonnement Azure cible |
| `AZURE_LOCATION` | `switzerlandnorth` | Région des VM |
| `AZURE_RESOURCE_GROUP` | `git-vm-portal` | Resource group partagé des VM |
| `AZURE_SUBNET_ID` | `/subscriptions/…/subnets/default` | **Resource id complet** du subnet partagé |
| `AZURE_NSG_ID` | `/subscriptions/…/networkSecurityGroups/git-vm-portal-nsg` | **Resource id complet** du NSG (SSH 22, RDP 3389) |
| `APP_URL` | `https://git-vm-portal-azure.…workers.dev` | URL publique (redirects, callbacks cours) |
| `GRAFANA_URL` | *(vide)* | Lien Grafana affiché dans l'onglet Monitoring (admin) |
| `MAIL_ENABLED` | `true` | Active l'envoi EmailJS |
| `SCHEDULED_STOP` | `true` | Active l'extinction nocturne (19 h, via le pilote cron) |
| `IDLE_STOP` / `IDLE_STOP_HOURS` | `true` / `3` | Arrêt sur inactivité (CPU Azure Monitor) |
| `HARDENING` | `true` | Durcissement in-VM (DNS filtré, blocage P2P, hostname) |
| `SENTRY_DSN` | *(vide)* | DSN Sentry (optionnel) |
| `EMAILJS_PUBLIC_KEY` | `KIKcUV9e…` | Clé publique EmailJS |
| `EMAILJS_SERVICE_ID` | `service_aeuc86a` | Service EmailJS |
| `EMAILJS_TEMPLATE_ID` | `template_za3761l` | Template EmailJS |

## 3. Secrets (`wrangler secret put <NAME>`)

| Secret | Source | Rôle |
|---|---|---|
| `SESSION_SECRET` | aléatoire fort (≥ 32 octets) | Signe les JWT de session **ET** dérive la clé AES-GCM de chiffrement |
| `ENTRA_CLIENT_SECRET` | Entra → app GIT-VM-Azure → Certificates & secrets | Échange du code OIDC contre l'id_token |
| `AZURE_CLIENT_SECRET` | App reg. du service-principal → Certificates & secrets | Auth ARM (client-credentials → Bearer) |
| `EMAILJS_PRIVATE_KEY` | EmailJS → Account → API Keys | Auth serveur EmailJS |
| `CRON_SECRET` | aléatoire fort | Bearer du pilote externe `POST /api/internal/cron` (cf. [DEPLOYMENT.md](DEPLOYMENT.md) §9) |
| `GRAFANA_TOKEN` | aléatoire fort (optionnel) | Bearer des endpoints `/api/monitoring/*`. Non défini → endpoints `503`. |

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ENTRA_CLIENT_SECRET
npx wrangler secret put AZURE_CLIENT_SECRET
npx wrangler secret put EMAILJS_PRIVATE_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret list      # noms uniquement
```

> ⚠️ `SESSION_SECRET` est **double usage** : sa rotation invalide toutes les sessions **et** rend
> illisibles les clés SSH / mots de passe Windows déjà stockés (re-télécharger / re-provisionner après).

## 4. Développement local (`.dev.vars`)

Fichier `.dev.vars` à la racine (déjà dans `.gitignore`) :

```ini
SESSION_SECRET="dev-only-change-me-0123456789abcdef"
ENTRA_CLIENT_SECRET="..."
AZURE_CLIENT_SECRET="..."
EMAILJS_PRIVATE_KEY="..."
CRON_SECRET="dev-cron"
```

`wrangler dev` charge `.dev.vars` automatiquement. Pour les scripts `scripts/azure-*.mjs`, exporter les
variables Azure dans le shell (PowerShell) :

```powershell
$env:AZURE_TENANT_ID='33a7a298-…'; $env:AZURE_CLIENT_ID='50f50b56-…'
$env:AZURE_CLIENT_SECRET='…'; $env:AZURE_SUBSCRIPTION_ID='2ffd87ba-…'
$env:AZURE_LOCATION='switzerlandnorth'; $env:AZURE_RESOURCE_GROUP='git-vm-portal'
node scripts/azure-images.mjs
```

## 5. Azure — service principal & RBAC

**Abonnement** : `2ffd87ba-…` (« Azure for Students ») · **Région** : `switzerlandnorth`.

### 5.1 Identité & droits du Worker (runtime)

Le Worker s'authentifie en **OAuth2 client-credentials** (service principal « Claude ») et obtient un
token Bearer pour `https://management.azure.com`. Le SP doit avoir le rôle **Contributor** (ou Owner)
sur l'abonnement (ou a minima sur le resource group `git-vm-portal`). Providers à enregistrer une fois
(fait par `scripts/azure-setup.mjs`) : `Microsoft.Compute`, `Microsoft.Network`, `microsoft.insights`
(métriques), `Microsoft.CostManagement` (dashboard coûts).

> ⚠️ **Graph ≠ ARM** : être Owner sur l'abonnement ne donne **pas** le droit de modifier une app
> registration Entra (redirect URI…). Cela nécessite une permission **Microsoft Graph**
> (`Application.ReadWrite`), à accorder séparément — sinon la config Entra se fait à la main au portail.

### 5.2 Contraintes « Azure for Students » (importantes)

- **SKU bloqués** (`NotAvailableForSubscription`, toutes régions) : B-series, F-series, 1 vCPU. Le
  catalogue (`src/presets.ts`) n'utilise donc que **Dsv3 / Dasv4 / Esv3** (≥ 2 vCPU).
- **Quota 6 vCPU** au total par région. **Max 3 IP publiques** par région → **3 VM concurrentes**.
- `launchInstance` supprime l'IP+NIC si la création de VM échoue (anti-fuite du quota d'IP).

## 6. Microsoft Entra ID (login SSO)

App registration « GIT-VM-Azure » (Azure Portal → Entra ID → App registrations) :

1. **Redirect URI** (type *Web*) : `https://<APP_URL>/auth/callback`
   (prod : `https://git-vm-portal-azure.thomas-prudhomme.workers.dev/auth/callback`).
2. **Client ID** → `ENTRA_CLIENT_ID` (var). **Tenant ID** → `ENTRA_TENANT_ID` (var).
3. **Client secret** (Certificates & secrets) → `ENTRA_CLIENT_SECRET` (secret).
4. **Permissions** : `openid`, `profile`, `email` (scopes OIDC standard).
5. Les utilisateurs doivent appartenir à un domaine de `ALLOWED_EMAIL_DOMAINS`.

> 90 % des pannes de login viennent d'ici (redirect URI / secret / domaine), pas du code.

## 7. EmailJS

Service transactionnel (REST, côté serveur). Template à 4 variables : `to_email`, `subject`,
`title`, `message`. IDs publics dans `vars`, clé privée en secret. `MAIL_ENABLED=false` désactive
proprement (envois loggés `mail.skipped`).

## 8. Rotation des credentials

| Credential | Procédure |
|---|---|
| **Secret SP Azure** | App reg. → nouveau secret → `wrangler secret put AZURE_CLIENT_SECRET` → re-déployer → supprimer l'ancien. |
| **Secret Entra** | Entra → nouveau secret → `wrangler secret put ENTRA_CLIENT_SECRET` → re-déployer → supprimer l'ancien. |
| **EmailJS** | Régénérer la clé privée → `wrangler secret put EMAILJS_PRIVATE_KEY`. |
| **`CRON_SECRET`** | Nouvelle valeur → `wrangler secret put CRON_SECRET` **ET** secret GitHub `CRON_SECRET` (les deux doivent coïncider). |
| **`SESSION_SECRET`** | Nouvelle valeur → `wrangler secret put` → **déconnecte tout le monde** et rend les clés/mots de passe stockés illisibles. À éviter sauf compromission. |

> 🔁 **Après toute fuite** : **révoquer immédiatement**, roter, puis purger l'historique Git si besoin.

## 9. Checklist « nouveau credential publié »

- [ ] La valeur n'apparaît **dans aucun fichier commité** (`git grep` la valeur → rien).
- [ ] Variable publique → `wrangler.jsonc` `vars` ; sensible → `wrangler secret put`.
- [ ] `.dev.vars` à jour pour le dev local (et bien ignoré par Git).
- [ ] Re-déploiement effectué et vérifié (`/api/presets`, `/healthz`).
- [ ] Ancienne valeur révoquée si rotation.
