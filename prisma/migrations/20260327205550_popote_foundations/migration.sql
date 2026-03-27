-- AlterTable
ALTER TABLE `CerveauEntry` MODIFY `tags` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CerveauTemplate` MODIFY `body` TEXT NULL,
    MODIFY `tags` TEXT NULL;

-- AlterTable
ALTER TABLE `PushSubscription` MODIFY `endpoint` TEXT NOT NULL,
    MODIFY `p256dh` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `Aisle` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IngredientReference` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `baseUnit` ENUM('GRAM', 'MILLILITER', 'UNIT') NOT NULL,
    `aisleId` VARCHAR(191) NOT NULL,
    `defaultQuantity` DOUBLE NULL,
    `conversions` JSON NULL,
    `quickBuyQuantities` JSON NULL,
    `imageUrl` VARCHAR(191) NULL,

    UNIQUE INDEX `IngredientReference_name_key`(`name`),
    INDEX `IngredientReference_aisleId_idx`(`aisleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recipe` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `imageLocal` VARCHAR(191) NOT NULL,
    `preparationTime` INTEGER NULL,
    `cookingTime` INTEGER NULL,
    `basePortions` INTEGER NOT NULL DEFAULT 4,
    `calories` INTEGER NULL,
    `utensils` TEXT NULL,
    `steps` JSON NOT NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `jowId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Recipe_jowId_key`(`jowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeIngredient` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `displayUnit` VARCHAR(191) NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `isStaple` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RecipeIngredient_recipeId_idx`(`recipeId`),
    INDEX `RecipeIngredient_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauPreferences` ADD CONSTRAINT `CerveauPreferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauTemplate` ADD CONSTRAINT `CerveauTemplate_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CerveauTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauTemplate` ADD CONSTRAINT `CerveauTemplate_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CerveauTemplateItem` ADD CONSTRAINT `CerveauTemplateItem_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `CerveauTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IngredientReference` ADD CONSTRAINT `IngredientReference_aisleId_fkey` FOREIGN KEY (`aisleId`) REFERENCES `Aisle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `IngredientReference`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
