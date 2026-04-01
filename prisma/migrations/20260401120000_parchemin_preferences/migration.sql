CREATE TABLE `ParcheminPreferences` (
  `id`             VARCHAR(191) NOT NULL,
  `userId`         VARCHAR(191) NOT NULL,
  `notifyOnCreate` TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ParcheminPreferences_userId_key` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ParcheminPreferences`
  ADD CONSTRAINT `ParcheminPreferences_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
