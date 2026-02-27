import { DefaultSession } from 'next-auth'

// On étend le type Session par défaut de NextAuth
// pour inclure les données utilisateur nécessaires partout dans l'app.
// "Declaration merging" : TypeScript fusionne notre déclaration avec celle de NextAuth.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      config: {
        theme: string
        preferences: Record<string, unknown>
      }
    } & DefaultSession['user']
  }

  interface User {
    id: string
    name: string
    email: string
    config?: {
      theme: string
      preferences: Record<string, unknown>
    }
  }
}

declare module 'next-auth/jwt' {
  // On étend le type JWT pour stocker les données utilisateur dans le token
  // JWT = JSON Web Token, le token signé stocké dans le cookie de session
  interface JWT {
    id: string
    config?: {
      theme: string
      preferences: Record<string, unknown>
    }
  }
}

// Type exporté pour usage dans les composants
export interface ExtendedSession {
  user: {
    id: string
    name: string
    email: string
    config: {
      theme: string
      preferences: Record<string, unknown>
    }
  }
}