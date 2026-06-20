-- 0008 — Demande de prolongation : l'utilisateur demande une nouvelle date de fin,
-- un admin approuve (applique la date) ou refuse. 100 % additif.
-- Comme l'expiration SUPPRIME la VM (ADR 0008), la prolongation doit être demandée
-- et approuvée AVANT l'échéance.

ALTER TABLE vm_requests ADD COLUMN ext_requested_end TEXT;  -- nouvelle date de fin demandée (ISO UTC)
ALTER TABLE vm_requests ADD COLUMN ext_requested_at  TEXT;  -- horodatage de la demande
