-- Migration : light devient le thème système par défaut, dark est retiré
-- Appliquée automatiquement par `prisma migrate deploy` au démarrage Docker

-- 1. Bascule tous les UserConfig qui pointent vers 'dark' → 'light'
--    Doit être fait AVANT la suppression du thème dark (contrainte FK)
UPDATE `UserConfig`
SET `themeId` = 'light'
WHERE `themeId` = 'dark';

-- 2. Supprime le thème 'dark' de la table Theme
DELETE FROM `Theme`
WHERE `name` = 'dark';

-- 3. Marque 'light' comme thème système par défaut
UPDATE `Theme`
SET `isDefault` = TRUE,
    `createdBy` = NULL
WHERE `name` = 'light';