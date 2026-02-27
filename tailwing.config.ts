import type { Config } from 'tailwindcss'

const config: Config = {
  // Next.js App Router : les composants sont dans src/
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],

  // On désactive les couleurs par défaut de Tailwind pour éviter
  // toute tentation d'utiliser bg-gray-100 etc. dans les composants.
  // Seuls layout, spacing, typography size restent disponibles.
  theme: {
    extend: {
      // Les couleurs passent exclusivement par des variables CSS — aucune ici
      fontFamily: {
        // On déclare les familles pour pouvoir les utiliser via Tailwind si besoin
        // mais leur valeur réelle est contrôlée par les variables CSS des thèmes
        display: ['var(--font-display)', 'sans-serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
    },
    // On garde uniquement les utilitaires non-couleur de Tailwind
    // colors est vidé pour forcer l'usage des variables CSS
    colors: {},
  },

  plugins: [],
}

export default config