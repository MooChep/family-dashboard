import { type ReactNode } from 'react'
import '@/styles/globals.css'
import '@/styles/themes.css'
import SessionProvider from '@/components/providers/SessionProvider' // Vérifie le chemin exact

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}