# Backlog — à importer dans GitHub Projects

> Une ligne = une issue. Colonnes suggérées : `Backlog → To do → In progress → Review → Done`.
> Labels : `Must`/`Should`/`Could`, `prio:critical`, `infra`, `portail`, `doc`, `demo`.
> ⭐ = chemin critique de la démo.

## EPIC 1 — Déblocage & socle
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 1.1 ⭐ | Débloquer le login Entra | Must | `wrangler tail` → cause identifiée ; connexion réussie ; erreur de callback affichée dans l'UI |
| 1.2 | Repo relié à GitHub + board Projects créé | Must | `git remote` OK ; board peuplé depuis ce backlog |
| 1.3 | Migration `0005_lifecycle` (dates, group_id, qty, trainer) | Must | migration appliquée local+remote, types à jour |

## EPIC 2 — Cycle de vie temporel (Must M3 + M8)
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 2.1 ⭐ | Date de fin **obligatoire** au formulaire | Must | soumission refusée sans `end_date` ou si `end < start` |
| 2.2 ⭐ | Stockage + affichage des dates | Must | l'étudiant voit la date de fin de sa VM |
| 2.3 ⭐ | **Destruction auto** à `end_date` (réconciliateur) | Must | VM détruite < 2 min après l'échéance + email + statut `terminated` |
| 2.4 | Notif **avant échéance** (J-1) | Should | un email unique envoyé ~24h avant `end_date` |

## EPIC 3 — Formateur & catalogue (Must M5 + M2)
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 3.1 ⭐ | Rôle `trainer` | Must | accès à l'écran « demande groupée » conditionné au rôle |
| 3.2 ⭐ | Demande groupée de N machines | Must | 1 formulaire → N requests liées par `group_id` ; plafond N respecté |
| 3.3 | Vue admin groupée + approbation par lot | Must | les N s'affichent ensemble ; approuver/refuser le lot |
| 3.4 ⭐ | Templates = cours (Linux Admin / Dev Web / Data Science) | Must | catalogue par cours avec outils annoncés |

## EPIC 4 — Provisioning Ansible (Must M7) + IaC (M6)
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 4.1 ⭐ | Playbooks Ansible par cours + rôle commun | Must | `ansible/` avec rôle commun + 3 cours |
| 4.2 ⭐ | cloud-init `ansible-pull` injecté par le Worker | Must | VM arrive avec les **outils installés** |
| 4.3 | Module Terraform/OpenTofu de référence | Must | `infra/` reproduit la VM ; documenté (ADR 0002) |

## EPIC 5 — Coûts, sécurité, monitoring (critère 20 %)
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 5.1 | Monitoring ressources (CPU) | Must/Should | CPU visible par VM (CloudWatch ou node_exporter) |
| 5.2 | Dashboard coûts par cours/classe | Should | `Σ coût horaire × heures up` agrégé par `group_id` |
| 5.3 | Isolation réseau par classe (SG par group_id) | Should | VMs d'un cours isolées des autres |
| 5.4 | Extinction nuit + week-end | Should | stop hors heures + redémarrage matin ouvré |
| 5.5 | (bonus) Radar d'inactivité / prolongation / reset | Could | une de ces fonctions démontrable |

## EPIC 6 — Documentation & démo (critères 20 % + 30 % + 10 %)
| ID | Story | Prio | Critères d'acceptation |
|---|---|---|---|
| 6.1 ⭐ | README « from zero » + `.env.example` | Must | un externe redéploie avec la doc seule |
| 6.2 | Runbook d'exploitation | Must | pannes, ajout template, demande bloquée, rotation secret |
| 6.3 | Guides étudiant / formateur / validateur | Must | 1 guide par rôle |
| 6.4 ⭐ | Répétition démo < 10 min + **vidéo de secours** | Must | chrono OK + enregistrement prêt |
| 6.5 ⭐ | Slides de présentation finale | Must | 10 min, structurées |

## Astuce import (gh CLI)
```bash
gh issue create --title "2.1 Date de fin obligatoire" \
  --label "Must,portail" \
  --body "Critères : soumission refusée sans end_date ou si end < start."
```
