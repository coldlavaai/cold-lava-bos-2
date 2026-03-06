/**
 * Animation utilities for Apple-level UI polish
 * Based on UX-DESIGN-PRINCIPLES.md motion guidelines
 */

import { Variants } from "framer-motion"

// Standard easing curves (matches Apple Human Interface Guidelines)
export const easings = {
  // Smooth deceleration for entering elements
  easeOut: [0.22, 1, 0.36, 1],
  // Natural spring-like motion
  spring: { type: "spring", stiffness: 300, damping: 30 },
  // Quick, snappy interactions
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  // Gentle, subtle motion
  gentle: { type: "spring", stiffness: 200, damping: 25 },
} as const

// Standard durations (in seconds)
export const durations = {
  fast: 0.15,      // Micro-interactions
  normal: 0.2,     // Standard transitions
  slow: 0.3,       // Larger elements
  page: 0.4,       // Page transitions
} as const

// Fade in from below (for staggered lists)
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: durations.normal, 
      ease: easings.easeOut 
    }
  },
}

// Fade in from right (for sliding panels)
export const fadeInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 20 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: durations.normal, 
      ease: easings.easeOut 
    }
  },
}

// Scale up from center (for modals, cards)
export const scaleIn: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: easings.spring
  },
}

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

// List item animation
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: durations.fast,
      ease: easings.easeOut 
    }
  },
}

// Card hover effect
export const cardHover = {
  scale: 1.02,
  transition: easings.snappy,
}

// Button tap effect
export const buttonTap = {
  scale: 0.98,
}

// Page transition variants
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: durations.page, 
      ease: easings.easeOut 
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { 
      duration: durations.normal, 
      ease: easings.easeOut 
    }
  },
}

// Sidebar collapse animation
export const sidebarVariants: Variants = {
  expanded: { 
    width: 240,
    transition: easings.spring
  },
  collapsed: { 
    width: 64,
    transition: easings.spring
  },
}

// Notification bell shake
export const bellShake: Variants = {
  shake: {
    rotate: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
}

// Success checkmark animation
export const checkmark: Variants = {
  hidden: { 
    pathLength: 0, 
    opacity: 0 
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { 
      duration: 0.4, 
      ease: easings.easeOut 
    }
  }
}

// Skeleton shimmer effect (CSS keyframes are better for this)
export const shimmer = {
  backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
}
