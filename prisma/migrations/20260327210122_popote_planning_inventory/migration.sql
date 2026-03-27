-- CreateTable
CREATE TABLE `PlanningSlot` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `type` ENUM('DATED', 'FLOATING') NOT NULL,
    `scheduledDate` DATETIME(3) NULL,
    `period` ENUM('LUNCH', 'DINNER') NULL,
    `portions` INTEGER NOT NULL,
    `portionsConsumed` INTEGER NOT NULL DEFAULT 0,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlanningSlot_recipeId_idx`(`recipeId`),
    INDEX `PlanningSlot_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShoppingList` (
    `id` VARCHAR(191) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `weekStart` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShoppingListItem` (
    `id` VARCHAR(191) NOT NULL,
    `shoppingListId` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NULL,
    `displayUnit` VARCHAR(191) NULL,
    `plannedQuantity` DOUBLE NULL,
    `skipped` BOOLEAN NOT NULL DEFAULT false,
    `purchased` BOOLEAN NOT NULL DEFAULT false,
    `purchasedQuantity` DOUBLE NULL,
    `isManual` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ShoppingListItem_shoppingListId_idx`(`shoppingListId`),
    INDEX `ShoppingListItem_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Inventory_referenceId_key`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlanningSlot` ADD CONSTRAINT `PlanningSlot_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingListItem` ADD CONSTRAINT `ShoppingListItem_shoppingListId_fkey` FOREIGN KEY (`shoppingListId`) REFERENCES `ShoppingList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingListItem` ADD CONSTRAINT `ShoppingListItem_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `IngredientReference`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `IngredientReference`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
