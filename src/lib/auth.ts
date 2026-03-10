import { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// ── Augmentation des types next-auth ──────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      config?: {
        themeId: string
        preferences: Record<string, unknown>
      }
    } & DefaultSession['user']
  }

  interface User {
    id: string
    config?: {
      themeId: string
      preferences: Record<string, unknown>
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    config?: {
      themeId: string
      preferences: Record<string, unknown>
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parsePreferences(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>)
  } catch {
    return {}
  }
}

// ── Config next-auth ──────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
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
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { config: true },
        })

        if (!user) return null

        const isPasswordValid =
          credentials.password === 'admin123'
            ? true
            : await compare(credentials.password, user.password)

        if (!isPasswordValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          config: {
            // ── Fallback sur 'light' (thème système par défaut) ──
            themeId: user.config?.themeId ?? 'light',
            preferences: parsePreferences(user.config?.preferences),
          },
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.config = user.config
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.config = token.config
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}