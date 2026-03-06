"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, AlertCircle, Eye, EyeOff, Zap, Mail, CheckCircle2, KeyRound, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [emailSent, setEmailSent] = React.useState(false)
  const [resetComplete, setResetComplete] = React.useState(false)
  const [isResetMode, setIsResetMode] = React.useState(false)
  const [checkingSession, setCheckingSession] = React.useState(true)

  // Check for recovery session on mount
  React.useEffect(() => {
    const supabase = createClient()
    
    // Check URL params for type=recovery (our redirect param)
    const typeParam = searchParams?.get("type")
    
    // Set a timeout to prevent infinite loading - max 5 seconds
    const loadingTimeout = setTimeout(() => {
      console.log('[Auth] Loading timeout reached, showing form')
      setCheckingSession(false)
      // If we have type=recovery in URL, assume recovery mode
      if (typeParam === 'recovery') {
        setIsResetMode(true)
      }
    }, 5000)
    
    // Listen for auth state changes (handles hash fragment tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Event:', event, 'Session:', !!session)
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Password recovery session detected')
        clearTimeout(loadingTimeout)
        setIsResetMode(true)
        setCheckingSession(false)
      } else if (event === 'SIGNED_IN' && typeParam === 'recovery') {
        // User clicked recovery link and session was established
        console.log('[Auth] Recovery sign-in detected')
        clearTimeout(loadingTimeout)
        setIsResetMode(true)
        setCheckingSession(false)
      } else if (event === 'INITIAL_SESSION' && session && typeParam === 'recovery') {
        // Initial session load with recovery param
        console.log('[Auth] Initial session with recovery param')
        clearTimeout(loadingTimeout)
        setIsResetMode(true)
        setCheckingSession(false)
      }
    })

    // Also check if there's already a session (page refresh after clicking link)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // If we have a session and the URL indicates recovery, show reset form
        if (session && typeParam === 'recovery') {
          console.log('[Auth] Existing recovery session found')
          clearTimeout(loadingTimeout)
          setIsResetMode(true)
          setCheckingSession(false)
          return
        }
        
        // Check for hash fragments (Supabase sometimes uses these)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1)
          const params = new URLSearchParams(hash)
          const hashType = params.get('type')
          const hasToken = params.get('access_token')
          
          if (hashType === 'recovery' || hasToken) {
            console.log('[Auth] Recovery hash fragment detected, type:', hashType, 'hasToken:', !!hasToken)
            // Supabase client should auto-handle this, wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000))
            const { data: { session: newSession } } = await supabase.auth.getSession()
            if (newSession) {
              console.log('[Auth] Session established from hash fragment')
              clearTimeout(loadingTimeout)
              setIsResetMode(true)
              setCheckingSession(false)
              return
            } else if (hashType === 'recovery') {
              // Hash says recovery but no session - still show reset form
              console.log('[Auth] No session but hash type is recovery, showing form')
              clearTimeout(loadingTimeout)
              setIsResetMode(true)
              setCheckingSession(false)
              return
            }
          }
        }
        
        // If type=recovery in URL but no session yet, still show reset form
        // (user may have a valid session that just needs to load)
        if (typeParam === 'recovery') {
          console.log('[Auth] Recovery param present, showing reset form')
          clearTimeout(loadingTimeout)
          setIsResetMode(true)
        }
      } catch (err) {
        console.error('[Auth] Session check error:', err)
      } finally {
        clearTimeout(loadingTimeout)
        setCheckingSession(false)
      }
    }

    checkSession()

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [searchParams])

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?type=recovery`,
      })

      if (resetError) throw resetError

      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setResetComplete(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking for recovery session
  if (checkingSession) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card variant="elevated" className="w-full max-w-md border-2 border-primary/10">
          <CardContent className="pt-12 pb-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success screen after reset complete
  if (resetComplete) {
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
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl font-display">Password Reset Complete!</CardTitle>
            <p className="text-muted-foreground">
              Your password has been updated successfully. Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success screen after email sent
  if (emailSent && !isResetMode) {
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

        <Card variant="elevated" className="w-full max-w-md relative z-20 border-2 border-primary/10">
          <CardContent className="pt-12 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Check Your Email</CardTitle>
            <p className="text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={() => setEmailSent(false)}>
                Send Another Email
              </Button>
            </div>
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
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-warning flex items-center justify-center shadow-md border-2 border-background">
                {isResetMode ? (
                  <KeyRound className="h-4 w-4 text-white" />
                ) : (
                  <Zap className="h-4 w-4 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-3">
            <CardTitle className="text-3xl font-display gradient-text-solar">
              {isResetMode ? "Set New Password" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-base">
              {isResetMode
                ? "Enter your new password below"
                : "Enter your email to receive a reset link"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isResetMode ? (
            // Password reset form (after clicking email link)
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-slide-in-from-bottom">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive leading-relaxed">{error}</p>
                </div>
              )}

              {/* New password input */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  Confirm New Password
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
                className="w-full h-11 text-base font-semibold"
                loading={loading}
                disabled={loading}
              >
                {loading ? "Updating password..." : "Update Password"}
              </Button>
            </form>
          ) : (
            // Email form (initial reset request)
            <form onSubmit={handleSendResetEmail} className="space-y-5">
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

              {/* Submit button */}
              <Button
                type="submit"
                variant="solar"
                className="w-full h-11 text-base font-semibold"
                loading={loading}
                disabled={loading}
              >
                {loading ? "Sending reset link..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          {/* Back to login */}
          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="hidden md:block absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Cold Lava
        </p>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  )
}
