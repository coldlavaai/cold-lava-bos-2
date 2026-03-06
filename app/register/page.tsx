"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  // Check if this is an invite link
  const token = searchParams?.get("token") || ""
  const email = searchParams?.get("email") || ""
  const isInviteFlow = !!token || !!email

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // If this is an invite flow with token, use updateUser to set password
      if (token) {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        })

        if (updateError) throw updateError
      } else if (email) {
        // Direct email registration (for invite without token)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        })

        if (signUpError) throw signUpError
      } else {
        throw new Error("Invalid registration link. Please use the invite link from your email.")
      }

      setSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete registration")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 pb-20 relative overflow-x-hidden overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Decorative background */}
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

        <Card variant="elevated" className="w-full max-w-md relative z-20 border-2 border-success/20">
          <CardContent className="pt-12 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <UserPlus className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl font-display">Registration Complete!</CardTitle>
            <p className="text-muted-foreground">
              Your account has been set up successfully. Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-md border-2 border-background">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-3">
            <CardTitle className="text-3xl font-display gradient-text-solar">
              {isInviteFlow ? "Accept Invitation" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-base">
              {isInviteFlow
                ? "Complete your account setup to get started"
                : "Join Cold Lava BOS"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-slide-in-from-bottom">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive leading-relaxed">{error}</p>
              </div>
            )}

            {/* Show email if it's from invite */}
            {email && (
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{email}</p>
              </div>
            )}

            {/* Name input */}
            {!token && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}

            {/* Password input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
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

            {/* Confirm password input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="solar"
              className="w-full h-12 md:h-11 text-base font-semibold touch-manipulation"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Complete Registration"}
            </Button>
          </form>

          {/* Back to login */}
          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </a>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
