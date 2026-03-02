'use client'

import { useState, type ReactElement } from 'react'
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatAmount } from '@/lib/formatters'
import { type Transaction, type Category } from '@prisma/client'

type TransactionWithCategory = Transaction & { category: Category }

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  onEdit: (transaction: TransactionWithCategory) => void
  onDelete: (id: string) => void
  onTogglePointage: (id: string) => void
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
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucune transaction ce mois
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <Table>
        <TableHead>
          <tr>
            <Th>Catégorie</Th>
            <Th>Détail</Th>
            <Th align="right">Montant</Th>
            <Th align="center">Pointé</Th>
            <Th align="right">Actions</Th>
          </tr>
        </TableHead>
        <TableBody>
          {transactions.map((t) => (
            <Tr key={t.id}>
              <Td>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={t.category.type === 'INCOME' ? 'success' : 'default'}
                  >
                    {t.category.name}
                  </Badge>
                </div>
              </Td>
              <Td muted>{t.detail ?? '—'}</Td>
              <Td align="right">
                <span
                  style={{
                    color: t.category.type === 'INCOME'
                      ? 'var(--success)'
                      : 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    opacity: t.pointed ? 1 : 0.55,
                  }}
                >
                  {t.category.type === 'INCOME' ? '+' : '-'}
                  {formatAmount(t.amount)}
                </span>
              </Td>
              <Td align="center">
                <button
                  onClick={() => onTogglePointage(t.id)}
                  className="w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors"
                  style={{
                    backgroundColor: t.pointed
                      ? 'var(--accent)'
                      : 'var(--surface2)',
                    border: `1px solid ${t.pointed ? 'var(--accent)' : 'var(--border)'}`,
                    color: t.pointed ? 'var(--bg)' : 'transparent',
                  }}
                  aria-label={t.pointed ? 'Dépointer' : 'Pointer'}
                >
                  {t.pointed && '✓'}
                </button>
              </Td>
              <Td align="right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(t)}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deletingId === t.id}
                    onClick={() => handleDelete(t.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}