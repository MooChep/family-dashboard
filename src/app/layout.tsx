import type { Metadata } from 'next'
import { Syne, DM_Mono, Playfair_Display, DM_Sans } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import '../styles/globals.css'
import '@/styles/themes.css'
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Family Dashboard',
    template: '%s — Family Dashboard',
  },
  description: 'Tableau de bord familial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html
      lang="fr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${syne.variable} ${dmMono.variable} ${playfairDisplay.variable} ${dmSans.variable}`}
    >
      <head />
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}