import type { Metadata } from 'next'
import { Syne, DM_Mono, Playfair_Display, DM_Sans } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import '@/styles/globals.css'

// Chargement des fonts via next/font/google
// next/font optimise automatiquement : pas de requête réseau au runtime,
// les fonts sont téléchargées au build et servies en local
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

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html
      lang="fr"
      // data-theme sera écrasé par ThemeProvider au montage
      // on met dark en défaut pour éviter le flash blanc
      data-theme="dark"
      suppressHydrationWarning
      className={`${syne.variable} ${dmMono.variable} ${playfairDisplay.variable} ${dmSans.variable}`}
    >
      <head />
      <body>
        <SessionProvider>
          <ThemeProvider initialTheme="dark">
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex flex-col flex-1" style={{ marginLeft: '240px' }}>
                <Header />
                <PageWrapper>
                  {children}
                </PageWrapper>
              </div>
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}