import { Skeleton, SkeletonListItem } from '@/components/ui/skeleton'

export default function GroceryLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />)}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {[...Array(6)].map((_, i) => <SkeletonListItem key={i} />)}
      </div>
    </div>
  )
}
