import { type ReactNode, type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { BottomNav } from '@/components/layout/BottomNav'
import { type ThemeName } from '@/types/theme'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  // Si pas de session, on redirige vers le login
  // Comme ce layout est isolé dans (dashboard), ça ne boucle pas
  if (!session) {
    redirect('/auth/login')
  }

  // Utilisation de l'optional chaining pour éviter le crash "null reading user"
  const initialTheme = (session?.user?.config?.theme ?? 'dark') as ThemeName

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className="flex min-h-screen bg-(--bg)">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 relative">
          <PageWrapper>
            {children}
          </PageWrapper>
          <BottomNav />
        </div>
      </div>
    </ThemeProvider>
  )
}