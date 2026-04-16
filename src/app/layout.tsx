import { type ReactNode } from 'react'
import '@/styles/globals.css'
import '@/styles/themes.css'
import {SessionProvider} from '@/components/providers/SessionProvider'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fief',
  },
  icons: {
    icon: [
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icon1.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  other: {
    'apple-mobile-web-app-title': 'Fief',
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