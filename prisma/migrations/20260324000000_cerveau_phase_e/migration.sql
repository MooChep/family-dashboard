-- Phase E : Notifications Avancées
-- CerveauEntry : notification escalation counters
ALTER TABLE `CerveauEntry`
  ADD COLUMN `notificationCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lastNotifiedAt` DATETIME(3) NULL;

-- CerveauPreferences : morning digest + weekly recap
CREATE TABLE `CerveauPreferences`
  ADD COLUMN `morningDigestAt` VARCHAR(191) NULL DEFAULT '08:00',
  ADD COLUMN `lastDailyDigestAt` DATETIME(3) NULL,
  ADD COLUMN `lastWeeklyRecapAt` DATETIME(3) NULL,
  ADD COLUMN `weeklyRecapEnabled` TINYINT(1) NOT NULL DEFAULT 1;
