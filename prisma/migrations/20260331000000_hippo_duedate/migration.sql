ALTER TABLE `HippoNote`
  ADD COLUMN `dueDate` DATETIME(3) NULL,
  ADD INDEX `HippoNote_dueDate_idx` (`dueDate`);
