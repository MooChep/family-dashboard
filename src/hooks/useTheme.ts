'use client'

import { useThemeContext } from '@/components/layout/ThemeProvider'
import { type ThemeContextValue } from '@/types/theme'

// Hook public exposé aux composants pour lire et changer le thème.
// Encapsule useThemeContext pour ne pas exposer l'implémentation interne
// du contexte directement dans les composants consommateurs.
//
// Usage :
//   const { theme, setTheme, themes, isLoading } = useTheme()
export function useTheme(): ThemeContextValue {
  return useThemeContext()
}