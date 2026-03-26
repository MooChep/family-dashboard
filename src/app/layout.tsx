import { type ReactNode } from 'react'
import '@/styles/globals.css'
import '@/styles/themes.css'
import {SessionProvider} from '@/components/providers/SessionProvider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // ... tes métadonnées existantes ...
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Family Dashboard',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
}

export const viewport = {
  themeColor: '#0f1117',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
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