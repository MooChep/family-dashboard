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
  /** Nom du thème actuellement actif (persisté en BDD) */
  theme: string
  /** Prévisualise un thème localement sans persister en BDD */
  previewTheme: (name: string) => void
  /** Applique un thème ET persiste en BDD — à appeler à la confirmation */
  setTheme: (name: string) => Promise<void>
  /** Supprime un thème custom */
  deleteTheme: (name: string) => Promise<void>
  /** Recharge la liste des thèmes depuis la BDD (après création) */
  reloadThemes: () => Promise<void>
  /** Liste des thèmes disponibles */
  themes: Theme[]
  /** True pendant le chargement initial */
  isLoading: boolean
}