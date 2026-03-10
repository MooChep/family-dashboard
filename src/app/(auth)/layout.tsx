import { type ReactNode, type ReactElement } from 'react'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export default function AuthLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider initialTheme="dark"> 
      {/* On utilise une div qui prend TOUTE l'image et applique le fond du thème */}
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ 
          backgroundColor: 'var(--bg)', 
          color: 'var(--text)' 
        }}
      >
        {children}
      </div>
    </ThemeProvider>
  )
}