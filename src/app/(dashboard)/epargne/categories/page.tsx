'use client'
import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { CategoryManager } from '@/components/epargne/CategoryManager'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { type Category, type SavingsProject, CategoryType } from '@prisma/client'

type ProjetWithCategory = SavingsProject & { allocations: { amount: number }[] }

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function CategoriesPage(): ReactElement {
  const [categories, setCategories] = useState<Category[]>([])
  const [projets, setProjets]       = useState<ProjetWithCategory[]>([])
  const [isLoading, setIsLoading]   = useState(true)

  async function loadAll(): Promise<void> {
    const [catRes, projRes] = await Promise.all([
      fetch('/api/epargne/categories?includeArchived=true'),
      fetch('/api/epargne/projets'),
    ])
    setCategories(await catRes.json() as Category[])
    setProjets(await projRes.json() as ProjetWithCategory[])
    setIsLoading(false)
  }

  useEffect(() => { void loadAll() }, [])

  // --- Handlers existants ---
  async function handleAdd(formData: { name: string; type: CategoryType; isFixed: boolean }): Promise<void> {
    const res = await fetch('/api/epargne/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  async function handleEdit(id: string, formData: { name: string; isFixed: boolean; isArchived?: boolean }): Promise<void> {
    const res = await fetch(`/api/epargne/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  async function handleDelete(id: string): Promise<void> {
    const res = await fetch(`/api/epargne/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  async function handleAddProjet(name: string, targetAmount: number | null): Promise<void> {
    const res = await fetch('/api/epargne/projets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetAmount }),
    })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  async function handleEditProjet(id: string, name: string, targetAmount: number | null): Promise<void> {
    const res = await fetch(`/api/epargne/projets/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetAmount }),
    })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  async function handleReaffecterProjet(sourceId: string, targetProjectId: string): Promise<void> {
    const res = await fetch(`/api/epargne/projets/${sourceId}/reaffecter`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetProjectId, month: getCurrentMonth() }),
    })
    if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
    await loadAll()
  }

  // --- NOUVEAU HANDLER POUR FIXER L'ERREUR ---
  async function handleAnnulerReaffectation(sourceId: string): Promise<void> {
    const res = await fetch(`/api/epargne/projets/${sourceId}/reaffecter`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await loadAll()
  }

  return (
    <EpargneLayout>
      {isLoading ? (
        <SkeletonCard />
      ) : (
        <CategoryManager
          categories={categories}
          projets={projets}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddProjet={handleAddProjet}
          onEditProjet={handleEditProjet}
          onReaffecterProjet={handleReaffecterProjet}
          onAnnulerReaffectation={handleAnnulerReaffectation} // <--- La prop manquante est ici
        />
      )}
    </EpargneLayout>
  )
}