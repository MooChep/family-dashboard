'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { CategoryManager } from '@/components/epargne/CategoryManager'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { type Category, CategoryType } from '@prisma/client'

export default function CategoriesPage(): ReactElement {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadCategories(): Promise<void> {
    const res = await fetch('/api/epargne/categories')
    const data = await res.json() as Category[]
    setCategories(data)
    setIsLoading(false)
  }

  useEffect(() => { void loadCategories() }, [])

  async function handleAdd(formData: {
    name: string
    type: CategoryType
    isFixed: boolean
  }): Promise<void> {
    const res = await fetch('/api/epargne/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await loadCategories()
  }

  async function handleEdit(
    id: string,
    formData: { name: string; isFixed: boolean },
  ): Promise<void> {
    const res = await fetch(`/api/epargne/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await loadCategories()
  }

  async function handleDelete(id: string): Promise<void> {
    const res = await fetch(`/api/epargne/categories/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json() as { error: string }
      throw new Error(err.error)
    }
    await loadCategories()
  }

  return (
    <EpargneLayout>
      {isLoading ? (
        <SkeletonCard />
      ) : (
        <CategoryManager
          categories={categories}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </EpargneLayout>
  )
}