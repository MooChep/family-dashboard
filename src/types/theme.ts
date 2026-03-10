// ThemeName : 'light' = fallback système, les custom sont des strings libres
export type ThemeName = 'light' | (string & Record<never, never>)

// Structure d'un thème tel que stocké en BDD (table Theme)
export interface Theme {
  id: string
  name: string
  label: string
  isDefault: boolean
  cssVars: string | null   // JSON stringifié des variables CSS
  createdBy: string | null // null = thème système
  createdAt: Date
}

// Variables CSS d'un thème (parsées depuis cssVars)
export type ThemeCssVars = Record<string, string>

// Structure du contexte exposé par ThemeProvider
export interface ThemeContextValue {
  /** Nom du thème actuellement actif */
  theme: string
  /** Change le thème, applique les vars CSS et persiste en BDD */
  setTheme: (name: string) => Promise<void>
  /** Supprime un thème custom (désactivé côté UI pour l'instant) */
  deleteTheme: (name: string) => Promise<void>
  /** Liste des thèmes disponibles chargés depuis la BDD */
  themes: Theme[]
  /** True pendant le chargement initial */
  isLoading: boolean
}