import { type ReactNode, type ReactElement } from 'react'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { SessionProvider } from '@/components/providers/SessionProvider'

export default function AuthLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <SessionProvider>
      <ThemeProvider initialTheme="dark">
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
          {children}
        </div>
      </ThemeProvider>
    </SessionProvider>
  )
}