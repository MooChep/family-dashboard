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

> ⚠️ Si ton mot de passe contient des caractères spéciaux (ex: `&`, `@`, `!`),
> encode-les dans `DATABASE_URL` uniquement :
> - `&` → `%26`
> - `@` → `%40`
> - `!` → `%21`
> 
> Exemple : `mysql://user:motde%26passe@localhost:3306/family_dashboard`
> 
> Les autres variables (`MARIADB_PASSWORD` etc.) gardent le caractère brut.

---

## 2. Mode développement (sans Docker)

Dans ce mode, Next.js tourne en local avec hot reload.
La base de données MariaDB tourne dans Docker.

### Démarrer uniquement la base de données
```bash
docker compose up db -d
```
> `-d` = detached, le container tourne en arrière-plan

> Dans `.env`, `DATABASE_URL` doit pointer vers `localhost` (pas `db`)
> car `db` n'est résolu que dans le réseau Docker interne :
> ```
> DATABASE_URL="mysql://user:password@localhost:3306/family_dashboard"
> ```

### Donner les droits à l'utilisateur BDD (première fois uniquement)
```bash
docker compose exec db mariadb -u root -p
```
```sql
GRANT ALL PRIVILEGES ON *.* TO 'user'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```
> Remplace `user` par la valeur de `MARIADB_USER` dans ton `.env`.
> Ces droits sont nécessaires pour que Prisma puisse créer la shadow database
> lors des migrations.

### Appliquer les migrations et seed
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### Créer le premier utilisateur
```bash
npm run create-user -- --name "Prénom" --email "email@famille.fr" --password "motdepasse"
```

### Lancer l'app en développement
```bash
npm run dev
```
L'app est accessible sur http://localhost:3000

---

## 3. Mode production (tout en Docker)

Dans ce mode, tout tourne dans des containers : app Next.js + MariaDB.

> ⚠️ Dans `.env`, `DATABASE_URL` doit pointer vers `db` (pas `localhost`)
> car les deux services communiquent dans le réseau Docker interne :
> ```
> DATABASE_URL="mysql://user:password@db:3306/family_dashboard"
> ```

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
User     : <valeur de MARIADB_USER>
Password : <valeur de MARIADB_PASSWORD>
```

---

## 6. Points de configuration importants

### next.config.js
Next.js 14 ne supporte pas `next.config.ts` — utiliser obligatoirement `next.config.js` :
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = nextConfig
```

### postcss.config.js
Fichier obligatoire pour que Tailwind CSS fonctionne :
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Import CSS dans layout.tsx
Les fichiers CSS doivent être importés séparément — ne pas utiliser `@import` dans `globals.css` :
```tsx
import '@/styles/globals.css'
import '@/styles/themes.css'
```

---

## 7. Ajouter un nouveau module (phases suivantes)

1. Créer le dossier `src/app/(dashboard)/<module>/`
2. Ajouter `page.tsx`, `error.tsx`, `loading.tsx`
3. Ajouter le lien dans `src/components/layout/Sidebar.tsx`
4. Si besoin de nouvelles tables : modifier `prisma/schema.prisma` puis `npm run prisma:migrate`
```