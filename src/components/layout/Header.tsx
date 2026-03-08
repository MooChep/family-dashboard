'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { capitalize, formatDate } from '@/lib/utils'
import { type ThemeName } from '@/types/theme'

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
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-4 md:px-6 py-4 h-16 bg-[var(--bg)] border-b border-[var(--border)] left-0 md:left-60"
    >
      {/* ─── Breadcrumb + Titre ────────────────────────────────────────── */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="hidden sm:flex items-center gap-2">
          {breadcrumb.map((segment, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-[10px] text-[var(--muted)]">/</span>}
              <span className="text-[10px] font-[var(--font-mono)]" 
                style={{ color: index === breadcrumb.length - 1 ? 'var(--text2)' : 'var(--muted)' }}>
                {segment.toLowerCase()}
              </span>
            </span>
          ))}
        </div>
        <h1 className="text-base md:text-lg font-semibold leading-tight truncate text-[var(--text)] font-[var(--font-display)]">
          {pageTitle}
        </h1>
      </div>

      {/* ─── Date (Desktop) + Toggle thème ─────────────────────────────── */}
      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <span className="hidden lg:block text-sm text-[var(--muted)] font-[var(--font-mono)]">
          {today}
        </span>

        <button
          onClick={handleThemeToggle}
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg text-sm transition-colors bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label={`Passer au thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
        >
          <span>{theme === 'dark' ? '○' : '●'}</span>
          <span className="font-[var(--font-mono)] text-[10px] md:text-[12px]">
            {theme === 'dark' ? 'light' : 'dark'}
          </span>
        </button>
      </div>
    </header>
  )
}