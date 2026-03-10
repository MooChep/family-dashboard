import { type ReactNode, type ReactElement } from 'react'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export default function AuthLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider initialTheme="dark"> 
      {/* On ajoute h-full et bg-[var(--bg)] pour forcer le fond du thème 
          même sur la page de login/register 
      */}
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
        {children}
      </div>
    </ThemeProvider>
  )
}