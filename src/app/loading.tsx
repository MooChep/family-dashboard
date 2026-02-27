import { type ReactElement } from 'react'
import { SkeletonCard } from '@/components/ui/Skeleton'

// loading.tsx est affiché automatiquement par Next.js pendant
// le chargement des Server Components de la page
export default function GlobalLoading(): ReactElement {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Simule un dashboard avec plusieurs cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}