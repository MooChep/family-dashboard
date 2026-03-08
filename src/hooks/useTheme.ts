'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ThemeName } from '@/types/theme'

interface ThemeData {
  name: string
  label: string
  cssVars: string | null
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>('dark')

  // Applique un thème : data-theme + cssVars custom si présents
  function applyTheme(name: string, cssVars: Record<string, string> | null): void {
    const root = document.documentElement
    root.setAttribute('data-theme', name)

    // Supprimer les vars custom précédentes
    const CUSTOM_VARS = [
      '--bg','--surface','--surface2','--border','--border2',
      '--accent','--accent-dim','--text','--text2','--muted','--muted2',
      '--success','--warning','--danger',
      '--font-display','--font-body','--font-mono',
    ]
    for (const v of CUSTOM_VARS) root.style.removeProperty(v)

    // Appliquer les nouvelles vars si thème custom
    if (cssVars) {
      for (const [k, v] of Object.entries(cssVars)) {
        root.style.setProperty(k, v)
      }
    }
  }

  const setTheme = useCallback(async (newTheme: string): Promise<void> => {
    // Fetch le thème depuis l'API pour récupérer cssVars
    const res = await fetch('/api/themes')
    const themes = await res.json() as ThemeData[]
    const themeData = themes.find((t) => t.name === newTheme)
    const cssVars = themeData?.cssVars ? JSON.parse(themeData.cssVars) as Record<string, string> : null

    applyTheme(newTheme, cssVars)
    setThemeState(newTheme as ThemeName)
    localStorage.setItem('theme', newTheme)

    // Persiste en BDD
    try {
      await fetch('/api/user/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: newTheme }),
      })
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    // Charge le thème initial
    async function initTheme(): Promise<void> {
      // 1. Récupère la préférence depuis l'API user config
      try {
        const configRes = await fetch('/api/user/config')
        if (configRes.ok) {
          const config = await configRes.json() as { themeId?: string }
          if (config.themeId) {
            const themesRes = await fetch('/api/themes')
            const themes = await themesRes.json() as ThemeData[]
            const themeData = themes.find((t) => t.name === config.themeId)
            const cssVars = themeData?.cssVars ? JSON.parse(themeData.cssVars) as Record<string, string> : null
            applyTheme(config.themeId, cssVars)
            setThemeState(config.themeId as ThemeName)
            return
          }
        }
      } catch { /* fallback */ }

      // 2. Fallback localStorage
      const saved = localStorage.getItem('theme') ?? 'dark'
      applyTheme(saved, null)
      setThemeState(saved as ThemeName)
    }
    void initTheme()
  }, [])

  return { theme, setTheme }
}