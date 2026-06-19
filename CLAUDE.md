# CLAUDE.md → voir [AGENTS.md](AGENTS.md)

> Pour **éviter la duplication**, le contexte projet canonique (stack, carte du code, modèle de
> données, réconciliateur, commandes, déploiement, secrets, garde-fous, pièges) vit dans un seul
> fichier : **[AGENTS.md](AGENTS.md)**.

## 👉 Lis [AGENTS.md](AGENTS.md) en premier.

Le reste de la documentation :
[README.md](README.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/CONFIGURATION.md](docs/CONFIGURATION.md) ·
[CONTRIBUTING.md](CONTRIBUTING.md) · [docs/adr/](docs/adr/) · [docs/analyse/](docs/analyse/) ·
[docs/roadmap/](docs/roadmap/).

---

## Spécifique au cadre hackathon (non couvert par AGENTS.md)

### Échéances (CRITIQUE)

| Date | Jalon |
|---|---|
| **Ven. 19 juin 2026** | Revue d'architecture obligatoire |
| **Ven. 26 juin 2026** | Démo **live** 10 min + remise des livrables |

Parcours de démo de bout en bout (doit fonctionner) :
`demande → validation → notification → provisioning → connexion (SSH/RDP) → suppression à l'échéance`.
**Plan B exigé** par le cahier des charges (vidéo + environnement de secours).

### Cadre

Hackathon **Satom IT & Learning Solutions × Geneva Institute of Technology (GIT)**, 11 → 26 juin 2026.
Binôme : Thomas P. & Abderahmane. Conditions entreprise réelle, client = GIT.

> ⚠️ Le plan initial **Infomaniak + OpenTofu + Ansible + FastAPI + PostgreSQL** (dossier hors repo)
> est **abandonné**. La stack réelle est AWS EC2 + Cloudflare Workers + D1 — voir [AGENTS.md](AGENTS.md).

### État des exigences (Must)

- ✅ Dates début/fin (calendrier) + **suppression automatique à l'échéance** (réconciliateur, ADR 0008).
- ✅ Catalogue OS élargi + **Windows / RDP** (ADR 0007).
- ✅ Refonte UI : pages **Mes VM** (`/`) et **Créer une VM** (`/new`) + guides de connexion.
- 🔴 Reste : **login** (config Entra — [diagnostic](docs/analyse/04-diagnostic-login.md)),
  **rôle formateur + demande groupée**, **Ansible** (outils de cours).
  Détail → [docs/roadmap/](docs/roadmap/) · [docs/analyse/](docs/analyse/).
