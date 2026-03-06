import * as React from "react"
import { cn } from "@/lib/utils"

interface TimelineItemProps {
  children: React.ReactNode
  icon?: React.ReactNode
  isLast?: boolean
  isActive?: boolean
  className?: string
}

interface TimelineProps {
  children: React.ReactNode
  className?: string
}

export function Timeline({ children, className }: TimelineProps) {
  const items = React.Children.toArray(children)
  
  return (
    <div className={cn("relative", className)}>
      {items.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TimelineItemProps>, {
            isLast: index === items.length - 1,
          })
        }
        return child
      })}
    </div>
  )
}

export function TimelineItem({
  children,
  icon,
  isLast = false,
  isActive = false,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative pl-8 pb-6", isLast && "pb-0", className)}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
      )}
      
      {/* Icon/dot */}
      <div className={cn(
        "absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2",
        isActive 
          ? "border-primary bg-primary text-primary-foreground" 
          : "border-border bg-background"
      )}>
        {icon ? (
          <span className="h-3 w-3">{icon}</span>
        ) : (
          <span className={cn(
            "h-2 w-2 rounded-full",
            isActive ? "bg-primary-foreground" : "bg-muted-foreground"
          )} />
        )}
      </div>
      
      {/* Content */}
      <div className="min-h-[24px]">
        {children}
      </div>
    </div>
  )
}

export function TimelineTitle({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <p className={cn("text-sm font-medium", className)}>
      {children}
    </p>
  )
}

export function TimelineDescription({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <p className={cn("text-sm text-muted-foreground mt-0.5", className)}>
      {children}
    </p>
  )
}

export function TimelineTime({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-1", className)}>
      {children}
    </p>
  )
}
