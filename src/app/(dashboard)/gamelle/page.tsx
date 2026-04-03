import Link from 'next/link'
import { ChefHat, ShoppingCart, CalendarDays, Archive, ChevronRight } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatQuantity } from '@/lib/gamelle/units'

export const metadata = { title: 'Gamelle' }

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

function formatSlotDate(d: Date | null): string {
  if (!d) return ''
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

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
  const floating    = activeSlots.filter(s => s.type === 'FLOATING')

  // Construire les 11 jours (J-3 → J+7)
  const days: Date[] = []
  for (let i = -3; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }

  function getSlot(day: Date, period: 'LUNCH' | 'DINNER') {
    return dated.find(s =>
      s.scheduledDate &&
      new Date(s.scheduledDate).toDateString() === day.toDateString() &&
      s.period === period
    )
  }

  const pendingItems = shoppingList?._count.items ?? 0
  const isShoppingActive = shoppingList?.status === 'ACTIVE'

  return (
    <div className="flex flex-col min-h-screen pb-4" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <ChefHat size={18} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold leading-none" style={{ color: 'var(--text)' }}>
            La Gamelle
          </h1>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Recettes · Menu · Courses · Stock
          </p>
        </div>
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

        <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {days.map((day, i) => {
            const isToday = day.toDateString() === now.toDateString()
            const lunch   = getSlot(day, 'LUNCH')
            const dinner  = getSlot(day, 'DINNER')

            return (
              <div
                key={i}
                id={isToday ? 'today-card' : undefined}
                className="shrink-0 rounded-2xl overflow-hidden snap-start flex flex-col"
                style={{
                  width:      148,
                  background: isToday ? 'var(--accent-dim)' : 'var(--surface)',
                  border:     `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {/* Header jour */}
                <div
                  className="px-3 py-2"
                  style={{ borderBottom: '1px solid var(--border)', background: isToday ? 'var(--accent)' : 'var(--surface2)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: isToday ? '#fff' : 'var(--text2)' }}>
                    {formatSlotDate(day)}
                  </p>
                </div>

                {/* Slots */}
                <div className="flex flex-col gap-1.5 p-2 flex-1">
                  {(['LUNCH', 'DINNER'] as const).map(period => {
                    const slot  = period === 'LUNCH' ? lunch : dinner
                    const label = period === 'LUNCH' ? 'Midi' : 'Soir'
                    return (
                      <div key={period}>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted)' }}>
                          {label}
                        </p>
                        {slot ? (
                          <Link href="/gamelle/menu">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                                style={{ width: 20, height: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                              >
                                {slot.recipe.imageLocal ? (
                                  <img src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-display text-[8px] font-bold" style={{ color: 'var(--muted)' }}>
                                    {slot.recipe.title.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-body text-[10px] leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                                {slot.recipe.title}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <span className="font-body text-[10px]" style={{ color: 'var(--border2)' }}>— Libre</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Slots volants */}
          {floating.length > 0 && (
            <div
              className="shrink-0 rounded-2xl overflow-hidden snap-start flex flex-col"
              style={{ width: 148, background: 'var(--surface)', border: '1px dashed var(--accent)' }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-dim)' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--accent)' }}>
                  À cuisiner
                </p>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {floating.slice(0, 3).map(slot => (
                  <Link key={slot.id} href="/gamelle/menu">
                    <p className="font-body text-[10px] line-clamp-1" style={{ color: 'var(--accent)' }}>
                      〜 {slot.recipe.title}
                    </p>
                  </Link>
                ))}
                {floating.length > 3 && (
                  <p className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>
                    +{floating.length - 3} de plus
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Widget Pantry Health ─────────────────────────────────────────────── */}
      {inventory.length > 0 && (
        <section className="px-4">
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
            {inventory.map(item => (
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
    </div>
  )
}
