-- CreateTable
CREATE TABLE `Entry` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT') NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('OPEN', 'DONE', 'CANCELLED', 'ARCHIVED', 'SNOOZED', 'PASSED', 'PAUSED') NOT NULL DEFAULT 'OPEN',
    `authorId` VARCHAR(191) NOT NULL,
    `assignedTo` ENUM('SHARED', 'ILAN', 'CAMILLE') NOT NULL DEFAULT 'SHARED',
    `source` ENUM('CAPTURE', 'VIDE_TETE', 'TEMPLATE', 'RECURRING') NOT NULL DEFAULT 'CAPTURE',
    `contentFormat` ENUM('PLAIN', 'MARKDOWN') NOT NULL DEFAULT 'PLAIN',
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `dueDate` DATETIME(3) NULL,
    `snoozedUntil` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `recurrenceRule` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `location` VARCHAR(191) NULL,
    `locationLat` DOUBLE NULL,
    `locationLng` DOUBLE NULL,
    `calendarId` VARCHAR(191) NULL,
    `externalUid` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `enrichNotifiedAt` DATETIME(3) NULL,
    `attachmentPath` VARCHAR(191) NULL,
    `attachmentMime` VARCHAR(191) NULL,
    `attachmentSize` INTEGER NULL,
    `placeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Entry_authorId_type_status_idx`(`authorId`, `type`, `status`),
    INDEX `Entry_authorId_status_dueDate_idx`(`authorId`, `status`, `dueDate`),
    INDEX `Entry_projectId_status_dueDate_idx`(`projectId`, `status`, `dueDate`),
    INDEX `Entry_type_status_archivedAt_idx`(`type`, `status`, `archivedAt`),
    INDEX `Entry_status_archivedAt_idx`(`status`, `archivedAt`),
    INDEX `Entry_calendarId_idx`(`calendarId`),
    INDEX `Entry_placeId_idx`(`placeId`),
    FULLTEXT INDEX `Entry_content_idx`(`content`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Entry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Entry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
