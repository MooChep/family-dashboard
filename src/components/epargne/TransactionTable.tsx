'use client'

import { useState, type ReactElement } from 'react'
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatAmount } from '@/lib/formatters'
import { type Transaction, type Category } from '@prisma/client'
import { cn } from '@/lib/utils'

type TransactionWithCategory = Transaction & { category: Category }

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  onEdit: (transaction: TransactionWithCategory) => void
  onDelete: (id: string) => void
  onTogglePointage: (id: string) => void
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as string[] } catch { return [] }
  }
  return []
}

function isIncome(tx: TransactionWithCategory): boolean {
  if (tx.category.type === 'INCOME') return true
  if (tx.category.type === 'PROJECT') return tx.amount > 0
  return false
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onTogglePointage,
}: TransactionTableProps): ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id)
    try { await onDelete(id) } finally { setDeletingId(null) }
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center bg-[var(--surface)] border border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">Aucune transaction ce mois</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
      <Table>
        <TableHead>
          <tr>
            <Th>Catégorie</Th>
            <Th className="hidden md:table-cell">Tags</Th>
            <Th align="right">Montant</Th>
            <Th align="center" className="hidden md:table-cell">Pointé</Th>
            <Th align="right">Actions</Th>
          </tr>
        </TableHead>
        <TableBody>
          {transactions.map((t) => {
            const tags = parseTags(t.tags)
            const income = isIncome(t)

            return (
              <Tr key={t.id}>
                <Td>
                  <Badge variant={income ? 'success' : 'default'}>
                    {t.category.name}
                  </Badge>
                </Td>
                <Td className="hidden md:table-cell">
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] font-[var(--font-mono)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--muted)] text-xs">—</span>
                  )}
                </Td>
                <Td align="right">
                  <span className={cn(
                    "font-[var(--font-mono)] text-sm transition-opacity",
                    income ? "text-[var(--success)]" : "text-[var(--text)]",
                    !t.pointed && "opacity-60"
                  )}>
                    {t.category.type === 'PROJECT' ? formatAmount(t.amount) : (income ? '+' : '-') + formatAmount(t.amount)}
                  </span>
                </Td>
                <Td align="center" className="hidden md:table-cell">
                  <button
                    onClick={() => onTogglePointage(t.id)}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors border",
                      t.pointed ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface2)] border-[var(--border)] text-transparent"
                    )}
                  >
                    ✓
                  </button>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1 md:gap-2">
                    {/* Sur mobile on peut utiliser des icônes ou du texte court si besoin */}
                    <Button variant="ghost" size="sm" className="h-8 px-2 md:px-3 text-xs" onClick={() => onEdit(t)}>
                      <span className="md:hidden">✎</span>
                      <span className="hidden md:inline">Modifier</span>
                    </Button>
                    <Button variant="danger" size="sm" className="h-8 px-2 md:px-3 text-xs" isLoading={deletingId === t.id} onClick={() => handleDelete(t.id)}>
                      <span className="md:hidden">✕</span>
                      <span className="hidden md:inline">Supprimer</span>
                    </Button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}