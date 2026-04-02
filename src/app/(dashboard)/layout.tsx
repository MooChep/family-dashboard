import { type ReactNode, type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { BottomNav } from '@/components/layout/BottomNav'
import { ParcheminBottomNav } from '@/components/layout/ParcheminBottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Sidebar desktop uniquement */}
        <Sidebar />
        {/* Header mobile uniquement */}
        <MobileHeader />
        <div className="flex flex-col flex-1 min-w-0 relative">
          {/* Repousse le contenu sous le header mobile fixe */}
          <div
            className="md:hidden shrink-0"
            style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }}
          />
          <PageWrapper>
            {children}
          </PageWrapper>
          <BottomNav />
          <ParcheminBottomNav />
        </div>
      </div>
    </ThemeProvider>
  )
}