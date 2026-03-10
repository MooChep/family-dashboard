/**
 * Re-export de useTheme depuis ThemeProvider.
 * Le hook et son état vivent dans ThemeProvider (source unique de vérité).
 * Ce fichier maintient la compatibilité avec tous les imports existants :
 *   import { useTheme } from '@/hooks/useTheme'
 */
export { useTheme } from '@/components/layout/ThemeProvider'