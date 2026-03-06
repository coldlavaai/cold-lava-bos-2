"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, AlertCircle, Eye, EyeOff, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Verify user has tenant access via /api/auth/me
      const meResponse = await fetch("/api/auth/me")
      if (!meResponse.ok) {
        throw new Error("User not associated with any tenant")
      }

      // Force full page reload to ensure auth cookies are picked up
      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 pb-20 relative overflow-x-hidden overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating energy orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

      <Card variant="elevated" className="w-full max-w-md relative z-20 border-2 border-primary/10 shine">
        <CardHeader className="space-y-6 text-center pb-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent rounded-full blur-xl opacity-20 animate-pulse-glow pointer-events-none"></div>

              {/* Main icon container */}
              <div className="relative w-20 h-20 rounded-full gradient-solar flex items-center justify-center shadow-lg">
                <Flame className="h-10 w-10 text-white" />
              </div>

              {/* Small accent icon */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md border-2 border-background">
                <Zap className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-3">
            <CardTitle className="text-3xl font-display gradient-text-solar">
              Cold Lava BOS
            </CardTitle>
            <CardDescription className="text-base">
              Business Operations System
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-slide-in-from-bottom">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive leading-relaxed">{error}</p>
              </div>
            )}

            {/* Email input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-11 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="solar"
              className="w-full h-12 md:h-11 text-base font-semibold touch-manipulation relative z-10"
              loading={loading}
              disabled={loading}
              onClick={(e) => {
                if (!loading) {
                  const form = e.currentTarget.closest('form')
                  if (form) form.requestSubmit()
                }
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Footer - hidden on mobile to avoid overlap */}
      <div className="hidden md:block absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Cold Lava
        </p>
      </div>
    </div>
  )
}
