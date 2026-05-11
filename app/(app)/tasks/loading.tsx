import { Skeleton, SkeletonListItem } from '@/components/ui/skeleton'

export default function TasksLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton circle className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="space-y-2">
            {[...Array(3)].map((_, j) => <SkeletonListItem key={j} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
