-- AddForeignKey
ALTER TABLE `ParcheminNote` ADD CONSTRAINT `ParcheminNote_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcheminItem` ADD CONSTRAINT `ParcheminItem_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `ParcheminNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `ParcheminItem_noteId_idx` ON `ParcheminItem`(`noteId`);
DROP INDEX `HippoItem_noteId_idx` ON `ParcheminItem`;

-- RedefineIndex
CREATE INDEX `ParcheminNote_createdById_idx` ON `ParcheminNote`(`createdById`);
DROP INDEX `HippoNote_createdById_idx` ON `ParcheminNote`;

-- RedefineIndex
CREATE INDEX `ParcheminNote_dueDate_idx` ON `ParcheminNote`(`dueDate`);
DROP INDEX `HippoNote_dueDate_idx` ON `ParcheminNote`;

-- RedefineIndex
CREATE INDEX `ParcheminNote_notifAt_idx` ON `ParcheminNote`(`notifAt`);
DROP INDEX `HippoNote_notifAt_idx` ON `ParcheminNote`;

-- RedefineIndex
CREATE INDEX `ParcheminNote_parentId_idx` ON `ParcheminNote`(`parentId`);
DROP INDEX `HippoNote_parentId_idx` ON `ParcheminNote`;

-- RedefineIndex
CREATE INDEX `ParcheminNote_pinned_idx` ON `ParcheminNote`(`pinned`);
DROP INDEX `HippoNote_pinned_idx` ON `ParcheminNote`;
