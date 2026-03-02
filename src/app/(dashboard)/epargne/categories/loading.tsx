import { type ReactElement } from 'react'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function CategoriesLoading(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}