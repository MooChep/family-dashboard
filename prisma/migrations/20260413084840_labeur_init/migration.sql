-- AlterTable
ALTER TABLE `User` ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'NEUTRAL') NOT NULL DEFAULT 'NEUTRAL';

-- CreateTable
CREATE TABLE `LabeurTask` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('RECURRING', 'ONESHOT') NOT NULL,
    `isShared` BOOLEAN NOT NULL DEFAULT false,
    `ecuValue` INTEGER NOT NULL,
    `inflationContribRate` DOUBLE NOT NULL DEFAULT 0.01,
    `streakCount` INTEGER NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'PARTIALLY_DONE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LabeurTask_status_idx`(`status`),
    INDEX `LabeurTask_type_idx`(`type`),
    INDEX `LabeurTask_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurRecurrence` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM') NOT NULL,
    `intervalDays` INTEGER NULL,
    `nextDueAt` DATETIME(3) NOT NULL,
    `lastGeneratedAt` DATETIME(3) NULL,

    UNIQUE INDEX `LabeurRecurrence_taskId_key`(`taskId`),
    INDEX `LabeurRecurrence_nextDueAt_idx`(`nextDueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurCompletion` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ecuAwarded` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LabeurCompletion_taskId_idx`(`taskId`),
    INDEX `LabeurCompletion_userId_idx`(`userId`),
    INDEX `LabeurCompletion_completedAt_idx`(`completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EcuBalance` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `totalEcuEarned` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EcuBalance_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurMarketItem` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `ecuPrice` INTEGER NOT NULL,
    `type` ENUM('INDIVIDUAL', 'COLLECTIVE') NOT NULL,
    `stock` INTEGER NULL,
    `resetFrequency` ENUM('WEEKLY', 'MONTHLY') NULL,
    `lastResetAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSealable` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LabeurMarketItem_isActive_idx`(`isActive`),
    INDEX `LabeurMarketItem_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurPurchase` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('INDIVIDUAL', 'COLLECTIVE_CONTRIBUTION') NOT NULL,
    `ecuSpent` INTEGER NOT NULL,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LabeurPurchase_itemId_idx`(`itemId`),
    INDEX `LabeurPurchase_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurInflationState` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `daysOverdue` INTEGER NOT NULL DEFAULT 0,
    `inflationPercent` DOUBLE NOT NULL DEFAULT 0,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LabeurInflationState_taskId_key`(`taskId`),
    INDEX `LabeurInflationState_computedAt_idx`(`computedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurSettings` (
    `id` VARCHAR(191) NOT NULL,
    `inflationCap` DOUBLE NOT NULL DEFAULT 150,
    `curseSeuil` DOUBLE NOT NULL DEFAULT 50,
    `inflationAlertThreshold` DOUBLE NOT NULL DEFAULT 25,
    `overdueReminderHours` INTEGER NOT NULL DEFAULT 24,
    `oneshotReminderHours` INTEGER NOT NULL DEFAULT 48,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Paris',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurQuest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `targetValue` INTEGER NOT NULL,
    `currentValue` INTEGER NOT NULL DEFAULT 0,
    `rewardDiscountPct` INTEGER NOT NULL,
    `rewardDurationHours` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LabeurQuest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabeurEcuGift` (
    `id` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `message` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LabeurEcuGift_fromUserId_idx`(`fromUserId`),
    INDEX `LabeurEcuGift_toUserId_idx`(`toUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LabeurTask` ADD CONSTRAINT `LabeurTask_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurRecurrence` ADD CONSTRAINT `LabeurRecurrence_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `LabeurTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurCompletion` ADD CONSTRAINT `LabeurCompletion_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `LabeurTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurCompletion` ADD CONSTRAINT `LabeurCompletion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EcuBalance` ADD CONSTRAINT `EcuBalance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurMarketItem` ADD CONSTRAINT `LabeurMarketItem_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurPurchase` ADD CONSTRAINT `LabeurPurchase_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `LabeurMarketItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurPurchase` ADD CONSTRAINT `LabeurPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabeurInflationState` ADD CONSTRAINT `LabeurInflationState_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `LabeurTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
