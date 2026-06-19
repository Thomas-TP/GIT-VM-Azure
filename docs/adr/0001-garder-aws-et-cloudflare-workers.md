# ADR 0001 — Garder AWS EC2 + Cloudflare Workers

**Statut** : Acté (2026-06-19) · **Décideurs** : binôme Groupe 3

## Contexte

Le cahier des charges attribue un compte **Infomaniak** et un plan initial prévoyait
OpenTofu + Ansible + FastAPI + PostgreSQL sur Infomaniak. Or l'équipe a déjà **construit et
déployé** une solution sur **AWS EC2 + Cloudflare Workers + D1**, fonctionnelle. Il reste **7 jours**
avant la démo.

## Décision

**Nous gardons la stack AWS + Cloudflare Workers** et nous comblons les écarts de façon
**additive**. Nous **ne pivotons pas** vers Infomaniak/OpenTofu/FastAPI.

## Justification

- Un socle **déployé et fonctionnel** à J-7 a une valeur immense ; un pivot remettrait à zéro le
  risque sur le critère le plus lourd (Démo fonctionnelle, 30 %).
- L'architecture **serverless** (un worker = API + cron + assets) est cohérente, à coût quasi nul
  au repos, et **élimine l'administration de serveurs** — un argument fort en revue.
- AWS EC2 reste un **choix marché** parfaitement défendable ; le cahier autorise « le choix
  d'architecture vous appartient — mais justifié ».

## Conséquences

- (+) Continuité, risque minimal, démo plus sûre.
- (+) Garde-fous coûts natifs (auto-destroy + stop nocturne via cron).
- (−) On s'écarte de la « préférence outils » du cahier (OpenTofu/Ansible/Prometheus) →
  compensé par les ADR 0002/0003 et le monitoring (roadmap P1).
- (−) Pas de bastion/OpenStack par classe « clé en main » → isolation par security group (ADR à venir).

## Alternatives écartées

- **Pivot Infomaniak/OpenTofu** : trop risqué à 7 jours, jette une base qui marche.
- **Double stack** : dispersion de l'effort, incohérence de démo.
