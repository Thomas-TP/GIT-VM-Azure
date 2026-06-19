# Recommandations finales

> Synthèse décisionnelle au 2026-06-19 (J-7). À lire après `docs/analyse/`.

## Verdict global

Le projet a un **socle solide et déployé** (OIDC propre, sécurité des clés SSH excellente,
réconciliateur robuste, UX soignée). **Il n'y a rien à jeter.** Le risque n'est pas la qualité de
l'existant — c'est la **couverture des Must** : 4 exigences fermes manquent et touchent
directement le scénario de démo imposé. Tout l'effort des 7 jours doit y aller.

## La stratégie que je recommande (et pourquoi)

**Garder AWS + Cloudflare Workers, et combler les Must de façon additive.** Pas de pivot.

1. **Cycle de vie temporel d'abord** (M3 + M8). C'est le Must le plus martelé et le moins cher :
   les dates en DB + une dizaine de lignes dans le réconciliateur existant. Ça débloque aussi
   3 Should (notif d'échéance, extinction nuit/WE, base du dashboard coûts). **Meilleur ROI du sprint.**
2. **Ansible via cloud-init** (M7). De l'Ansible réel, dans le repo, sans serveur à opérer
   (`ansible-pull`). Couvre le « outils installés » de la démo. (ADR 0003)
3. **Formateur + demande groupée** (M5) via un simple `group_id`. Prépare l'isolation par classe et
   le dashboard coûts par cours. (ADR 0005)
4. **Catalogue = cours** (M2), couplé aux playbooks Ansible.
5. **IaC** (M6) : assumer l'API directe pour le live **et** livrer un module Terraform de référence,
   le tout **justifié en ADR** (le cahier demande explicitement de savoir défendre ses choix). (ADR 0002)

Une fois ces 5 points verts : monitoring ressources + dashboard coûts par cours + isolation par
classe = gros points sur le critère « Coûts/Sécurité/Monitoring (20 %) » pour un effort modéré.

## Pourquoi pas l'inverse (ce qu'il ne faut PAS faire)

- ❌ **Pivoter** vers Infomaniak/OpenTofu/FastAPI à 7 jours : on jette une base qui marche et on
  remet à zéro le risque sur le critère le plus lourd (démo, 30 %).
- ❌ **Forcer Terraform dans la boucle live** via un runner CI : latence + maillon qui casse en
  démo live, pour un parc minuscule. Le module Terraform sert de référence, pas de runtime.
- ❌ **Élargir les Could** (prolongation, reset, scan vuln) **avant** d'avoir verdi les Must.

## Ce qui fera la différence « pro » devant le client (bonus à fort signal)

- **Plan B impeccable** : vidéo + env. de secours pré-provisionné. Le cahier le note ; peu d'équipes
  le soignent. Gérer le risque de démo = signal de séniorité.
- **Garde-fous coûts visibles** : montrer en direct l'auto-destroy + le stop nocturne + un coût qui
  retombe à zéro. C'est exactement la douleur exprimée par le client (« des machines qui tournent pour rien »).
- **Sécurité racontée** : clé unique chiffrée par VM, aucun mot de passe partagé, audit log → narratif fort.
- **ADR** : 6 décisions justifiées, prêtes pour la revue d'archi. Montre une démarche d'ingénieur.
- **Test de redéploiement réussi** : un externe redéploie avec la seule doc → coche le livrable phare (réutilisabilité).

## Décisions encore ouvertes (à trancher avec l'équipe / le client)

1. **Monitoring** : CloudWatch CPU (rapide, suffisant pour le Must) **vs** node_exporter+Prometheus
   +Grafana (bonus archi, plus long). Recommandation : CloudWatch d'abord, Prometheus si le temps reste.
2. **Rôles** : liste `TRAINER_EMAILS` (sûr pour la démo) **vs** groupes Entra (plus « pro » mais
   dépend du tenant). Recommandation : liste d'abord, Entra en évolution documentée.
3. **Module Terraform** : périmètre exact (1 VM de démo) — à limiter pour éviter la double-maintenance.
4. **Sens exact de « pas de destroy »** : confirmer que l'auto-destruction à l'échéance reste au
   plan (c'est un Must). En attente de confirmation explicite de l'équipe.

## Ordre d'attaque recommandé (résumé)

```
Login (J1) → Dates+AutoDestroy (J2) → Ansible+Templates (J3) → Formateur+Groupé (J4)
→ Monitoring+Coûts+Notifs (J5) → Doc+Hardening (J6) → Répétition+PlanB+Slides (J7) → Démo (26)
```

Détail jour par jour : `ROADMAP-J19-J26.md`. Issues : `BACKLOG.md`.
```