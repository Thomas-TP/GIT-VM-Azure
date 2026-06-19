# ADR 0003 — Outils du cours via Ansible + cloud-init (`ansible-pull`)

**Statut** : Acté (2026-06-19)

## Contexte

Must M7 : « installation des outils du cours via **Ansible** ». Le Worker ne peut pas exécuter
`ansible-playbook` (pas de runtime serveur). Il faut néanmoins de l'Ansible **réel** dans le repo
et démontrable de bout en bout.

## Décision

- Créer un dossier `ansible/` : un **rôle commun** (mises à jour, utilisateur, durcissement de
  base, fail2ban) + **un rôle par cours** (`linux-admin`, `dev-web`, `data-science`).
- À la création de l'instance, le Worker injecte un **`user-data` cloud-init** qui :
  1. installe Ansible,
  2. exécute `ansible-pull` sur le **repo Git** en ciblant le playbook du template choisi.
- L'instance se configure ainsi **toute seule** au premier boot.

## Justification

- **Ansible authentique**, versionné dans le repo, exécuté sur la VM → coche M7 et le scénario de
  démo (« outils installés »).
- **Aucun serveur de contrôle Ansible** à administrer → cohérent avec l'archi serverless (ADR 0001).
- `ansible-pull` = modèle *pull* idempotent, rejouable, idéal pour des VM éphémères.

## Conséquences

- (+) Démo : on montre une VM qui arrive avec les outils du cours déjà là.
- (+) Ajouter un cours = ajouter un rôle Ansible (extensible, documenté dans le runbook).
- (−) Le temps de configuration s'ajoute au boot (1ʳᵉ disponibilité un peu plus longue) →
  mitigation : afficher l'état « configuration en cours » ; bonus = images dorées (Packer) plus tard.
- (−) Le repo doit être accessible par la VM (repo public, ou archive signée passée en user-data).

## Alternatives écartées

- **Script bash en user-data** : plus simple mais ne satisfait pas l'exigence « via Ansible ».
- **Serveur Ansible (push)** : serveur à gérer + accès SSH entrant → contre l'archi serverless.
- **Images Packer pré-cuites** : excellent (boot rapide) mais plus long à mettre en place →
  noté en bonus/évolution.
