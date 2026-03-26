'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { ProfileModal } from '@/components/layout/ProfileModal'
import { CategoryNav } from '@/components/cerveau/CategoryNav'
import type { EntryType } from '@prisma/client'
import { PiggyBank, Brain, ChefHat, CalendarDays, LayoutDashboard, Settings2, LogOut} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode // Changé de string à ReactNode
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/',          icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { label: 'Épargne',   href: '/epargne',   icon: <PiggyBank size={18} strokeWidth={1.5} />, soon: false },
  { label: 'Cerveau',    href: '/cerveau',   icon: <Brain size={18} strokeWidth={1.5} />, soon: false },
  { label: 'Popote',    href: '/popote',    icon: <ChefHat size={18} strokeWidth={1.5} />, soon: true },
  { label: 'Calendrier',href: '/habitudes',icon: <CalendarDays size={18} strokeWidth={1.5} />, soon: true },
]

// ── CategoryNav section (needs useSearchParams → Suspense boundary) ────────

function SidebarCategorySection({ pathname }: { pathname: string }) {
  const searchParams   = useSearchParams()
  const activeCategory = (searchParams.get('cat') as EntryType | null) ?? 'ALL'

  if (!pathname.startsWith('/cerveau')) return null

  return (
    <div className="border-t border-(--border)">
      <CategoryNav
        active={activeCategory}
        layout="vertical"
      />
    </div>
  )
}

export function Sidebar(): React.ReactElement {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleSignOut(): Promise<void> {
    await signOut({ callbackUrl: '/auth/login' })
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 hidden md:flex flex-col z-40 bg-(--surface) border-r border-(--border)]"
    >
      {/* ─── Logo ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-(--border)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-(--accent) text-(--bg) font-(--font-mono)]">
          F
        </div>
        <span className="text-base font-semibold tracking-wide text-(--text) font-(--font-display)]">
          Family Dashboard
        </span>
      </div>

      {/* ─── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          if (item.soon) {
            return (
              <div key={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-not-allowed opacity-45">
                <div className="flex items-center gap-3">
                  <span className="w-5 flex justify-center text-(--muted)]">{item.icon}</span>
                  <span className="text-sm text-(--muted)]">{item.label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-(--surface2) text-(--muted2) font-(--font-mono) text-[10px]">
                  bientôt
                </span>
              </div>
            )
          }
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                active ? 'bg-(--accent-dim) text-(--accent)]' : 'text-(--text2) hover:bg-(--surface2)]'
              )}>
              <span className="w-5 flex justify-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {active && <div className="ml-auto w-1 h-4 rounded-full bg-(--accent)]" />}
            </Link>
          )
        })}
      </nav>

      {/* ─── CategoryNav (Cerveau routes only) ───────────────────────── */}
      <Suspense>
        <SidebarCategorySection pathname={pathname} />
      </Suspense>

      {/* ─── Utilisateur ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex flex-col gap-2 border-t border-(--border)]">
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left transition-colors hover:bg-(--surface2)]"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-(--accent-dim) text-(--accent) font-(--font-mono)]">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate text-(--text)]">
              {session?.user?.name ?? '—'}
            </span>
            <span className="text-xs truncate text-(--muted)]">
              {session?.user?.email ?? '—'}
            </span>
          </div>
          <span className="text-(--muted)]">
            <Settings2 size={14} />
          </span>
        </button>

        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left text-(--danger) hover:bg-(--accent-dim)]">
          <span className="w-5 flex justify-center">
            <LogOut size={18} strokeWidth={1.5} />
          </span>
          Déconnexion
        </button>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </aside>
  )
}