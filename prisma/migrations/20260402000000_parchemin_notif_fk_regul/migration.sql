-- ParcheminNote : notifBody passe de TEXT à VARCHAR(191)
ALTER TABLE `ParcheminNote` MODIFY COLUMN `notifBody` VARCHAR(191) NULL;

-- ParcheminNote : ajout de la contrainte FK sur parentId (auto-relation)
ALTER TABLE `ParcheminNote`
  ADD CONSTRAINT `ParcheminNote_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `ParcheminNote`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Reconciliation : suppression de l'index unique sur month
DROP INDEX `Reconciliation_month_key` ON `Reconciliation`;
