"use client"

import * as React from "react"
import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion"
import { 
  fadeInUp, 
  fadeInRight, 
  scaleIn, 
  staggerContainer, 
  listItem,
  pageVariants,
  cardHover,
  buttonTap,
  easings,
  durations
} from "@/lib/animations"
import { cn } from "@/lib/utils"

// Animated div with fade-in-up effect
export function FadeInUp({ 
  children, 
  className,
  delay = 0,
  ...props 
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated div with fade-in-right effect (for panels)
export function FadeInRight({ 
  children, 
  className,
  delay = 0,
  ...props 
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInRight}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated container for staggered children
export function StaggeredList({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated list item
export function StaggeredItem({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={listItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated card with hover effect
export function AnimatedCard({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      whileHover={cardHover}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated button with tap effect
export function AnimatedButton({ 
  children, 
  className,
  ...props 
}: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={buttonTap}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// Page transition wrapper
export function PageTransition({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Presence wrapper for conditional rendering with animation
export function AnimatedPresence({ 
  children, 
  show,
  mode = "wait"
}: { 
  children: React.ReactNode
  show: boolean
  mode?: "wait" | "sync" | "popLayout"
}) {
  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={easings.spring}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Animated counter for numbers (e.g., metrics)
export function AnimatedNumber({ 
  value, 
  className,
  prefix = "",
  suffix = "",
  duration = durations.slow 
}: { 
  value: number
  className?: string
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue
    const diff = value - startValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + diff * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{Math.round(displayValue).toLocaleString()}{suffix}
    </span>
  )
}

// Simple skeleton placeholder
export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "bg-muted rounded animate-pulse",
        className
      )}
    />
  )
}

// Skeleton with shimmer effect
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "bg-muted rounded animate-pulse relative overflow-hidden",
        className
      )}
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
        }}
      />
    </div>
  )
}

// Animated success checkmark
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cn("h-6 w-6 text-success", className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={easings.spring}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...easings.spring, delay: 0.1 }}
      />
      <motion.path
        d="M9 12l2 2 4-4"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
    </motion.svg>
  )
}

// Loading spinner with smooth rotation
export function LoadingSpinner({ 
  size = "md",
  className 
}: { 
  size?: "sm" | "md" | "lg"
  className?: string 
}) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <motion.div
      className={cn(sizes[size], className)}
      animate={{ rotate: 360 }}
      transition={{ 
        duration: 1, 
        repeat: Infinity, 
        ease: "linear" 
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.25"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  )
}
