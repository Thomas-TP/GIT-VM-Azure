-- 0007 — Planification : démarrage / extinction automatiques par VM (choisis par l'utilisateur).
--
-- 100 % ADDITIF. La planification vit sur vm_requests (persiste avec la demande, survit à une
-- recréation d'instance). Les heures sont locales Europe/Zurich ('HH:MM'). Les jours sont des
-- jours ISO (1 = lundi … 7 = dimanche) en CSV. Le réconciliateur (cron */2) applique l'état désiré :
-- dans la fenêtre + jour coché → la VM doit tourner ; sinon → elle doit être arrêtée.

ALTER TABLE vm_requests ADD COLUMN schedule_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_requests ADD COLUMN schedule_start TEXT;  -- 'HH:MM' (Europe/Zurich)
ALTER TABLE vm_requests ADD COLUMN schedule_stop  TEXT;  -- 'HH:MM' (Europe/Zurich)
ALTER TABLE vm_requests ADD COLUMN schedule_days  TEXT;  -- CSV jours ISO, ex. '1,2,3,4,5'
