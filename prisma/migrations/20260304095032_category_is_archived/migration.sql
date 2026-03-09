-- AlterTable
ALTER TABLE `Category` ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `type` ENUM('INCOME', 'EXPENSE', 'PROJECT') NOT NULL;

-- AlterTable
ALTER TABLE `SavingsProject` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `SavingsProject_categoryId_idx` ON `SavingsProject`(`categoryId`);

-- AddForeignKey
ALTER TABLE `SavingsProject` ADD CONSTRAINT `SavingsProject_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
