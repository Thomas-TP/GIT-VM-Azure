-- 0011 — Bundle d'outils par cours préinstallé sur la VM (Linux, via cloud-init).
-- 100 % additif. `course` = id du cours choisi (NULL = aucun).

ALTER TABLE vm_requests ADD COLUMN course TEXT;
