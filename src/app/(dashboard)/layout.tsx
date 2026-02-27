import { type ReactNode, type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
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
  )
}