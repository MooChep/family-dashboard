import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// [...nextauth] = route dynamique qui capture tous les chemins sous /api/auth/
// NextAuth gère automatiquement : /api/auth/signin, /api/auth/signout,
// /api/auth/session, /api/auth/callback/credentials, etc.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }