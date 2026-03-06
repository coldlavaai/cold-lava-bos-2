/**
 * Session 101: Self-Serve Signup Page
 * Public page for creating new tenant + admin user
 */

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, AlertCircle, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Check if user is already logged in
  React.useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is already logged in, redirect to app
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Call signup endpoint to create tenant + user
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: companyName,
          full_name: fullName,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      // Sign in the user using Supabase client
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error("Account created but failed to sign in. Please try logging in.")
      }

      // Verify user has tenant access via /api/auth/me
      const meResponse = await fetch("/api/auth/me")
      if (!meResponse.ok) {
        throw new Error("Account created but tenant setup incomplete. Please contact support.")
      }

      // Success! Force a full page reload to ensure cookies are picked up
      // Client-side navigation (router.push) can race with cookie propagation
      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { label: "", color: "" }
    if (pwd.length < 8) return { label: "Too short", color: "text-destructive" }
    if (pwd.length < 12) return { label: "Weak", color: "text-yellow-600" }
    if (pwd.length < 16) return { label: "Good", color: "text-green-600" }
    return { label: "Strong", color: "text-green-700" }
  }

  const passwordStrength = getPasswordStrength(password)

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

      {/* Floating energy orbs - pointer-events-none to not block clicks */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" style={{ animationDelay: '1s' }}></div>

      <Card variant="elevated" className="w-full max-w-md relative z-20 border-2 border-primary/10 shine">
        <CardHeader className="space-y-6 text-center pb-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-accent rounded-full blur-xl opacity-20 animate-pulse-glow"></div>

              {/* Main icon container */}
              <div className="relative w-20 h-20 rounded-full gradient-solar flex items-center justify-center shadow-lg">
                <Flame className="h-10 w-10 text-white" />
              </div>

              {/* Small accent icon */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-md border-2 border-background">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-3">
            <CardTitle className="text-3xl font-display gradient-text-solar">
              Start Your Free Trial
            </CardTitle>
            <CardDescription className="text-base">
              Create your Cold Lava BOS account and streamline your business operations
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-slide-in-from-bottom">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive leading-relaxed">{error}</p>
              </div>
            )}

            {/* Company name input */}
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-foreground">
                Company Name
              </label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Company Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {/* Full name input */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Your Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Work Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

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
              {password.length > 0 && (
                <p className={`text-xs ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              variant="solar"
              className="w-full h-12 md:h-11 text-base font-semibold touch-manipulation relative z-10"
              loading={loading}
              disabled={loading}
              onClick={(e) => {
                // Fallback for touch devices where form submit might not fire
                if (!loading) {
                  const form = e.currentTarget.closest('form')
                  if (form) {
                    form.requestSubmit()
                  }
                }
              }}
            >
              {loading ? "Creating your account..." : "Create Account"}
            </Button>

            {/* Terms notice */}
            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          {/* Already have account */}
          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Features list */}
          <div className="pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What you'll get:
            </p>
            <div className="space-y-2">
              {[
                "Complete job & customer management",
                "Automated communications (Email & SMS)",
                "Integration with design tools",
                "Team collaboration features",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{feature}</p>
                </div>
              ))}
            </div>
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
