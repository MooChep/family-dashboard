import { type ReactNode, type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { BottomNav } from '@/components/layout/BottomNav'
import { type ThemeName } from '@/types/theme'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  // Toutes les pages sous (dashboard) sont protégées
  if (!session) {
    redirect('/auth/login')
  }

  const initialTheme = (session.user.config?.theme ?? 'dark') as ThemeName

  return (
    <ThemeProvider initialTheme={initialTheme}>
      {/* flex : active le mode Flexbox pour aligner Sidebar et Contenu
          min-h-screen : occupe toute la hauteur de l'écran
          bg-[var(--bg)] : utilise ta variable CSS de fond
      */}
      <div className="flex min-h-screen bg-[var(--bg)]">
        {/* Masquée sur mobile, visible dès 'md' (768px) */}
        <Sidebar />
        
        {/* flex-1 : prend tout l'espace restant à côté de la sidebar
            min-w-0 : évite que le contenu ne dépasse du viewport (essentiel pour les tableaux)
            relative : permet de positionner des éléments par rapport à ce conteneur
        */}
        <div className="flex flex-col flex-1 min-w-0 relative">
          <Header />
          
          {/* Le PageWrapper gère désormais lui-même ses marges internes et le décalage Header */}
          <PageWrapper>
            {children}
          </PageWrapper>

          {/* Navigation basse : visible sur mobile, masquée sur desktop */}
          <BottomNav />
        </div>
      </div>
    </ThemeProvider>
  )
}