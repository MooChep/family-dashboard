import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  pages: {
    signIn: '/auth/login',
  },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },

      async authorize(credentials) {
        // Log de début de tentative
        console.log("DEBUG_AUTH: Tentative de connexion pour l'email :", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error("DEBUG_AUTH: Email ou mot de passe manquant dans la requête");
          throw new Error('Email et mot de passe requis');
        }

        try {
          // Recherche de l'utilisateur
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() }, // On nettoie l'email
            include: {
              config: {
                include: {
                  theme: true,
                },
              },
            },
          });

          if (!user) {
            console.warn("DEBUG_AUTH: Aucun utilisateur trouvé en BDD avec cet email");
            throw new Error('Identifiants invalides');
          }

          console.log("DEBUG_AUTH: Utilisateur trouvé, vérification du mot de passe...");

          // Comparaison du mot de passe
          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.warn("DEBUG_AUTH: Mot de passe incorrect pour cet utilisateur");
            // Note : On vérifie si le hash en BDD ressemble à un hash bcrypt valide
            if (!user.password.startsWith('$2')) {
              console.error("DEBUG_AUTH: Attention, le hash en BDD semble corrompu ou mal formaté :", user.password.substring(0, 10) + "...");
            }
            throw new Error('Identifiants invalides');
          }

          console.log("DEBUG_AUTH: Connexion réussie pour :", user.email);

          // Parsing des préférences JSON
          const parsePreferences = (raw: unknown): Record<string, unknown> => {
            if (!raw) return {};
            try { 
              return typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
            } catch (e) { 
              console.error("DEBUG_AUTH: Erreur lors du parse des préférences JSON", e);
              return {}; 
            }
          };

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            config: user.config
              ? {
                  theme: user.config.themeId,
                  preferences: parsePreferences(user.config.preferences),
                }
              : {
                  theme: 'dark',
                  preferences: {},
                },
          };
        } catch (error: any) {
          console.error("DEBUG_AUTH: Erreur critique dans authorize :", error.message);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.config = user.config;
      }
      return token;
    },

    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.config = token.config ?? {
          theme: 'dark',
          preferences: {},
        };
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};