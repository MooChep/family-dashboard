-- Désactive temporairement les contraintes FK
SET FOREIGN_KEY_CHECKS = 0;

-- S'assure que le thème light existe (idempotent)
INSERT IGNORE INTO `Theme` (`id`, `name`, `label`, `isDefault`, `cssVars`, `createdBy`, `createdAt`)
VALUES (
  UUID(),
  'light',
  'Clair',
  TRUE,
  '{"--bg":"#f5f3ef","--surface":"#ffffff","--surface2":"#faf8f5","--border":"#e4dfd6","--border2":"#d4cec4","--accent":"#2d4a3e","--accent-dim":"#2d4a3e18","--text":"#1a1a18","--text2":"#3d3d38","--muted":"#8c8880","--muted2":"#b0aba3","--success":"#3a7d5c","--warning":"#c9a84c","--danger":"#c9623f","--font-display":"\'Playfair Display\', serif","--font-body":"\'DM Sans\', sans-serif","--font-mono":"\'DM Mono\', monospace"}',
  NULL,
  NOW()
);

-- Bascule les UserConfig dark → light
UPDATE `UserConfig` SET `themeId` = 'light' WHERE `themeId` = 'dark';

-- Supprime le thème dark
DELETE FROM `Theme` WHERE `name` = 'dark';

-- Marque light comme défaut système
UPDATE `Theme` SET `isDefault` = TRUE, `createdBy` = NULL WHERE `name` = 'light';

-- Réactive les contraintes FK
SET FOREIGN_KEY_CHECKS = 1;