import { type ReactNode, type ReactElement } from 'react'

/**
 * Layout des pages non-authentifiées (login, register).
 * Le thème fallback `light` est appliqué directement via `data-theme`
 * sans ThemeProvider ni fetch API — pas de flash, pas de JS nécessaire.
 */
export default function AuthLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      data-theme="light"
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {children}
    </div>
  )
}