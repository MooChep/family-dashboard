import { type ReactElement } from 'react'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function MenageLoading(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonCard />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}