import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "rectangular"
  animation?: "pulse" | "shimmer" | "none"
}

function Skeleton({
  className,
  variant = "default",
  animation = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white/[0.06]",
        // Variants
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "rectangular" && "rounded-lg",
        variant === "default" && "rounded-md",
        // Animation
        animation === "pulse" && "animate-pulse",
        animation === "shimmer" && "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

// Pre-built skeleton compositions
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" variant="circular" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" variant="rectangular" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" variant="rectangular" />
        <Skeleton className="h-8 w-20" variant="rectangular" />
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="bg-white/[0.04] border-b border-white/[0.08] p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? 150 : undefined }} />
          ))}
        </div>
      </div>
      {/* Body */}
      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 p-4 bg-transparent">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn("h-4", colIndex === 0 ? "w-32" : "flex-1")}
                style={{ animationDelay: `${(rowIndex * columns + colIndex) * 100}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.04]">
          <Skeleton className="h-12 w-12" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-8" variant="circular" />
        </div>
      ))}
    </div>
  )
}

function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.04] p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-5" variant="circular" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-28 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonMetric }
