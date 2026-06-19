# Roadmap GIT VM Portal — 8 → 26 juin 2026

> Plan complet du projet. Fenêtre officielle du hackathon : **11 → 26 juin** (revue d'archi
> ~ven. 19, démo ven. 26). On est **un peu en retard** → on avance **vite mais proprement** :
> à chaque fin de journée, `main` reste démontrable et le **plan B** (vidéo) est à jour.
>
> Décisions équipe intégrées : **pas de destruction auto** (→ auto-**stop** à l'échéance) ·
> **CloudWatch** pour le monitoring · **dates début/fin obligatoires** ·
> rôle formateur / demande groupée **à confirmer** (voir ⚠️).
>
> Légende : ✅ fait · 🔄 à rattraper · ⏳ à venir · ⭐ chemin critique démo · ⚠️ risque note.

---

## Phase 0 — Amont & cadrage · lun. 8 → mer. 11 juin
- ✅ Constitution binôme (Abderahmane + Thomas), choix de la stack **AWS + Cloudflare Workers**.
- ✅ Dépôt GitHub créé, premiers déploiements.
- 🔄 **À rattraper** : board GitHub Projects officiel + backlog tenu à jour (livrable noté 10 %).

## Phase 1 — Socle (semaine 1) · jeu. 12 → mer. 18 juin
- ✅ Auth OIDC Entra, catalogue, workflow validation + emails, provisioning EC2, clé SSH chiffrée,
  réconciliateur, admin, audit log, i18n. (cf. `docs/analyse/01-etat-des-lieux.md`)
- 🔄 **Dette ouverte** : dates de fin, cycle de vie temporel, Ansible, monitoring ressources.

## Phase 2 — Revue d'archi + déblocage · **jeu. 19 juin (aujourd'hui)**
- ⭐ **Login débloqué** : correctif `run_worker_first` appliqué → **rebuild + `wrangler deploy`** + vérifier le 302. (`docs/analyse/04`)
- 🔴 **Revue d'architecture** : présenter AWS+Workers, réconciliateur, sécurité clés SSH, choix coûts. Support = ADR 0001-0006.
- **Gel du schéma** : valider migration `0005_lifecycle` (`start_date`, `end_date NOT NULL`).
- 🔄 Board GitHub Projects peuplé depuis `BACKLOG.md` ; repo local relié au remote.
- **Plan B v0** : 1ʳᵉ vidéo du parcours actuel.

---

## Sprint final — détail jour par jour

### Ven. 20 juin · Dates + extinction à l'échéance (Must M3 + cycle de vie)
- ⭐🔴 Migration `0005` appliquée (local + remote).
- ⭐🔴 Formulaire : **date de fin obligatoire** (refus si absente / `end < start`).
- ⭐🔴 API : stockage des dates ; affichage de la date de fin côté étudiant.
- ⭐ **Auto-stop à `end_date`** dans `reconcile()` (PAS de destroy) → statut `expired` + email. (ADR 0004)
- ⚠️ Noter l'écart au Must M8 (destruction) ; prévoir un flag `AUTO_TERMINATE` activable si le client l'exige.

### Sam. 21 juin · Ansible + templates de cours (Must M7 + M2)
- ⭐🔴 `ansible/` : rôle commun + rôles `linux-admin`, `dev-web`, `data-science`.
- ⭐🔴 Worker : **user-data cloud-init** → `ansible-pull` du playbook du template. (ADR 0003)
- 🔴 Catalogue → **template = cours** (perf/OS/playbook/outils) ; perf+stockage en options avancées.
- Vérifier de bout en bout : demande → VM → **outils présents**.

### Dim. 22 juin · Monitoring + coûts (CloudWatch) + notifs
- 🔴 **Monitoring ressources = CloudWatch** : CPU lu via API, affiché par VM. (décision équipe)
- 🟠 **Dashboard coûts** par cours/classe (agrégation). (D9)
- 🟠 **Notif avant échéance** (J-1) + **extinction nuit/week-end** affinée. (D10/D11)

### Lun. 23 juin · Rôle formateur / demande groupée — ⚠️ À CONFIRMER
- ⚠️🔴 **M5 est un Must.** L'équipe a évoqué « pas besoin / on ne l'inscrit pas ».
  - **Si maintenu (recommandé pour la note)** : rôle `trainer` (liste d'emails) + formulaire « N machines » liées par `group_id`. (ADR 0005)
  - **Si retiré** : assumer l'écart au Must (impact note « démo / Must », 30 %) → décision à tracer.
- Sinon, jour de **rattrapage** sur les Must précédents + isolation réseau par classe (D8).

### Mar. 24 juin · Durcissement + documentation (livrables 20 %)
- 🔴 **README « from zero »** (stack réelle) + `.env.example`. (D16)
- 🔴 **Runbook** : panne provisioning, ajout d'un cours (= rôle Ansible), demande bloquée, rotation secret, restauration plan B.
- 🔴 **Guides utilisateur** : étudiant / formateur / validateur.
- 🟠 Hardening (fail2ban) + correctif UX d'erreur de login.
- Test de **redéploiement** par un externe (avec la doc seule).

### Mer. 25 juin · Répétition + plan B + slides
- ⭐🔴 **Répétition chronométrée < 10 min** : demande → validation → notif → provisioning → **outils installés** → **expiration (stop)**.
- ⭐🔴 **Vidéo de secours** finale + **env. de secours** (VM déjà prête).
- 🔴 **Slides** (10 min). Gel des features ; bugs only ; buffer.

### Jeu. 26 juin · Démo live 🎯
- Dérouler le scénario. Plan B prêt en parallèle.

---

## Garde-fous de priorisation
Les **Must** passent avant tout (recevabilité). Les écarts assumés (destruction → stop ; rôle
formateur si retiré) doivent être **tracés et justifiables au client**. Mieux vaut un parcours
**complet et solide** qu'une couverture large et bancale.

## Indicateur de santé quotidien
- [ ] `main` déployable et démontrable · [ ] Plan B à jour · [ ] Board Projects à jour · [ ] Coûts sous contrôle (aucune VM oubliée)
