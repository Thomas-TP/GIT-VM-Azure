# Documentation — GIT VM Portal

Point d'entrée de la documentation projet. **Commence par [`../AGENTS.md`](../AGENTS.md)** (contexte
canonique IA + onboarding). Voir aussi [`../CLAUDE.md`](../CLAUDE.md) (redirige vers AGENTS.md) et
[`../.claude/MEMOIRE-PROJET.md`](../.claude/MEMOIRE-PROJET.md) (mémoire).

## 🧭 Par où commencer

| Je veux… | Document |
|---|---|
| Comprendre et travailler sur le projet | [`../AGENTS.md`](../AGENTS.md) |
| Voir l'architecture (flux, données, sécurité) | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Déployer / publier | [`DEPLOYMENT.md`](DEPLOYMENT.md) |
| Gérer variables, secrets, IAM, Entra | [`CONFIGURATION.md`](CONFIGURATION.md) |
| Contribuer (workflow, conventions) | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Comprendre l'état vs cahier des charges | [`analyse/01-etat-des-lieux.md`](analyse/01-etat-des-lieux.md) |
| Savoir quoi faire ensuite | [`roadmap/RECOMMANDATIONS-FINALES.md`](roadmap/RECOMMANDATIONS-FINALES.md) |

## 📁 Structure

```
AGENTS.md                     Contexte canonique IA + onboarding (point d'entrée)
CLAUDE.md                     Redirige vers AGENTS.md (échéances hackathon)
README.md                     Présentation du projet
CONTRIBUTING.md               Workflow, conventions, qualité
.claude/
  MEMOIRE-PROJET.md           Mémoire projet (faits durables)
  agents/                     Sous-agents spécialisés (infra-aws, portail-dev, doc-demo, revue-must)
docs/
  ARCHITECTURE.md             Architecture, flux, modèle de données, sécurité, API
  DEPLOYMENT.md               Pipeline CI/CD (Cloudflare Workers Builds), publication, rollback
  CONFIGURATION.md            Variables, secrets, IAM AWS, Entra, EmailJS, rotation
  analyse/                    Diagnostic & écarts
    01-etat-des-lieux.md
    02-couverture-moscow.md   Matrice MoSCoW vs cahier des charges
    03-ecarts-et-dette-technique.md
    04-diagnostic-login.md    Bug de connexion : cause & correctifs
  adr/                        Décisions d'architecture (livrable noté)
    0001 → 0007
  roadmap/
    ROADMAP-J19-J26.md        Plan jour par jour
    BACKLOG.md                Issues pour GitHub Projects
    RECOMMANDATIONS-FINALES.md
```

## 📋 Livrables attendus (cahier des charges) — état

| Livrable | Où | État |
|---|---|---|
| Dépôt Git + README « from zero » | [`../README.md`](../README.md) | ✅ |
| Document d'architecture + ADR | [`ARCHITECTURE.md`](ARCHITECTURE.md) + [`adr/`](adr/) | ✅ |
| Runbook de déploiement / exploitation | [`DEPLOYMENT.md`](DEPLOYMENT.md) + [`CONFIGURATION.md`](CONFIGURATION.md) | ✅ |
| Guide de contribution | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | ✅ |
| Guides utilisateur (3 rôles) | à créer | 🟡 |
| Backlog / gestion de projet | [`roadmap/BACKLOG.md`](roadmap/BACKLOG.md) → GitHub Projects | 🟡 |
| Support de présentation | à créer J7 | ❌ |
