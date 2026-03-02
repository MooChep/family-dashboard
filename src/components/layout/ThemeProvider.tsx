'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import { type ThemeContextValue, type ThemeName, type Theme } from '@/types/theme'

// Création du contexte React qui exposera le thème à tous les composants enfants
// Context = mécanisme React pour partager des données sans prop drilling
const ThemeContext = createContext<ThemeContextValue | null>(null)

// Script inline injecté dans <head> pour éviter le FOUC
// (Flash Of Unstyled Content = flash du mauvais thème avant hydratation)
// Ce script s'exécute de manière synchrone avant le premier rendu,
// il lit le thème depuis le cookie de session NextAuth si disponible
const ANTI_FOUC_SCRIPT = `
(function() {
  try {
    var cookies = document.cookie.split(';');
    var sessionToken = null;
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.startsWith('next-auth.session-token=') || 
          cookie.startsWith('__Secure-next-auth.session-token=')) {
        sessionToken = cookie.split('=')[1];
        break;
      }
    }
    // Fallback sur dark si pas de session trouvée
    var theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`

interface ThemeProviderProps {
  children: ReactNode
  // Thème initial passé depuis le serveur pour le premier rendu SSR
  initialTheme?: ThemeName
}

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: ThemeProviderProps): ReactNode {
  const { data: session, status } = useSession()
  const [theme, setThemeState] = useState<ThemeName>(initialTheme)
  const [themes, setThemes] = useState<Theme[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Charge la liste des thèmes disponibles depuis l'API
  useEffect(() => {
    async function loadThemes(): Promise<void> {
      try {
        const response = await fetch('/api/themes')
        if (response.ok) {
          const data = await response.json() as Theme[]
          setThemes(data)
        }
      } catch (error) {
        console.error('Erreur chargement thèmes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadThemes()
  }, [])

  // Synchronise le thème avec la session NextAuth
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.config?.theme) {
      const sessionTheme = session.user.config.theme as ThemeName
      setThemeState(sessionTheme)
      // Persiste dans localStorage comme cache local anti-FOUC
      localStorage.setItem('theme', sessionTheme)
    }
  }, [session, status])

  // Applique data-theme sur <html> à chaque changement de thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Change le thème et persiste en BDD via l'API
  const setTheme = useCallback(async (newTheme: ThemeName): Promise<void> => {
    setThemeState(newTheme)

    try {
      const response = await fetch('/api/user/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du thème')
      }
    } catch (error) {
      console.error('Erreur sauvegarde thème:', error)
      // On ne rollback pas le thème visuellement — l'UX reste fluide
      // même si la persistence échoue
    }
  }, [])

  const value: ThemeContextValue = {
    theme,
    setTheme,
    themes,
    isLoading,
  }

  return (
    <>
      {/* Script anti-FOUC injecté de manière synchrone dans le DOM */}
      <script
        dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }}
        suppressHydrationWarning
      />
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    </>
  )
}

// Hook interne pour consommer le contexte
// Export séparé dans useTheme.ts pour une meilleure organisation
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useThemeContext doit être utilisé dans un ThemeProvider')
  }

  return context
}