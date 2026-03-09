import { type ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps): React.ReactElement {
  return (
    <main
      className="min-h-screen bg-[var(--bg)] ml-0 md:ml-60 pb-20 md:pb-0"
    >
      <div className="p-4 md:p-6">
        {children}
      </div>
    </main>
  )
}