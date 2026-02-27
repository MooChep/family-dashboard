// Noms des thèmes disponibles — à étendre lors de l'ajout de nouveaux thèmes
export type ThemeName = 'dark' | 'light'

// Structure d'un thème tel que stocké en BDD (table Theme)
export interface Theme {
  id: string
  name: ThemeName
  label: string
  isDefault: boolean
  createdAt: Date
}

// Structure du contexte exposé par ThemeProvider
export interface ThemeContextValue {
  // Thème actuellement actif
  theme: ThemeName
  // Change le thème et persiste en BDD via /api/user/config
  setTheme: (theme: ThemeName) => Promise<void>
  // Liste des thèmes disponibles chargés depuis la BDD
  themes: Theme[]
  // True pendant le chargement initial des thèmes
  isLoading: boolean
}