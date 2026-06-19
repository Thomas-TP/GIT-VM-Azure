-- 0005 — Cycle de vie temporel : dates de début/fin + marqueur d'expiration.
-- Décision équipe : à l'échéance on ARRÊTE la VM (pas de destruction). ADR 0004.
--
-- Approche 100 % ADDITIVE (ADD COLUMN uniquement) : aucune reconstruction de table,
-- donc aucun conflit de clé étrangère sur D1 remote. L'état « expiré » est porté par
-- la colonne expired_at (et non par une valeur de statut, ce qui éviterait de devoir
-- modifier la contrainte CHECK existante — impossible sans reconstruire la table).

ALTER TABLE vm_requests ADD COLUMN start_date TEXT;   -- ISO 8601 UTC (optionnel)
ALTER TABLE vm_requests ADD COLUMN end_date   TEXT;   -- ISO 8601 UTC (obligatoire côté API)
ALTER TABLE vm_requests ADD COLUMN expired_at TEXT;   -- posé par le réconciliateur à l'échéance

CREATE INDEX IF NOT EXISTS idx_requests_enddate ON vm_requests(end_date);
