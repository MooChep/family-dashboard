import { type ReactNode } from 'react'
import '@/styles/globals.css'
import '@/styles/themes.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  )
}