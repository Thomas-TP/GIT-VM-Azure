# Mémoire projet — GIT VM Portal

> Faits durables non déductibles du seul code. Pour l'équipe et la continuité de l'assistance IA.
> Tenir à jour. Dernière màj : 2026-06-19.

## Identité
- **Projet** : plateforme self-service de provisioning de VM pour le Geneva Institute of Technology (GIT).
- **Cadre** : hackathon Satom IT & Learning Solutions × GIT, **11 → 26 juin 2026**. Groupe 3 (binôme : Thomas P. & Abderahmane).
- **Prod** : `https://git-vm-portal.thomas-prudhomme.workers.dev` · **Repo** : `https://github.com/Thomas-TP/GIT-VM`.

## Décisions structurantes
- **Stack réelle = AWS EC2 + Cloudflare Workers + D1** (PAS le plan initial Infomaniak/OpenTofu/FastAPI/Postgres, qui est abandonné).
- On **garde** AWS et on **ne pivote pas** : à J-7, le socle déployé qui marche prime. (ADR 0001)
- Toute logique de cycle de vie passe par le **réconciliateur cron** existant. (ADR 0004)
- Ansible via **cloud-init `ansible-pull`** (pas de serveur de contrôle). (ADR 0003)
- IaC : API AWS directe pour le live + module Terraform de référence, justifié en ADR. (ADR 0002)

## Échéances
- **Revue d'archi** : ~ven. 19 juin 2026.
- **Démo live + livrables** : **ven. 26 juin 2026** (plan B vidéo + env. de secours **obligatoire**).

## État connu (2026-06-19)
- Worker **sain** : `/auth/login` renvoie bien un 302 vers Microsoft. Le bug de login est en
  **config** (Entra redirect URI / `ENTRA_CLIENT_SECRET` / domaine email), pas dans le code.
- **4 Must rouges** manquants : dates début/fin (M3), destruction auto (M8), rôle formateur +
  demande groupée (M5), Ansible/outils du cours (M7).
- Points forts : OIDC propre, clé SSH unique chiffrée AES-GCM par VM, réconciliateur, audit log, i18n.

## Préférences de travail (équipe)
- **Ne rien casser** de l'existant fonctionnel ; ajouter et corriger, pas réécrire.
- Attendu de l'assistance : **analyser, proposer, optimiser, corriger, recommander** — puis exécuter après validation.
- Documentation et ADR en **français**.

## Points à confirmer
- Sens exact de « pas de destroy » : confirmé interprété comme « pas de pivot/réécriture », l'auto-destruction à l'échéance **reste** (Must). À valider explicitement.
- Profondeur monitoring (CloudWatch vs Prometheus) et rôles (liste emails vs groupes Entra).
