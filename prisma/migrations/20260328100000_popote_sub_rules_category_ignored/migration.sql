-- AlterTable: Recipe — add category
ALTER TABLE `Recipe` ADD COLUMN `category` ENUM('STARTER','MAIN','DESSERT','OTHER') NULL DEFAULT 'OTHER';

-- AlterTable: RecipeIngredient — add isIgnored
ALTER TABLE `RecipeIngredient` ADD COLUMN `isIgnored` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: SubstitutionRule
CREATE TABLE `SubstitutionRule` (
    `id`          VARCHAR(191) NOT NULL,
    `jowName`     VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubstitutionRule_jowName_key`(`jowName`),
    INDEX `SubstitutionRule_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubstitutionRule` ADD CONSTRAINT `SubstitutionRule_referenceId_fkey`
    FOREIGN KEY (`referenceId`) REFERENCES `IngredientReference`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
