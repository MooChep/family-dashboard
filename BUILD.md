Bonne idée. Voici le fichier — je le nomme `BUILD.md` à la racine du projet.
# Family Dashboard — Guide de démarrage

## Prérequis

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- openssl (disponible nativement sous Linux)

---

## 1. Installation initiale (première fois)

### Cloner et installer les dépendances
```bash
git clone <repo>
cd family-dashboard
npm install
```

### Créer le fichier d'environnement
```bash
cp .env.example .env
```

### Générer le NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Coller la valeur générée dans `.env` :
```
NEXTAUTH_SECRET=la_valeur_generee
```

---

## 2. Mode développement (sans Docker)

Dans ce mode, Next.js tourne en local avec hot reload.
La base de données MariaDB tourne elle dans Docker.

### Démarrer uniquement la base de données
```bash
docker compose up db -d
```
> `-d` = detached, le container tourne en arrière-plan

### Appliquer les migrations et seed
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### Créer le premier utilisateur
```bash
npm run create-user -- --name "User" --email "email@famille.fr" --password "userPassword"
```

### Lancer l'app en développement
```bash
npm run dev
```
L'app est accessible sur http://localhost:3000

---

## 3. Mode production (tout en Docker)

Dans ce mode, tout tourne dans des containers : app Next.js + MariaDB.

### Builder et démarrer tous les services
```bash
docker compose up --build -d
```

### Appliquer les migrations et seed (première fois uniquement)
```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
```
> `migrate deploy` applique les migrations existantes sans en créer de nouvelles.
> C'est la commande à utiliser en production, contrairement à `migrate dev`.

### Créer le premier utilisateur
```bash
docker compose exec app npm run create-user -- --name "Prénom" --email "email@famille.fr" --password "motdepasse"
```

### Arrêter les services
```bash
docker compose down
```
> Les données sont persistées dans le volume `db_data` — elles survivent à l'arrêt.

### Arrêter et supprimer les données (reset complet)
```bash
docker compose down -v
```
> `-v` supprime les volumes — toutes les données BDD sont perdues.

---

## 4. Commandes utiles

| Commande | Description |
|---|---|
| `npm run dev` | Lance Next.js en développement |
| `npm run build` | Compile l'app pour la production |
| `npm run prisma:migrate` | Crée et applique une nouvelle migration |
| `npm run prisma:seed` | Peuple la BDD avec les données initiales |
| `npm run create-user` | Crée un utilisateur manuellement |
| `npx prisma studio` | Interface web pour explorer la BDD |
| `docker compose up db -d` | Démarre uniquement la BDD |
| `docker compose logs -f app` | Suit les logs de l'app en temps réel |
| `docker compose logs -f db` | Suit les logs de la BDD en temps réel |

---

## 5. Accès à la base de données

La BDD est accessible depuis la machine hôte sur le port `3306`.
Tu peux t'y connecter avec DBeaver, TablePlus ou tout autre client SQL :

```
Host     : localhost
Port     : 3306
Database : family_dashboard
User     : user
Password : password
```

---

## 6. Ajouter un nouveau module (phases suivantes)

1. Créer le dossier `src/app/<module>/`
2. Ajouter `page.tsx`, `error.tsx`, `loading.tsx`
3. Ajouter le lien dans `src/components/layout/Sidebar.tsx`
4. Si besoin de nouvelles tables : modifier `prisma/schema.prisma` puis `npm run prisma:migrate`
```

---

Ce fichier est volontairement autonome — quelqu'un qui arrive sur le projet sans contexte peut suivre les étapes dans l'ordre sans se poser de questions.

Dis-moi quand tu es prêt pour l'étape 3.