-- AlterTable
ALTER TABLE `LabeurInflationState` ADD COLUMN `overdueReminderSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `LabeurMarketItem` ADD COLUMN `initialStock` INTEGER NULL;

-- AlterTable
ALTER TABLE `LabeurSettings` ADD COLUMN `lastCurseAlertSentAt` DATETIME(3) NULL,
    ADD COLUMN `lastInflationAlertSentAt` DATETIME(3) NULL;
