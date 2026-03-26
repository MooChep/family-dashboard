-- CreateTable
CREATE TABLE `CerveauEntry` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `status` ENUM('ACTIVE', 'DONE', 'ARCHIVED', 'SNOOZED') NOT NULL DEFAULT 'ACTIVE',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
    `assignedTo` ENUM('ILAN', 'CAMILLE', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `dueDate` DATETIME(3) NULL,
    `remindAt` DATETIME(3) NULL,
    `snoozedUntil` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `archivedAt` DATETIME(3) NULL,
    `doneAt` DATETIME(3) NULL,
    `parentId` VARCHAR(191) NULL,

    INDEX `CerveauEntry_status_idx`(`status`),
    INDEX `CerveauEntry_type_idx`(`type`),
    INDEX `CerveauEntry_assignedTo_idx`(`assignedTo`),
    INDEX `CerveauEntry_dueDate_idx`(`dueDate`),
    INDEX `CerveauEntry_remindAt_idx`(`remindAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CerveauListItem` (
    `id` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CerveauListItem_entryId_idx`(`entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CerveauEntry` ADD CONSTRAINT `CerveauEntry_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauEntry` ADD CONSTRAINT `CerveauEntry_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CerveauEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauListItem` ADD CONSTRAINT `CerveauListItem_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `CerveauEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
