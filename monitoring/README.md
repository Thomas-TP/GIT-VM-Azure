# Monitoring (Grafana local)

Dashboard Grafana qui lit les métriques du portail via des endpoints JSON **token-gated**
(`/api/monitoring/*`) avec la datasource **Infinity**. Grafana tourne **en local** (Docker).

## 1. Définir le token côté portail

```bash
# Génère un token fort et déclare-le comme secret Cloudflare
npx wrangler secret put GRAFANA_TOKEN
```

Tant que `GRAFANA_TOKEN` n'est pas défini, les endpoints renvoient `503 not_configured`.

## 2. Lancer Grafana

```bash
cd monitoring
cp .env.example .env       # renseigne GRAFANA_TOKEN (identique au secret) et PORTAL_URL
docker compose up -d
```

Ouvre <http://localhost:3000> (admin / admin). Le dashboard **« GIT VM Portal »** est déjà
provisionné (datasource Infinity incluse, plugin installé au démarrage).

## 3. Renseigner le token dans le dashboard

En haut du dashboard, deux variables : **Portal URL** (pré-rempli) et **Token**. Colle la valeur de
`GRAFANA_TOKEN` dans **Token** → les panneaux se chargent.

## Endpoints exposés (JSON)

| URL | Contenu |
|---|---|
| `/api/monitoring/summary` | `[{status, count}]` |
| `/api/monitoring/daily`   | `[{day, count}]` (30 derniers jours) |
| `/api/monitoring/os`      | `[{os, count}]` |
| `/api/monitoring/users`   | `[{user_email, count}]` |
| `/api/monitoring/cost`    | `[{activeVms, monthlyUsd}]` |

Auth : `Authorization: Bearer <GRAFANA_TOKEN>` **ou** `?token=<GRAFANA_TOKEN>`.

## Notes

- Le dashboard n'est **pas** embarqué dans le portail en prod : Grafana local (`http://localhost`)
  ne peut pas être affiché dans une page HTTPS (mixed content + CSP `frame-ancestors`). L'onglet
  **Monitoring** de l'admin pointe vers `GRAFANA_URL` (variable, optionnelle) et rappelle ces étapes.
- Pour le dev local du portail : `PORTAL_URL=http://localhost:8787` (déjà autorisé dans la datasource).
