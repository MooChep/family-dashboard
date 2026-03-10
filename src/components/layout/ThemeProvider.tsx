'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

type Theme = {
  name: string
  label: string
  cssVars: string | null
}

interface ThemeContextValue {
  theme: string
  setTheme: (name: string) => Promise<void>
  themes: Theme[]
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children, initialTheme = 'dark' }: { children: ReactNode, initialTheme?: string }) {
  const { data: session, status } = useSession()
  const [currentThemeName, setCurrentThemeName] = useState(initialTheme)
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Chargement des thèmes depuis l'API
  useEffect(() => {
    async function fetchThemes() {
      try {
        const res = await fetch('/api/themes')
        if (res.ok) {
          const data = await res.json()
          setThemes(data)
        }
      } catch (e) {
        console.error("Erreur chargement thèmes BDD:", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchThemes()
  }, [])

  // 2. Synchronisation avec la session utilisateur
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.config?.themeId) {
      setCurrentThemeName(session.user.config.themeId)
    }
  }, [session, status])

  // 3. Sauvegarde du thème
  const setTheme = useCallback(async (newTheme: string) => {
    setCurrentThemeName(newTheme)
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: newTheme }),
      })
    } catch (e) {
      console.error("Erreur sauvegarde thème:", e)
    }
  }, [])

  // 4. Génération du CSS dynamique
  const dynamicCSS = useMemo(() => {
    const activeTheme = themes.find(t => t.name === currentThemeName)
    
    // Fallback si l'API n'a pas encore répondu (évite l'écran noir)
    if (!activeTheme || !activeTheme.cssVars) {
      if (currentThemeName === 'dark') {
        return `:root { --bg: #0a0c12; --text: #e8e8f0; --accent: #6c63ff; }`
      }
      return ''
    }

    try {
      const vars = JSON.parse(activeTheme.cssVars)
      const cssString = Object.entries(vars)
        .map(([key, value]) => {
          const propName = key.startsWith('--') ? key : `--${key}`
          return `  ${propName}: ${value};`
        })
        .join('\n')
      
      return `:root {\n${cssString}\n}`
    } catch (e) {
      console.error("Erreur parsing cssVars:", e)
      return ''
    }
  }, [themes, currentThemeName])

  const value = useMemo(() => ({
    theme: currentThemeName,
    setTheme,
    themes,
    isLoading
  }), [currentThemeName, setTheme, themes, isLoading])

  return (
    <ThemeContext.Provider value={value}>
      {dynamicCSS && <style dangerouslySetInnerHTML={{ __html: dynamicCSS }} />}
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme hors provider")
  return ctx
}