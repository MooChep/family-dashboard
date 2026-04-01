CREATE TABLE IF NOT EXISTS `HippoNote` (
  `id`           VARCHAR(191) NOT NULL,
  `title`        VARCHAR(191) NOT NULL,
  `format`       ENUM('TEXT','CHECKLIST','BULLETS','NUMBERED') NOT NULL DEFAULT 'TEXT',
  `body`         TEXT NULL,
  `pinned`       TINYINT(1) NOT NULL DEFAULT 0,
  `parentId`     VARCHAR(191) NULL,
  `notifAt`      DATETIME(3) NULL,
  `notifTo`      VARCHAR(191) NULL,
  `notifBody`    TEXT NULL,
  `notifSentAt`  DATETIME(3) NULL,
  `createdById`  VARCHAR(191) NOT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,
  `archivedAt`   DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `HippoNote_parentId_idx`    (`parentId`),
  INDEX `HippoNote_createdById_idx` (`createdById`),
  INDEX `HippoNote_notifAt_idx`     (`notifAt`),
  INDEX `HippoNote_pinned_idx`      (`pinned`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `HippoItem` (
  `id`      VARCHAR(191) NOT NULL,
  `noteId`  VARCHAR(191) NOT NULL,
  `label`   VARCHAR(191) NOT NULL,
  `checked` TINYINT(1) NOT NULL DEFAULT 0,
  `order`   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `HippoItem_noteId_idx` (`noteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
