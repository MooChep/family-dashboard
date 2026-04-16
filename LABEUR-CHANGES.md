# ⚒ Labeur — Journal des déviations

> Ce fichier consigne toute déviation par rapport à la spécification source
> (document Labeur joint) ou au plan d'implémentation (LABEUR-PLAN.md).
>
> Les ajustements techniques pré-approuvés documentés dans la section
> « Ajustements techniques proposés » de LABEUR-PLAN.md **ne sont pas**
> enregistrés ici — ils sont considérés validés à la lecture du plan.

---

## Format d'entrée

```
### [SX] Titre court

- **Date :** YYYY-MM-DD
- **Session :** SX
- **Type :** deviation-spec | deviation-plan | ajout | suppression | report
- **Référence spec :** §X.Y (si applicable)
- **Description :** Ce qui a changé et pourquoi.
- **Impact :** Conséquences sur d'autres sessions ou composants.
```

---

### [S6] Ajout de champs de tracking push au schéma (2ème migration)

- **Date :** 2026-04-13
- **Session :** S6
- **Type :** ajout
- **Référence spec :** §8.4 (notifications push)
- **Description :** Le plan ne prévoyait pas de modification du schéma en S6. Trois champs de tracking ont été ajoutés pour éviter les doublons de notifications push : `LabeurInflationState.overdueReminderSentAt`, `LabeurSettings.lastInflationAlertSentAt`, `LabeurSettings.lastCurseAlertSentAt`. Un quatrième champ `LabeurMarketItem.initialStock` a été ajouté pour permettre la réinitialisation périodique du stock. Migration : `20260413091601_labeur_notif_tracking`.
- **Impact :** 2ème migration Labeur. Sans ces champs, le cron enverrait un push à chaque passage (toutes les minutes) pour chaque tâche en retard — expérience utilisateur inacceptable.

### [S6] Rappels tâches ponctuelles (ONESHOT) reportés à S10

- **Date :** 2026-04-13
- **Session :** S6
- **Type :** report
- **Référence spec :** §8.4 (« Rappel envoyé si une tâche ponctuelle approche de sa date limite »)
- **Description :** Les rappels push pour les tâches ONESHOT n'ont pas été implémentés en S6. Nécessiterait un champ `oneshotReminderSentAt` supplémentaire sur `LabeurTask`. Reporté en S10 (polish) pour éviter une 3ème migration prématurée.
- **Impact :** Fonctionnalité manquante en V1 partielle ; les rappels récurrents et les alertes inflation/malédiction sont complets.

### [S10] Rappels tâches ponctuelles (ONESHOT) — 3ème migration

- **Date :** 2026-04-14
- **Session :** S10
- **Type :** ajout (levée du report S6)
- **Référence spec :** §8.4
- **Description :** Implémentation des rappels push ONESHOT, reportés depuis S6. Ajout du champ `LabeurTask.oneshotReminderSentAt DateTime?`. Migration : `20260413131940_labeur_oneshot_reminder`. Logique ajoutée dans `cron.ts` (étape 4) : fenêtre configurable via `settings.oneshotReminderHours`, envoi unique par instance, marquage anti-doublon.
- **Impact :** 3ème migration Labeur. Fonctionnalité complète conforme à la spec.

### [S10] Page réglages à la place d'une modale

- **Date :** 2026-04-14
- **Session :** S10
- **Type :** deviation-plan
- **Référence spec :** §9 (configuration admin)
- **Description :** Le plan envisageait une modale pour les réglages Labeur. Implémenté en page dédiée `src/app/(dashboard)/labeur/reglages/page.tsx` pour cohérence avec les autres modules (Gamelle config, Parchemin préférences) et meilleure lisibilité des sliders.
- **Impact :** Aucun. La page est accessible via la `LabeurBottomNav`.

### [S10] Champ `gender` ajouté au profil utilisateur

- **Date :** 2026-04-14
- **Session :** S10
- **Type :** ajout
- **Référence spec :** §4 (titres d'honneur genrés)
- **Description :** La spécification prévoyait un champ `gender` sur `User` pour déterminer la forme du titre (Seigneur/Dame/Suzerain·e). Le champ était dans le schéma Prisma depuis S1 mais l'interface utilisateur manquait. Ajouté dans `ProfileModal.tsx` (onglet Profil, sélecteur 3 boutons) et dans `PATCH /api/user/profile` (lecture + validation + persistance).
- **Impact :** Les balances Labeur afficheront désormais le bon titre genré après mise à jour du profil.

### [S5] Typage `enrichItem` via `Prisma.LabeurMarketItemGetPayload`

- **Date :** 2026-04-13
- **Session :** S5
- **Type :** deviation-plan
- **Référence spec :** —
- **Description :** Le plan prévoyait une annotation manuelle du paramètre `item` dans la fonction `enrichItem` de `market/route.ts`. TypeScript a rejeté le type manuel (champ `purchases` trop étroit). Corrigé en utilisant `Prisma.LabeurMarketItemGetPayload<{ include: typeof MARKET_INCLUDE }>` pour inférer le type directement depuis le schéma Prisma.
- **Impact :** Aucun impact fonctionnel. Le type est plus précis et plus robuste aux évolutions du schéma.
