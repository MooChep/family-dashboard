-- AlterTable
ALTER TABLE `CerveauEntry`
  ADD COLUMN `tags`       TEXT NULL,
  ADD COLUMN `recurrence` VARCHAR(191) NULL;
