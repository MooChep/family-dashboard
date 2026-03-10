*'use client'

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

export function Header(): void {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const breadcrumb = buildBreadcrumb(pathname)
  const pageTitle = getPageTitle(pathname)
  const today = formatDate(new Date())

  async function handleThemeToggle(): Promise<void> {
    const newTheme: ThemeName = theme === 'dark' ? 'light' : 'dark'
    await setTheme(newTheme)
  }
}