-- CreateTable
CREATE TABLE `Tag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntryTag` (
    `entryId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `EntryTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`entryId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListItem` (
    `id` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `addedById` VARCHAR(191) NOT NULL,
    `checkedById` VARCHAR(191) NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,

    INDEX `ListItem_entryId_checked_idx`(`entryId`, `checked`),
    INDEX `ListItem_entryId_archivedAt_idx`(`entryId`, `archivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventReminder` (
    `id` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `delay` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `EventReminder_entryId_idx`(`entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reminderDelays` VARCHAR(191) NOT NULL DEFAULT '["PT0S","-PT15M","-PT1H"]',
    `snoozeTonightHour` VARCHAR(191) NOT NULL DEFAULT '20:00',
    `eventDefaultDelays` VARCHAR(191) NOT NULL DEFAULT '["-P1D","-PT2H"]',
    `enrichDelay` INTEGER NOT NULL DEFAULT 60,
    `briefEnabled` BOOLEAN NOT NULL DEFAULT false,
    `briefTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `recapEnabled` BOOLEAN NOT NULL DEFAULT false,
    `recapDay` INTEGER NOT NULL DEFAULT 0,
    `recapTime` VARCHAR(191) NOT NULL DEFAULT '19:00',
    `silenceEnabled` BOOLEAN NOT NULL DEFAULT false,
    `silenceStart` VARCHAR(191) NULL,
    `silenceEnd` VARCHAR(191) NULL,
    `escalationEnabled` BOOLEAN NOT NULL DEFAULT false,
    `escalationDelay` INTEGER NOT NULL DEFAULT 30,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NULL,
    `type` ENUM('REMINDER', 'EVENT', 'ENRICHMENT', 'BRIEF', 'RECAP', 'ESCALATION') NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `dismissedAt` DATETIME(3) NULL,
    `snoozedTo` DATETIME(3) NULL,

    INDEX `NotificationLog_userId_type_scheduledAt_idx`(`userId`, `type`, `scheduledAt`),
    INDEX `NotificationLog_entryId_idx`(`entryId`),
    INDEX `NotificationLog_sentAt_idx`(`sentAt`),
    INDEX `NotificationLog_scheduledAt_sentAt_idx`(`scheduledAt`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActiveAt` DATETIME(3) NOT NULL,

    INDEX `PushSubscription_userId_idx`(`userId`),
    UNIQUE INDEX `PushSubscription_userId_endpoint_key`(`userId`, `endpoint`(255)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NlpFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `input` TEXT NOT NULL,
    `predicted` ENUM('NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT') NOT NULL,
    `corrected` ENUM('NOTE', 'TODO', 'REMINDER', 'LIST', 'PROJECT', 'DISCUSSION', 'EVENT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NlpFeedback_userId_idx`(`userId`),
    INDEX `NlpFeedback_predicted_corrected_idx`(`predicted`, `corrected`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Calendar` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarMember` (
    `calendarId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',

    PRIMARY KEY (`calendarId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Place` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `radius` INTEGER NOT NULL DEFAULT 100,
    `ownerId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Place_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EntryTag` ADD CONSTRAINT `EntryTag_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `Entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntryTag` ADD CONSTRAINT `EntryTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListItem` ADD CONSTRAINT `ListItem_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `Entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventReminder` ADD CONSTRAINT `EventReminder_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `Entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationLog` ADD CONSTRAINT `NotificationLog_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `Entry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NlpFeedback` ADD CONSTRAINT `NlpFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarMember` ADD CONSTRAINT `CalendarMember_calendarId_fkey` FOREIGN KEY (`calendarId`) REFERENCES `Calendar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
