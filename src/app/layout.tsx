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

  if (!session) {
    redirect('/auth/login')
  }

  const initialTheme = (session.user.config?.theme ?? 'dark') as ThemeName

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className="flex min-h-screen bg-(--bg)">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <PageWrapper>
            {children}
          </PageWrapper>
          <BottomNav />
        </div>
      </div>
    </ThemeProvider>
  )
}