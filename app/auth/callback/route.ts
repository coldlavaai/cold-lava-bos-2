import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')
  
  // Also check for token_hash (used in some email flows)
  const tokenHash = searchParams.get('token_hash')
  const emailType = searchParams.get('type') // email verification type

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if this is a recovery flow
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/forgot-password?type=recovery`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle token_hash flow (used by Supabase for email verification/recovery)
  if (tokenHash && emailType) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: emailType as 'recovery' | 'signup' | 'email',
      token_hash: tokenHash,
    })
    
    if (!error) {
      if (emailType === 'recovery') {
        return NextResponse.redirect(`${origin}/forgot-password?type=recovery`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
