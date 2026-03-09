-- AlterTable
ALTER TABLE `SavingsProject` ADD COLUMN `transferredAmount` DOUBLE NULL,
    ADD COLUMN `transferredMonth` DATETIME(3) NULL,
    ADD COLUMN `transferredToId` VARCHAR(191) NULL;
