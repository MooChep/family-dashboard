import Link from 'next/link'
import { BookOpen, CalendarDays, ShoppingCart, Archive, ChevronRight } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Gamelle' }

/**
 * Page d'accueil du module Gamelle.
 * Affiche un récapitulatif rapide + accès aux 4 sections.
 */
export default async function GamellePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const [recipeCount, allSlots, shoppingList] = await Promise.all([
    prisma.recipe.count(),
    // Prisma ne supporte pas la comparaison de deux colonnes dans where —
    // on filtre côté JS (nb de slots faible en pratique).
    prisma.planningSlot.findMany({ select: { portions: true, portionsConsumed: true } }),
    prisma.shoppingList.findFirst({
      orderBy: { generatedAt: 'desc' },
      include: { _count: { select: { items: { where: { purchased: false, skipped: false } } } } },
    }),
  ])
  const slotCount = allSlots.filter(s => s.portionsConsumed < s.portions).length

  const pendingItems = shoppingList?._count.items ?? 0

  const sections = [
    {
      href:    '/gamelle/recettes',
      icon:    BookOpen,
      label:   'Recettes',
      detail:  recipeCount > 0 ? `${recipeCount} recette${recipeCount > 1 ? 's' : ''}` : 'Bibliothèque vide',
      accent:  false,
    },
    {
      href:    '/gamelle/menu',
      icon:    CalendarDays,
      label:   'Menu',
      detail:  slotCount > 0 ? `${slotCount} recette${slotCount > 1 ? 's' : ''} au programme` : 'Panier vide',
      accent:  false,
    },
    {
      href:    '/gamelle/courses',
      icon:    ShoppingCart,
      label:   'Courses',
      detail:  shoppingList
        ? pendingItems > 0
          ? `${pendingItems} article${pendingItems > 1 ? 's' : ''} restant${pendingItems > 1 ? 's' : ''}`
          : 'Liste complète ✓'
        : 'Aucune liste',
      accent:  pendingItems > 0,
    },
    {
      href:    '/gamelle/stock',
      icon:    Archive,
      label:   'Stock',
      detail:  'Inventaire & rab',
      accent:  false,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Gamelle
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Recettes, menu & courses
        </p>
      </div>

      {/* Raccourcis sections */}
      <div className="flex flex-col gap-2 px-4">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 px-4 py-4 rounded-2xl"
              style={{
                background: 'var(--surface)',
                border:     '1px solid var(--border)',
              }}
            >
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: section.accent ? 'var(--accent)' : 'var(--surface2)',
                }}
              >
                <Icon
                  size={18}
                  style={{ color: section.accent ? '#fff' : 'var(--text2)' }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {section.label}
                </p>
                <p className="font-mono text-xs mt-0.5 truncate" style={{ color: section.accent ? 'var(--accent)' : 'var(--muted)' }}>
                  {section.detail}
                </p>
              </div>

              <ChevronRight size={16} style={{ color: 'var(--border2)', flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
