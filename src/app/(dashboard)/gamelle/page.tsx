import Link from 'next/link'
import { ChefHat, ShoppingCart, CalendarDays, Archive, ChevronRight, Sparkles, BarChart2, RefreshCw } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatQuantity } from '@/lib/gamelle/units'
import { SuggestionsPanel } from '@/components/gamelle/suggestions/SuggestionsPanel'
import { MenuCarousel } from '@/components/gamelle/MenuCarousel'
import type { CarouselDay, CarouselFloating } from '@/components/gamelle/MenuCarousel'
import { RecommendationsWidget } from '@/components/gamelle/RecommendationsWidget'

export const metadata = { title: 'Gamelle' }

function unitForBase(base: string): string {
  if (base === 'GRAM')       return 'g'
  if (base === 'MILLILITER') return 'ml'
  return ''
}

/**
 * Page d'accueil Gamelle.
 * Widgets : Menu (scroll 11j), Courses (liste active), Pantry Health (top stock).
 */
export default async function GamellePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const now     = new Date()
  const fromDate = new Date(now)
  fromDate.setDate(now.getDate() - 3)
  fromDate.setHours(0, 0, 0, 0)
  const toDate  = new Date(now)
  toDate.setDate(now.getDate() + 7)
  toDate.setHours(23, 59, 59, 999)

  const [allSlots, shoppingList, inventory] = await Promise.all([
    prisma.planningSlot.findMany({
      where: {
        OR: [
          { type: 'DATED', scheduledDate: { gte: fromDate, lte: toDate } },
          { type: 'FLOATING' },
        ],
      },
      include: { recipe: { select: { id: true, title: true, imageLocal: true, preparationTime: true, cookingTime: true } } },
      orderBy: [{ scheduledDate: 'asc' }, { period: 'asc' }],
    }),
    prisma.shoppingList.findFirst({
      where:   { status: { not: 'ARCHIVED' } },
      orderBy: { generatedAt: 'desc' },
      include: { _count: { select: { items: { where: { purchased: false, skipped: false } } } } },
    }),
    prisma.inventory.findMany({
      orderBy: { quantity: 'desc' },
      take:    10,
      include: { reference: { select: { name: true, baseUnit: true } } },
    }),
  ])

  const activeSlots = allSlots.filter(s => s.portionsConsumed < s.portions)
  const dated       = activeSlots.filter(s => s.type === 'DATED')
  const floatingSlots = activeSlots.filter(s => s.type === 'FLOATING')

  // Construire les 11 jours (J-3 → J+7) pour le carousel
  const carouselDays: CarouselDay[] = []
  for (let i = -3; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    d.setHours(0, 0, 0, 0)

    const lunchSlot  = dated.find(s => s.scheduledDate && new Date(s.scheduledDate).toDateString() === d.toDateString() && s.period === 'LUNCH')
    const dinnerSlot = dated.find(s => s.scheduledDate && new Date(s.scheduledDate).toDateString() === d.toDateString() && s.period === 'DINNER')

    carouselDays.push({
      isoDate: d.toISOString(),
      isToday: d.toDateString() === now.toDateString(),
      lunch:   lunchSlot  ? { id: lunchSlot.id,  recipeTitle: lunchSlot.recipe.title,  recipeImage: lunchSlot.recipe.imageLocal }  : null,
      dinner:  dinnerSlot ? { id: dinnerSlot.id, recipeTitle: dinnerSlot.recipe.title, recipeImage: dinnerSlot.recipe.imageLocal } : null,
    })
  }

  const floatingCarousel: CarouselFloating[] = floatingSlots.map(s => ({ id: s.id, recipeTitle: s.recipe.title }))

  const pendingItems = shoppingList?._count.items ?? 0
  const isShoppingActive = shoppingList?.status === 'ACTIVE'

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <ChefHat size={18} style={{ color: '#fff' }} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-xl font-semibold leading-none" style={{ color: 'var(--text)' }}>
            La Gamelle
          </h1>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Recettes · Menu · Courses · Stock
          </p>
        </div>
        <Link href="/gamelle/stats" className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
          <BarChart2 size={18} />
        </Link>
      </div>

      {/* ── Widget Courses ──────────────────────────────────────────────────── */}
      <section className="px-4 mb-4">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart size={14} style={{ color: 'var(--accent)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Courses
              </span>
            </div>
            <Link href="/gamelle/courses">
              <ChevronRight size={14} style={{ color: 'var(--border2)' }} />
            </Link>
          </div>

          {shoppingList ? (
            <div className="px-4 pb-3">
              {isShoppingActive && pendingItems > 0 ? (
                <>
                  <p className="font-display text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    Liste en cours
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface2)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width:      `${Math.round(((shoppingList._count.items) / Math.max(shoppingList._count.items + pendingItems, 1)) * 100)}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                      {pendingItems} restant{pendingItems > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href="/gamelle/courses"
                    className="inline-block mt-2 font-mono text-xs"
                    style={{ color: 'var(--accent)' }}
                  >
                    Continuer →
                  </Link>
                </>
              ) : (
                <p className="font-body text-sm pb-1" style={{ color: 'var(--muted)' }}>
                  {pendingItems === 0 && isShoppingActive ? 'Liste complète ✓' : 'Liste générée'}
                </p>
              )}
            </div>
          ) : (
            <div className="px-4 pb-3">
              <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>Aucune liste active</p>
              <Link
                href="/gamelle/courses"
                className="inline-block mt-1 font-mono text-xs"
                style={{ color: 'var(--accent)' }}
              >
                Faire les courses →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Widget Menu (scroll horizontal 11j) ─────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Le Menu
            </span>
          </div>
          <Link href="/gamelle/menu" className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
            Voir tout →
          </Link>
        </div>

        <MenuCarousel days={carouselDays} floating={floatingCarousel} />
      </section>

      {/* ── Widget Suggestions anti-gaspillage ──────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              À cuisiner
            </span>
          </div>
        </div>
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <SuggestionsPanel limit={3} />
        </div>
      </section>

      {/* ── Widget Pantry Health ─────────────────────────────────────────────── */}
      {inventory.filter(i => i.quantity > 0).length > 0 && (
        <section className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Archive size={14} style={{ color: 'var(--accent)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Pantry
              </span>
            </div>
            <Link href="/gamelle/stock" className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
              Inventaire →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {inventory.filter(i => i.quantity > 0).map(item => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span className="font-body text-xs" style={{ color: 'var(--text)' }}>
                  {item.reference.name}
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  {formatQuantity(item.quantity, unitForBase(item.reference.baseUnit))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Widget À redécouvrir ─────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              À redécouvrir
            </span>
          </div>
          <Link href="/gamelle/recettes" className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>
            Voir tout →
          </Link>
        </div>
        <RecommendationsWidget limit={6} />
      </section>
    </div>
  )
}
