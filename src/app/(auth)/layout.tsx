import { type ReactNode, type ReactElement } from 'react'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <ThemeProvider initialTheme="dark">
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {children}
      </div>
    </ThemeProvider>
  )
}