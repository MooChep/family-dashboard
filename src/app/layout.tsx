import { type ReactNode } from 'react'
import '@/styles/globals.css'
import '@/styles/themes.css'
import {SessionProvider} from '@/components/providers/SessionProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}