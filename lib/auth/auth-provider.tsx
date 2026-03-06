"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface AuthUser {
  id: string
  email: string
  full_name?: string
}

interface Tenant {
  id: string
  company_name: string
  subdomain: string
  tier: string
  settings: Record<string, unknown>
  is_active: boolean
}

interface AuthContextType {
  user: AuthUser | null
  tenant: Tenant | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [tenant, setTenant] = React.useState<Tenant | null>(null)
  const [role, setRole] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Track if initial fetch is in progress to prevent duplicate fetches
  const initialFetchRef = React.useRef(false)
  const mountedRef = React.useRef(false)

  const fetchAuthState = React.useCallback(async () => {
    // Prevent duplicate fetches during initialization
    if (initialFetchRef.current) {
      return
    }
    initialFetchRef.current = true

    try {
      const supabase = createClient()
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()

      if (!supabaseUser) {
        setUser(null)
        setTenant(null)
        setRole(null)
        return
      }

      // Fetch user + tenant from our API
      const response = await fetch("/api/auth/me")
      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const { data } = await response.json()

      setUser({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
      })
      setTenant(data.tenant)
      setRole(data.user.role)
    } catch (error) {
      console.error("Auth error:", error)
      setUser(null)
      setTenant(null)
      setRole(null)
    } finally {
      setLoading(false)
      initialFetchRef.current = false
    }
  }, [])

  const signOut = React.useCallback(async () => {
    try {
      // Call our logout endpoint
      await fetch("/api/auth/logout", { method: "POST" })

      // Sign out from Supabase
      const supabase = createClient()
      await supabase.auth.signOut()

      setUser(null)
      setTenant(null)
      setRole(null)

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }, [router])

  const refreshAuth = React.useCallback(async () => {
    // Allow manual refresh
    initialFetchRef.current = false
    await fetchAuthState()
  }, [fetchAuthState])

  React.useEffect(() => {
    // Only run once on mount
    if (mountedRef.current) return
    mountedRef.current = true

    // Initial fetch
    fetchAuthState()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      // Only handle sign out - sign in is handled by initial fetch
      if (event === "SIGNED_OUT") {
        setUser(null)
        setTenant(null)
        setRole(null)
        router.push("/login")
      }
      // Don't refetch on SIGNED_IN - it creates duplicate fetch race condition
      // The initial fetchAuthState() or explicit refreshAuth() handles auth state
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchAuthState, router])

  return (
    <AuthContext.Provider value={{ user, tenant, role, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
