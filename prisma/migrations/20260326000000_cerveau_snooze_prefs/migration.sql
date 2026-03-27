-- ============================================================
-- Migration : tables push/préférences/templates + snooze prefs
-- Utilise IF NOT EXISTS partout pour être idempotente
-- ============================================================

-- ── CerveauEntry — colonnes notification (ajoutées via db push) ──────────────
ALTER TABLE `CerveauEntry`
  ADD COLUMN IF NOT EXISTS `notificationCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `lastNotifiedAt`    DATETIME(3) NULL;

-- ── PushSubscription ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `PushSubscription` (
  `id`           VARCHAR(191) NOT NULL,
  `userId`       VARCHAR(191) NOT NULL,
  `endpoint`     LONGTEXT     NOT NULL,
  `p256dh`       LONGTEXT     NOT NULL,
  `auth`         VARCHAR(191) NOT NULL,
  `userAgent`    VARCHAR(191) NULL,
  `lastActiveAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `PushSubscription_userId_idx` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── CerveauPreferences ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `CerveauPreferences` (
  `id`                 VARCHAR(191) NOT NULL,
  `userId`             VARCHAR(191) NOT NULL,
  `eveningStartsAt`    VARCHAR(191) NOT NULL DEFAULT '19:00',
  `eventLeadTime`      INT          NOT NULL DEFAULT 1440,
  `quietFrom`          VARCHAR(191) NULL,
  `quietUntil`         VARCHAR(191) NULL,
  `morningDigestAt`    VARCHAR(191) NULL DEFAULT '08:00',
  `lastDailyDigestAt`  DATETIME(3)  NULL,
  `lastWeeklyRecapAt`  DATETIME(3)  NULL,
  `weeklyRecapEnabled` TINYINT(1)   NOT NULL DEFAULT 1,
  `snoozeSlot1Label`   VARCHAR(191) NOT NULL DEFAULT '15 min',
  `snoozeSlot1Minutes` INT          NOT NULL DEFAULT 15,
  `snoozeSlot2Label`   VARCHAR(191) NOT NULL DEFAULT '1 heure',
  `snoozeSlot2Minutes` INT          NOT NULL DEFAULT 60,
  `snoozeSlot3Label`   VARCHAR(191) NOT NULL DEFAULT 'Ce soir',
  `snoozeSlot3Minutes` INT          NULL,
  `snoozeSlot3Dynamic` TINYINT(1)   NOT NULL DEFAULT 1,
  `snoozeDefaultSlot`  INT          NOT NULL DEFAULT 2,
  `updatedAt`          DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `CerveauPreferences_userId_key` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── CerveauTemplate ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `CerveauTemplate` (
  `id`           VARCHAR(191) NOT NULL,
  `name`         VARCHAR(191) NOT NULL,
  `shortcut`     VARCHAR(191) NULL,
  `type`         ENUM('NOTE','TODO','REMINDER','LIST','PROJECT','DISCUSSION','EVENT') NOT NULL,
  `titlePattern` VARCHAR(191) NOT NULL,
  `body`         LONGTEXT     NULL,
  `priority`     ENUM('LOW','MEDIUM','HIGH') NULL,
  `assignedTo`   ENUM('ILAN','CAMILLE','BOTH') NOT NULL DEFAULT 'BOTH',
  `tags`         LONGTEXT     NULL,
  `recurrence`   VARCHAR(191) NULL,
  `parentId`     VARCHAR(191) NULL,
  `createdById`  VARCHAR(191) NOT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `CerveauTemplate_shortcut_idx`   (`shortcut`),
  INDEX `CerveauTemplate_createdById_idx`(`createdById`),
  INDEX `CerveauTemplate_parentId_idx`   (`parentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── CerveauTemplateItem ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `CerveauTemplateItem` (
  `id`         VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `label`      VARCHAR(191) NOT NULL,
  `order`      INT          NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  INDEX `CerveauTemplateItem_templateId_idx` (`templateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
