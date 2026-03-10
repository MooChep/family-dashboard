'use client'

import { useTheme } from '@/components/layout/ThemeProvider'
import { Badge } from '@/components/ui/Badge'

/** Affiche le label lisible du thème actif — se met à jour sans refresh */
export function ActiveThemeBadge() {
  const { theme, themes } = useTheme()
  const label = themes.find((t) => t.name === theme)?.label ?? theme
  return <Badge variant="accent">{label}</Badge>
}