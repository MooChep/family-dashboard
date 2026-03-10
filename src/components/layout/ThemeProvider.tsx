'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import type { Theme, ThemeContextValue, ThemeCssVars } from '@/types/theme'

// ── Constante fallback ────────────────────────────────────────────────────────
const FALLBACK_THEME = 'light'

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null)

// ── Helpers DOM ───────────────────────────────────────────────────────────────

const CSS_VAR_KEYS = [
  '--bg', '--surface', '--surface2',
  '--border', '--border2',
  '--accent', '--accent-dim',
  '--text', '--text2',
  '--muted', '--muted2',
  '--success', '--warning', '--danger',
  '--font-display', '--font-body', '--font-mono',
]

/** Applique un thème sur <html> : data-theme + cssVars inline si thème custom */
function applyThemeToDOM(name: string, cssVars: ThemeCssVars | null): void {
  const root = document.documentElement
  for (const v of CSS_VAR_KEYS) root.style.removeProperty(v)
  root.setAttribute('data-theme', name)
  if (cssVars) {
    for (const [k, v] of Object.entries(cssVars)) {
      root.style.setProperty(k, v)
    }
  }
}

function parseCssVars(raw: string | null): ThemeCssVars | null {
  if (!raw) return null
  try { return JSON.parse(raw) as ThemeCssVars } catch { return null }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentThemeName, setCurrentThemeName] = useState<string>(FALLBACK_THEME)
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ── 1. Chargement initial : thèmes BDD + thème actif frais depuis /api/user/config
  //       On ne lit PAS session.user.config (JWT figé à la connexion)
  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const [themesRes, configRes] = await Promise.all([
          fetch('/api/themes'),
          fetch('/api/user/config'),
        ])

        const themesList: Theme[] = themesRes.ok
          ? await themesRes.json() as Theme[]
          : []

        setThemes(themesList)

        let activeThemeName = FALLBACK_THEME
        if (configRes.ok) {
          const config = await configRes.json() as { theme?: string }
          if (config.theme) activeThemeName = config.theme
        }

        setCurrentThemeName(activeThemeName)

        const themeData = themesList.find((t) => t.name === activeThemeName)
        applyThemeToDOM(
          themeData?.name ?? FALLBACK_THEME,
          parseCssVars(themeData?.cssVars ?? null)
        )
      } catch (e) {
        console.error('Erreur init thème:', e)
        applyThemeToDOM(FALLBACK_THEME, null)
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [])

  // ── 2. setTheme : applique visuellement + persiste en BDD ─────────────────
  const setTheme = useCallback(async (newTheme: string): Promise<void> => {
    const themeData = themes.find((t) => t.name === newTheme)
    applyThemeToDOM(
      themeData?.name ?? FALLBACK_THEME,
      parseCssVars(themeData?.cssVars ?? null)
    )
    setCurrentThemeName(newTheme)

    try {
      await fetch('/api/user/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch (e) {
      console.error('Erreur persistance thème:', e)
    }
  }, [themes])

  // ── 3. deleteTheme : supprime un thème custom ──────────────────────────────
  const deleteTheme = useCallback(async (name: string): Promise<void> => {
    const res = await fetch(`/api/themes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const e = await res.json() as { error: string }
      throw new Error(e.error)
    }
    setThemes((prev) => prev.filter((t) => t.name !== name))
    if (currentThemeName === name) {
      await setTheme(FALLBACK_THEME)
    }
  }, [currentThemeName, setTheme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme: currentThemeName,
    setTheme,
    deleteTheme,
    themes,
    isLoading,
  }), [currentThemeName, setTheme, deleteTheme, themes, isLoading])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider')
  return ctx
}