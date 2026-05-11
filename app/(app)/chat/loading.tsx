import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="flex h-full animate-fade-in">
      <div className="hidden lg:flex flex-col w-60 border-r border-gray-100 p-4 gap-3">
        <Skeleton className="h-4 w-20 mb-1" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5 p-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Skeleton circle className="w-16 h-16" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}
