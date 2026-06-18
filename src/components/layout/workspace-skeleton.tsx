import { Skeleton } from '@/components/ui/skeleton';

export function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden w-[var(--panel-left-width)] shrink-0 space-y-3 border-r border-border p-4 lg:block">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-11 w-full rounded-none" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full" />
          <LayoutCardSkeleton />
          <LayoutCardSkeleton />
        </div>
      </div>
      <div className="hidden w-[var(--panel-right-width)] shrink-0 space-y-4 border-l border-border p-4 xl:block">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}

function LayoutCardSkeleton() {
  return <Skeleton className="h-40 w-full rounded-lg" />;
}
