-- CreateTable
CREATE TABLE `BankAccount` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BankAccount_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `month` DATETIME(3) NOT NULL,
    `totalReal` DOUBLE NOT NULL,
    `totalBdd` DOUBLE NOT NULL,
    `gap` DOUBLE NOT NULL,
    `note` VARCHAR(191) NULL,
    `adjustmentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Reconciliation_month_key`(`month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReconciliationEntry` (
    `id` VARCHAR(191) NOT NULL,
    `reconciliationId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `balance` DOUBLE NOT NULL,

    INDEX `ReconciliationEntry_accountId_idx`(`accountId`),
    INDEX `ReconciliationEntry_reconciliationId_idx`(`reconciliationId`),
    UNIQUE INDEX `ReconciliationEntry_reconciliationId_accountId_key`(`reconciliationId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReconciliationEntry` ADD CONSTRAINT `ReconciliationEntry_reconciliationId_fkey` FOREIGN KEY (`reconciliationId`) REFERENCES `Reconciliation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReconciliationEntry` ADD CONSTRAINT `ReconciliationEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `BankAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
