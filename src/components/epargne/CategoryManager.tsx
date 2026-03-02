'use client'

import { useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { type Category, CategoryType } from '@prisma/client'

interface CategoryManagerProps {
  categories: Category[]
  onAdd: (data: { name: string; type: CategoryType; isFixed: boolean }) => Promise<void>
  onEdit: (id: string, data: { name: string; isFixed: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CategoryManager({
  categories,
  onAdd,
  onEdit,
  onDelete,
}: CategoryManagerProps): ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE)
  const [isFixed, setIsFixed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openAdd(): void {
    setEditingCategory(null)
    setName('')
    setType(CategoryType.EXPENSE)
    setIsFixed(false)
    setError(null)
    setIsModalOpen(true)
  }

  function openEdit(category: Category): void {
    setEditingCategory(category)
    setName(category.name)
    setType(category.type)
    setIsFixed(category.isFixed)
    setError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      setError('Le nom est requis')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (editingCategory) {
        await onEdit(editingCategory.id, { name: name.trim(), isFixed })
      } else {
        await onAdd({ name: name.trim(), type, isFixed })
      }
      setIsModalOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id)
    try {
      await onDelete(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const fixedCategories = categories.filter((c) => c.type === 'EXPENSE' && c.isFixed)
  const variableCategories = categories.filter((c) => c.type === 'EXPENSE' && !c.isFixed)

  function CategoryGroup({
    title,
    items,
  }: {
    title: string
    items: Category[]
  }): ReactElement {
    return (
      <div className="flex flex-col gap-2">
        <h3
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
        >
          {title}
        </h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
              Aucune catégorie
            </p>
          ) : (
            items.map((cat, i) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom: i < items.length - 1
                    ? '1px solid var(--border)'
                    : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>
                    {cat.name}
                  </span>
                  {cat.isFixed && (
                    <Badge variant="default">fixe</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(cat)}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deletingId === cat.id}
                    onClick={() => handleDelete(cat.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button variant="primary" size="md" onClick={openAdd}>
          + Nouvelle catégorie
        </Button>
      </div>

      <CategoryGroup title="Revenus" items={incomeCategories} />
      <CategoryGroup title="Charges fixes" items={fixedCategories} />
      <CategoryGroup title="Dépenses variables" items={variableCategories} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Courses"
          />

          {!editingCategory && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text2)' }}
              >
                Type
              </label>
              <div className="flex gap-2">
                {[
                  { value: CategoryType.INCOME, label: 'Revenu' },
                  { value: CategoryType.EXPENSE, label: 'Dépense' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className="flex-1 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: type === opt.value
                        ? 'var(--accent)'
                        : 'var(--surface2)',
                      color: type === opt.value
                        ? 'var(--bg)'
                        : 'var(--text2)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === CategoryType.EXPENSE && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFixed(!isFixed)}
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{
                  backgroundColor: isFixed ? 'var(--accent)' : 'var(--surface2)',
                  border: `1px solid ${isFixed ? 'var(--accent)' : 'var(--border)'}`,
                  color: isFixed ? 'var(--bg)' : 'transparent',
                }}
              >
                {isFixed && '✓'}
              </button>
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                Charge fixe récurrente
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isLoading}
              onClick={handleSubmit}
            >
              {editingCategory ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}