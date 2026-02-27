'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { capitalize, formatDate } from '@/lib/utils'
import { type ThemeName } from '@/types/theme'

// Construit le breadcrumb depuis le pathname
// ex: "/epargne" → ["Dashboard", "Épargne"]
function buildBreadcrumb(pathname: string): string[] {
  const LABELS: Record<string, string> = {
    '':         'Dashboard',
    'epargne':  'Épargne',
    'menage':   'Ménage',
    'projets':  'Projets',
    'habitudes':'Habitudes',
    'notes':    'Notes',
  }

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return ['Dashboard']

  return ['Dashboard', ...segments.map((s) => LABELS[s] ?? capitalize(s))]
}

// Titre de la page depuis le dernier segment du pathname
function getPageTitle(pathname: string): string {
  const TITLES: Record<string, string> = {
    '/':          'Dashboard',
    '/epargne':   'Épargne',
    '/menage':    'Ménage',
    '/projets':   'Projets',
    '/habitudes': 'Habitudes',
    '/notes':     'Notes',
  }

  return TITLES[pathname] ?? capitalize(pathname.split('/').filter(Boolean).pop() ?? '')
}

export function Header(): React.ReactElement {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const breadcrumb = buildBreadcrumb(pathname)
  const pageTitle = getPageTitle(pathname)
  const today = formatDate(new Date())

  async function handleThemeToggle(): Promise<void> {
    const newTheme: ThemeName = theme === 'dark' ? 'light' : 'dark'
    await setTheme(newTheme)
  }

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-6 py-4"
      style={{
        left: '240px', // largeur de la sidebar
        backgroundColor: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        height: '64px',
      }}
    >
      {/* ─── Breadcrumb + Titre ────────────────────────────────────────── */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          {breadcrumb.map((segment, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  /
                </span>
              )}
              <span
                className="text-xs"
                style={{
                  color: index === breadcrumb.length - 1
                    ? 'var(--text2)'
                    : 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {segment.toLowerCase()}
              </span>
            </span>
          ))}
        </div>
        <h1
          className="text-lg font-semibold leading-tight"
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {pageTitle}
        </h1>
      </div>

      {/* ─── Date + Toggle thème ──────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <span
          className="text-sm"
          style={{
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {today}
        </span>

        {/* Toggle dark / light */}
        <button
          onClick={handleThemeToggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text2)'
          }}
          aria-label={`Passer au thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
        >
          <span>{theme === 'dark' ? '○' : '●'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {theme === 'dark' ? 'light' : 'dark'}
          </span>
        </button>
      </div>
    </header>
  )
}