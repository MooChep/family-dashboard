import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const getName = (flag: string): string | undefined =>
    args.indexOf(flag) !== -1 ? args[args.indexOf(flag) + 1] : undefined;

  const name     = getName('--name')     || process.env.SEED_USER_NAME;
  const email    = getName('--email')    || process.env.SEED_USER_EMAIL;
  const password = getName('--password') || process.env.SEED_USER_PASSWORD;

  if (!name || !email || !password) {
    console.error('❌ Erreur : Paramètres manquants (CLI ou .env)');
    process.exit(1);
  }

  // 1. RÉCUPÉRATION D'UN THÈME VALIDE (Crucial pour éviter l'erreur P2003)
  // On cherche 'light', sinon on prend le premier disponible
  const theme = await prisma.theme.findFirst({
    where: { name: 'light' }
  }) || await prisma.theme.findFirst();

  if (!theme) {
    console.error("❌ Erreur : Aucun thème trouvé en base. Lancez 'npm run prisma:seed' d'abord.");
    process.exit(1);
  }

  // 2. Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { config: true }
  });

  if (existingUser) {
    console.log(`ℹ️ L'utilisateur ${email} existe déjà. Vérification de la config...`);
    
    if (!existingUser.config) {
      await prisma.userConfig.create({
        data: {
          userId: existingUser.id,
          themeId: theme.id, // Utilisation de l'ID dynamique
          preferences: JSON.stringify({}),
        }
      });
      console.log(`✅ Configuration par défaut créée pour l'utilisateur existant.`);
    } else {
      console.log(`✅ Configuration déjà présente.`);
    }
    return;
  }

  // 3. Création de l'utilisateur d'abord
  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  console.log(`✅ Utilisateur créé (ID: ${newUser.id}). Création de la config...`);

  // 4. Création de la config séparément
  try {
    await prisma.userConfig.create({
      data: {
        userId: newUser.id,
        themeId: theme.id, // L'ID f7617f18...
        preferences: JSON.stringify({}),
      },
    });
    console.log(`🚀 Configuration liée avec succès !`);
  } catch (configError) {
    console.error("❌ Erreur lors de la création de UserConfig :", configError);
    // Optionnel : supprimer l'user si la config échoue pour rester propre
    // await prisma.user.delete({ where: { id: newUser.id } });
  }
}