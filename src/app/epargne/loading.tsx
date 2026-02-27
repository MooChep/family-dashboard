import { Skeleton } from "@/components/ui/Skeleton"

export default function EpargneLoading() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}