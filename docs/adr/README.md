# Architecture Decision Records (ADR)

Décisions d'architecture, format léger : **Contexte → Décision → Conséquences → Alternatives**.
Chaque ADR répond à « nous avons choisi X plutôt que Y parce que… » (exigence cahier des charges).

| # | Décision | Statut |
|---|---|---|
| [0001](0001-garder-aws-et-cloudflare-workers.md) | Garder AWS EC2 + Cloudflare Workers (vs pivot Infomaniak/OpenTofu) | ✅ Acté |
| [0002](0002-provisioning-api-directe-vs-terraform.md) | Provisioning par API AWS directe + module Terraform documenté | ✅ Acté |
| [0003](0003-ansible-via-cloud-init.md) | Installation des outils via Ansible + cloud-init (`ansible-pull`) | ✅ Acté |
| [0004](0004-cycle-de-vie-reconciliateur.md) | Cycle de vie (dates, auto-destroy) via le réconciliateur cron | ✅ Acté |
| [0005](0005-roles-et-demande-groupee.md) | Rôle formateur + demande groupée par `group_id` | ✅ Acté |
| [0006](0006-gestion-des-secrets.md) | Secrets : Wrangler Secrets + chiffrement AES-GCM au repos | ✅ Acté |
| [0007](0007-catalogue-os-et-windows-rdp.md) | Catalogue d'OS élargi (AMIs vérifiés) + support Windows (RDP) | ✅ Acté |

> Convention : un ADR n'est jamais réécrit une fois acté ; s'il est remis en cause, on crée un
> nouvel ADR qui le « supersède ».
