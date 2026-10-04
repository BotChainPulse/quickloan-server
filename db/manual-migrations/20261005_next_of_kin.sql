-- Additive MySQL/TiDB migration. Existing contact 1 and application rows remain unchanged.
-- Run once, or use npm run db:migrate:kin for an idempotent column check.
ALTER TABLE `applications`
  ADD COLUMN `kinName2` varchar(255) NULL,
  ADD COLUMN `kinPhone2` varchar(20) NULL,
  ADD COLUMN `kinName3` varchar(255) NULL,
  ADD COLUMN `kinPhone3` varchar(20) NULL;
