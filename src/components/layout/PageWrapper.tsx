import { type ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
}

// PageWrapper encapsule le contenu de chaque page
// Il gère le padding et compense la sidebar (240px) et le header (64px)
export function PageWrapper({ children }: PageWrapperProps): React.ReactElement {
  return (
    <main
      className="min-h-screen"
      style={{
        marginLeft: '240px',
        paddingTop: '64px',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div className="p-6">
        {children}
      </div>
    </main>
  )
}