# Documentation — GIT VM Portal

Point d'entrée de la documentation projet. Voir aussi [`../CLAUDE.md`](../CLAUDE.md) (contexte) et
[`../.claude/MEMOIRE-PROJET.md`](../.claude/MEMOIRE-PROJET.md) (mémoire).

## 🧭 Par où commencer
1. **Comprendre l'état** → [`analyse/01-etat-des-lieux.md`](analyse/01-etat-des-lieux.md)
2. **Voir les écarts** → [`analyse/02-couverture-moscow.md`](analyse/02-couverture-moscow.md)
3. **Savoir quoi faire** → [`roadmap/RECOMMANDATIONS-FINALES.md`](roadmap/RECOMMANDATIONS-FINALES.md)
4. **Planifier** → [`roadmap/ROADMAP-J19-J26.md`](roadmap/ROADMAP-J19-J26.md)

## 📁 Structure
```
CLAUDE.md                     Contexte projet (IA + équipe)
.claude/
  MEMOIRE-PROJET.md           Mémoire projet (faits durables)
  agents/                     Sous-agents spécialisés (infra-aws, portail-dev, doc-demo, revue-must)
docs/
  analyse/                    Diagnostic & gaps
    01-etat-des-lieux.md
    02-couverture-moscow.md   Matrice MoSCoW vs cahier des charges
    03-ecarts-et-dette-technique.md
    04-diagnostic-login.md    Bug de connexion : cause & correctifs
  adr/                        Décisions d'architecture (livrable noté)
    0001 → 0006
  roadmap/
    ROADMAP-J19-J26.md        Plan jour par jour
    BACKLOG.md                Issues pour GitHub Projects
    RECOMMANDATIONS-FINALES.md
```

## 📋 Livrables attendus (cahier des charges) — état
| Livrable | Où | État |
|---|---|---|
| Dépôt Git + README « from zero » | repo + à compléter J6 | 🟡 |
| Document d'architecture + ADR | `adr/` + `analyse/` | ✅ (à présenter) |
| Runbook d'exploitation | à créer J6 | ❌ |
| Guides utilisateur (3 rôles) | à créer J6 | ❌ |
| Backlog / gestion de projet | `roadmap/BACKLOG.md` → GitHub Projects | 🟡 |
| Support de présentation | à créer J7 | ❌ |
