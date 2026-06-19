# 02 — Couverture des exigences (MoSCoW)

> Matrice de conformité au cahier des charges. Légende :
> ✅ couvert · 🟡 partiel · ❌ manquant · 🔴 = bloquant pour la *recevabilité*.
>
> Rappel évaluation : Démo fonctionnelle **30 %** · Architecture **20 %** ·
> Coûts/Sécurité/Monitoring **20 %** · Doc/Réutilisabilité **20 %** · Gestion projet/présentation **10 %**.

## MUST — le prototype n'est pas recevable sans

| # | Exigence | État | Détail | Effort restant |
|---|---|:--:|---|:--:|
| M1 | Portail + auth **O365 / OIDC Entra ID** | ✅ | Implémenté et correct. Login bloqué par **config** (voir diagnostic), pas par le code. | XS (config) |
| M2 | **Catalogue 3-4 templates = cours** | 🟡 | Catalogue technique (perf×stockage×OS) mais **pas orienté cours** (Linux Admin, Dev Web, Data Science) avec outils. | M |
| M3 | **Date début + fin obligatoire** — « aucune machine sans date de fin » | 🔴❌ | Aucune colonne `start_date`/`end_date`, ni dans le formulaire, ni dans l'API. | M |
| M4 | **Workflow validation + notif dans les 2 cas** | ✅ | approve/reject + emails EmailJS. | — |
| M5 | **Rôle formateur : demande groupée de N machines** | 🔴❌ | Pas de rôle `trainer`, pas de `group_id`/`qty`. Demandes unitaires seulement. | M |
| M6 | **Provisioning automatisé (IaC)** | 🟡 | Provisioning **automatique** ✅ mais via **API AWS directe**, pas Terraform/OpenTofu. À **justifier en ADR** (les évaluateurs valorisent les outils du marché). | S (ADR) à L (vraie IaC) |
| M7 | **Installation outils du cours via Ansible** | 🔴❌ | Aucun Ansible. VM nue depuis l'AMI. Exigé aussi dans le **scénario de démo**. | M |
| M8 | **Destruction automatique à la date de fin** | 🔴❌ | Seulement *stop* à 19h + terminate manuel. Dépend de M3. | S (réutilise le réconciliateur) |
| M9 | **Accès SSH par clés** (pas de root partagé) | ✅ | Clé unique/VM, chiffrée AES-GCM. Dépasse l'exigence. | — |
| M10 | **Isolation réseau de base entre classes** | 🟡 | Un seul subnet + SG. Pas de séparation par classe. | M |
| M11 | **Monitoring minimal** (up/down, ressources) | 🟡 | up/down + IP ✅ ; **ressources consommées** ❌. | M |

**Verdict Must** : 4 exigences **rouges** (M3, M5, M7, M8) + 1 à sécuriser (M6) = le **chemin critique** des 7 jours.

## SHOULD — attendu d'une bonne équipe

| # | Exigence | État | Détail |
|---|---|:--:|---|
| S1 | Dashboard **coûts par classe/cours** | 🟡 | Estimation de coût par VM existe ; pas d'agrégation par cours. |
| S2 | **Extinction nuit + week-end** | 🟡 | Stop quotidien 19h ✅ ; pas de logique week-end ni de redémarrage matinal. |
| S3 | **Notification avant échéance** | ❌ | Dépend de M3 (`end_date`). |
| S4 | **Monitoring complet** (Prometheus/Grafana) | ❌ | Absent. |
| S5 | **Gestion des secrets propre** (Vault…) | 🟡 | `wrangler secret` + AES-GCM au repos. Correct mais pas Vault — défendable en ADR. |

## COULD — bonus différenciants

| # | Exigence | État |
|---|---|:--:|
| C1 | Détection d'inactivité + récupération anticipée | ❌ |
| C2 | Demande de **prolongation** + re-validation | ❌ |
| C3 | Hardening avancé + scan de vulnérabilités (Trivy) | ❌ |
| C4 | Self-service de **réinitialisation** | 🟡 (reboot existe, pas reset) |

## Lecture stratégique

- Les **4 Must rouges** sont concentrés sur **2 axes** : *cycle de vie temporel* (M3+M8) et
  *parcours formateur + outils* (M5+M7). Bonne nouvelle : M8 réutilise le réconciliateur
  existant, et M7 (Ansible) peut être injecté via cloud-init **sans nouveau serveur**.
- M6 (IaC) est le seul vrai **dilemme** : voir `docs/adr/0002`. Recommandation = garder l'API
  directe pour le live (fiable) **et** fournir un module Terraform/OpenTofu documenté pour
  cocher l'exigence et la défendre en revue.
- Une fois les Must verts, les **Should** S1/S2/S3 sont peu coûteux (tout passe par le
  réconciliateur + `end_date`) et rapportent gros sur le critère « Coûts/Sécurité/Monitoring (20 %) ».
