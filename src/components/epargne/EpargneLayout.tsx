'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, BarChart3, Scale, Settings } from 'lucide-react'

const TABS = [
  { label: 'Dashboard', href: '/epargne', icon: LayoutDashboard },
  { label: 'Mois',      href: '/epargne/mois', icon: Calendar },
  { label: 'Analyses',  href: '/epargne/analyses', icon: BarChart3 },
  { label: 'Régul',     href: '/epargne/regul', icon: Scale },
  { label: 'Gestion',   href: '/epargne/gestion', icon: Settings },
]

export function EpargneLayout({ children, stickySubHeader, periodPicker }: { children: ReactNode, stickySubHeader?: ReactNode, periodPicker?: ReactNode }): ReactElement {
  const pathname = usePathname()
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabsHeight, setTabsHeight] = useState(0)

  useEffect(() => {
    const updateHeight = () => {
      if (tabsRef.current && window.innerWidth >= 768) {
        setTabsHeight(tabsRef.current.offsetHeight)
      } else {
        setTabsHeight(0)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <div className="min-h-screen bg-(--bg) flex flex-col">
      
      {/* --- BARRE 1 : Desktop Uniquement --- */}
      <div 
        ref={tabsRef}
        className="hidden md:block sticky top-0 z-50 w-full border-b border-(--border) bg-(--bg)]"
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4 bg-(--bg)">
          <div className="flex gap-1 p-1 rounded-xl bg-(--surface) border border-(--border)]">
{TABS.map((tab) => {
  const isActive = tab.href === '/epargne' ? pathname === tab.href : pathname.startsWith(tab.href)
  return (
    <Link 
      key={tab.href} 
      href={tab.href} 
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap',
        isActive 
          ? 'bg-(--accent) text-(--surface) shadow-sm' 
          : 'text-(--text2) hover:bg-(--surface2) hover:text-(--text)]'
      )}
    >
      {/* L'icône héritera de la couleur du texte grâce à sa classe par défaut ou currentColor */}
      <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
      
          <span style={{ color: isActive ? 'var(--surface)' : 'inherit' }}>
            {tab.label}
          </span>
    </Link>
  )
})}
          </div>
          {periodPicker && <div className="hidden lg:block">{periodPicker}</div>}
        </nav>
      </div>

      {/* --- BARRE 2 : SubHeader (Top 0 Mobile / Sous Barre 1 Desktop) --- */}
      {(stickySubHeader || periodPicker) && (
        <aside
          className="sticky z-40 w-full border-b border-(--border) bg-(--bg)]"
          style={{ top: `${tabsHeight}px` }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-(--bg)">
            {stickySubHeader && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {stickySubHeader}
              </div>
            )}
            {periodPicker && (
              <div className={cn("shrink-0", stickySubHeader ? "lg:hidden" : "block")}>
                {periodPicker}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* --- CONTENU --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 pt-2 md:pt-6 md:p-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* --- BOTTOM NAV : Mobile Uniquement --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-(--surface) border-t border-(--border) px-2 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {TABS.map((tab) => {
            const isActive = tab.href === '/epargne' ? pathname === tab.href : pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href} className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 transition-colors",
                // Mobile : l'icône et le texte prennent la couleur accent si actif
                isActive ? "text-(--accent)]" : "text-(--text2)]"
              )}>
                <tab.icon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}