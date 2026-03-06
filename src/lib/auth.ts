import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  // On utilise JWT pour les sessions car Credentials Provider
  // n'est pas compatible avec les sessions BDD de NextAuth
  session: {
    strategy: 'jwt',
    // Durée de vie de la session : 30 jours
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    // Page de connexion personnalisée
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis')
        }

        // Recherche de l'utilisateur avec sa config
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            config: {
              include: {
                theme: true,
              },
            },
          },
        })

        if (!user) {
          throw new Error('Identifiants invalides')
        }

        // compare() vérifie le mot de passe en clair contre le hash bcrypt stocké
        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Identifiants invalides')
        }

        // preferences est stocké en BDD comme string JSON — on le parse avant usage
        const parsePreferences = (raw: unknown): Record<string, unknown> => {
          if (!raw) return {}
          try { return typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>) }
          catch { return {} }
        }

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
        }
      },
    }),
  ],

  callbacks: {
    // jwt() est appelé à la création du token et à chaque rafraîchissement
    async jwt({ token, user }) {
      // "user" n'est présent que lors de la connexion initiale
      if (user) {
        token.id = user.id
        token.config = user.config
      }
      return token
    },

    // session() est appelé à chaque fois que la session est lue
    // Il construit l'objet session à partir du token JWT
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.config = token.config ?? {
          theme: 'dark',
          preferences: {},
        }
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}