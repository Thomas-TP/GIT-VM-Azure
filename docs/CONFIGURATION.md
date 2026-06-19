# Configuration & secrets — GIT VM Portal

> Toutes les variables, les secrets, les permissions et les procédures de **publication / rotation
> des credentials**. Référence transverse de sécurité — voir [ADR 0006](adr/0006-gestion-des-secrets.md).
> Dernière mise à jour : 2026-06-19.

---

## 1. Principe

- **Config publique** (non sensible) → `wrangler.jsonc` → `vars`. Commitée.
- **Secrets** (sensibles) → **Cloudflare Wrangler Secrets** (`wrangler secret put`). **Jamais commités.**
- **En local** → fichier `.dev.vars` (ignoré par Git) pour vars + secrets de dev.

> 🚫 **Aucun secret en clair dans le repo, les logs, les commits ou le chat.** Les scripts AWS lisent
> les creds depuis l'environnement, jamais en dur. Si on te transmet une clé, utilise-la en local et
> **fais-la roter ensuite**.

## 2. Variables publiques (`wrangler.jsonc` → `vars`)

| Variable | Exemple / valeur | Rôle |
|---|---|---|
| `ALLOWED_EMAIL_DOMAINS` | `satom.ch,git.swiss` | Domaines email autorisés à se connecter |
| `ADMIN_EMAILS` | `thomas.prudhomme@satom.ch,…` | Admins « bootstrap » (toujours admin) |
| `ENTRA_TENANT_ID` | `33a7a298-…` | Tenant Entra ID |
| `ENTRA_CLIENT_ID` | `0bfcdbd6-…` | App registration Entra |
| `AWS_REGION` | `eu-central-2` | Région EC2 (Zurich) |
| `AWS_SUBNET_ID` | `subnet-0247cdf4…` | Subnet des VM |
| `AWS_SECURITY_GROUP_ID` | `sg-0f842f10…` | Security group partagé (SSH 22, RDP 3389) |
| `AWS_AMI_ID` | `ami-0fd7f34c…` | AMI legacy par défaut (les OS du catalogue sont dans `src/presets.ts`) |
| `AWS_KEY_NAME` | *(vide)* | Réservé ; les clés sont créées par VM |
| `APP_URL` | `https://git-vm-portal.…workers.dev` | URL publique (redirects, emails) |
| `MAIL_ENABLED` | `true` | Active l'envoi EmailJS |
| `SCHEDULED_STOP` | `true` | Active l'extinction nocturne (cron 19 h UTC) |
| `SENTRY_DSN` | *(vide)* | DSN Sentry (optionnel) |
| `EMAILJS_PUBLIC_KEY` | `KlKcUV9e…` | Clé publique EmailJS |
| `EMAILJS_SERVICE_ID` | `service_aeuc86a` | Service EmailJS |
| `EMAILJS_TEMPLATE_ID` | `template_za3761l` | Template EmailJS |

## 3. Secrets (`wrangler secret put <NAME>`)

| Secret | Source | Rôle |
|---|---|---|
| `SESSION_SECRET` | aléatoire fort (≥ 32 octets) | Signe les JWT de session **ET** dérive la clé AES-GCM de chiffrement |
| `ENTRA_CLIENT_SECRET` | Entra → Certificates & secrets | Échange du code OIDC contre l'id_token |
| `AWS_ACCESS_KEY_ID` | IAM user dédié | Auth API EC2 |
| `AWS_SECRET_ACCESS_KEY` | IAM user dédié | Auth API EC2 |
| `EMAILJS_PRIVATE_KEY` | EmailJS → Account → API Keys | Auth serveur EmailJS |

```bash
# Définir / mettre à jour un secret (prod)
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ENTRA_CLIENT_SECRET
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
npx wrangler secret put EMAILJS_PRIVATE_KEY

# Lister les secrets définis (noms uniquement)
npx wrangler secret list
```

> ⚠️ `SESSION_SECRET` est **double usage** : sa rotation invalide toutes les sessions **et** rend
> illisibles les clés SSH / mots de passe Windows déjà stockés (re-télécharger / re-provisionner après).

## 4. Développement local (`.dev.vars`)

Fichier `.dev.vars` à la racine (déjà dans `.gitignore`) :

```ini
SESSION_SECRET="dev-only-change-me-0123456789abcdef"
ENTRA_CLIENT_SECRET="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
EMAILJS_PRIVATE_KEY="..."
```

`wrangler dev` charge `.dev.vars` automatiquement. Pour les scripts `scripts/*.mjs`, exporter les
variables AWS dans le shell (PowerShell) :

```powershell
$env:AWS_ACCESS_KEY_ID='...'; $env:AWS_SECRET_ACCESS_KEY='...'
$env:AWS_REGION='eu-central-2'; $env:AWS_SECURITY_GROUP_ID='sg-0f842f10ca3c7b2d1'
node scripts/aws-amis.mjs
```

## 5. AWS IAM

**Compte** : `437659978697` · **Région** : `eu-central-2`.

### 5.1 Permissions du Worker (runtime)

Politique minimale pour le user IAM dont les clés sont dans les secrets Cloudflare :

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:RunInstances",
      "ec2:DescribeInstances",
      "ec2:DescribeImages",
      "ec2:TerminateInstances",
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:RebootInstances",
      "ec2:CreateKeyPair",
      "ec2:DeleteKeyPair",
      "ec2:CreateTags"
    ],
    "Resource": "*"
  }]
}
```

### 5.2 Permissions des scripts d'admin (one-off)

`scripts/aws-amis.mjs` et `scripts/aws-open-rdp.mjs` nécessitent en plus :

```json
{ "Effect": "Allow",
  "Action": ["ec2:DescribeSecurityGroups", "ec2:AuthorizeSecurityGroupIngress"],
  "Resource": "*" }
```

> Bonne pratique : un IAM user **distinct** pour ces scripts (creds locaux, jamais dans Cloudflare),
> séparé du user runtime du Worker.

## 6. Microsoft Entra ID

App registration (Azure Portal → Entra ID → App registrations) :

1. **Redirect URI** (type *Web*) : `https://<APP_URL>/auth/callback`
   (prod : `https://git-vm-portal.thomas-prudhomme.workers.dev/auth/callback`).
2. **Client ID** → `ENTRA_CLIENT_ID` (var). **Tenant ID** → `ENTRA_TENANT_ID` (var).
3. **Client secret** (Certificates & secrets) → `ENTRA_CLIENT_SECRET` (secret).
4. **Permissions** : `openid`, `profile`, `email` (scopes OIDC standard).
5. Les utilisateurs doivent appartenir à un domaine de `ALLOWED_EMAIL_DOMAINS`.

> 90 % des pannes de login viennent d'ici (redirect URI / secret / domaine), pas du code.
> Checklist : [`analyse/04-diagnostic-login.md`](analyse/04-diagnostic-login.md).

## 7. EmailJS

Service transactionnel (REST, côté serveur). Template à 4 variables : `to_email`, `subject`,
`title`, `message` (texte avec `white-space: pre-line`). IDs publics dans `vars`, clé privée en secret.
Mettre `MAIL_ENABLED=false` pour désactiver proprement (les envois sont alors loggés `mail.skipped`).

## 8. Rotation des credentials

| Credential | Procédure |
|---|---|
| **Clé AWS** | IAM → créer une nouvelle paire → `wrangler secret put AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` → re-déployer → **supprimer** l'ancienne clé. |
| **Secret Entra** | Entra → nouveau secret → `wrangler secret put ENTRA_CLIENT_SECRET` → re-déployer → supprimer l'ancien. |
| **EmailJS** | Régénérer la clé privée → `wrangler secret put EMAILJS_PRIVATE_KEY`. |
| **`SESSION_SECRET`** | Générer une nouvelle valeur → `wrangler secret put` → **déconnecte tout le monde** et rend les clés/mots de passe stockés illisibles (à re-télécharger / re-provisionner). À éviter sauf compromission. |

> 🔁 **Après toute fuite** (clé partagée en clair, commit accidentel) : **révoquer immédiatement**,
> roter, puis purger l'historique Git si nécessaire (`git filter-repo`).

## 9. Checklist « nouveau credential publié »

- [ ] La valeur n'apparaît **dans aucun fichier commité** (`git grep` la valeur → rien).
- [ ] Variable publique → `wrangler.jsonc` `vars` ; sensible → `wrangler secret put`.
- [ ] `.dev.vars` à jour pour le dev local (et bien ignoré par Git).
- [ ] Re-déploiement effectué (merge `main`) et vérifié (`/api/presets`, `/healthz`).
- [ ] Ancienne valeur révoquée si rotation.
