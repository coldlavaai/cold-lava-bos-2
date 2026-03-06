import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Helper function to hash session tokens using Web Crypto API (Edge Runtime compatible)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ========================================
  // PORTAL SESSION VALIDATION (Session 102/108)
  // ========================================
  if (pathname.startsWith('/portal')) {
    console.log('[Portal Middleware] Processing portal route:', {
      pathname,
      hasTokenParam: !!request.nextUrl.searchParams.get('token'),
      hasSessionCookie: !!request.cookies.get('portal_session'),
      url: request.url,
    })

    // Allow access to error pages without session
    if (
      pathname === '/portal/invalid-link' ||
      pathname === '/portal/expired-link'
    ) {
      console.log('[Portal Middleware] Allowing access to error page:', pathname)
      return NextResponse.next()
    }

    // Allow access to the token redemption endpoint (legacy, may not be used)
    if (pathname === '/api/portal/access') {
      console.log('[Portal Middleware] Allowing access to legacy /api/portal/access')
      return NextResponse.next()
    }

    const sessionCookie = request.cookies.get('portal_session')
    const tokenParam = request.nextUrl.searchParams.get('token')

    console.log('[Portal Middleware] Cookie and token check:', {
      hasSessionCookie: !!sessionCookie,
      hasTokenParam: !!tokenParam,
      tokenParamLength: tokenParam?.length,
      willEnterTokenValidation: !!(tokenParam && !sessionCookie),
    })

    // Case 1a: Session token in URL (from API route) - set cookie and redirect to clean URL
    const sessionParam = request.nextUrl.searchParams.get('session')
    if (sessionParam && !sessionCookie) {
      console.log('[Portal Middleware] Session param found - setting cookie and redirecting to clean URL')
      
      // Create redirect to clean /portal URL
      const cleanUrl = new URL('/portal', request.url)
      const response = NextResponse.redirect(cleanUrl)
      
      // Set the session cookie
      response.cookies.set('portal_session', sessionParam, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      
      console.log('[Portal Middleware] Cookie set, redirecting to /portal')
      return response
    }

    // Case 1b: Token in URL - redirect to Node.js API route for validation
    // (Middleware Edge Runtime has limitations with Supabase queries)
    if (tokenParam && !sessionCookie) {
      console.log('[Portal Middleware] Token in URL - redirecting to Node.js API route:', tokenParam?.substring(0, 10) + '...')

      const apiUrl = new URL('/api/portal/access', request.url)
      apiUrl.searchParams.set('token', tokenParam)

      return NextResponse.redirect(apiUrl)
    }

    // Note: Legacy middleware token validation code removed
    // Edge Runtime approach had issues with Supabase queries and cookie setting
    // Now using Node.js API route (/api/portal/access) for reliable validation

    // Case 2: No session cookie and no token - redirect to invalid link
    if (!sessionCookie) {
      console.log('[Portal Middleware] No session cookie and no token - redirecting to invalid-link')
      return NextResponse.redirect(new URL('/portal/invalid-link', request.url))
    }

    // Case 3: Session cookie exists - validate it
    console.log('[Portal Middleware] Validating existing session cookie')
    try {
      // Hash the session token
      const sessionHash = await hashToken(sessionCookie.value)

      // Create Supabase client for portal session lookup
      let portalResponse = NextResponse.next({ request })

      const supabasePortal = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              portalResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                portalResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      // Look up session
      const { data: session, error } = await supabasePortal
        .from('portal_sessions')
        .select('id, expires_at, customer_id, tenant_id')
        .eq('session_hash', sessionHash)
        .single()

      if (error || !session) {
        return NextResponse.redirect(new URL('/portal/invalid-link', request.url))
      }

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(session.expires_at)

      if (now > expiresAt) {
        // Delete expired session
        await supabasePortal
          .from('portal_sessions')
          .delete()
          .eq('id', session.id)

        return NextResponse.redirect(new URL('/portal/expired-link', request.url))
      }

      // Store portal context in cookies for portal pages
      portalResponse.cookies.set('portal-customer-id', session.customer_id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/portal',
      })
      portalResponse.cookies.set('portal-tenant-id', session.tenant_id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/portal',
      })

      // Valid session - allow request
      return portalResponse
    } catch (error) {
      console.error('[Portal Middleware] Session validation error:', error)
      return NextResponse.redirect(new URL('/portal/invalid-link', request.url))
    }
  }

  // ========================================
  // MAIN APP AUTHENTICATION (Existing)
  // ========================================
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // DEBUG: Log auth status
  console.log('[middleware] DEBUG auth.getUser', {
    path: request.nextUrl.pathname,
    userId: user?.id,
    userEmail: user?.email,
    hasUser: !!user,
    authError: authError ? { message: authError.message, status: authError.status } : null,
    hasCookies: request.cookies.getAll().length > 0,
    cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
  })

  // Set tenant context for ALL authenticated routes (pages + API)
  // This ensures the sb-tenant-id cookie is always available
  if (user) {
    // Public API routes that don't require tenant context
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/signup',
      '/api/debug-db',
      '/api/debug/',
      '/api/health',
      '/api/portal/access',
      '/api/postcode-lookup',
      '/api/webhooks/',
      '/api/calls/twiml', // Twilio voice TwiML - Twilio POSTs here during calls
    ]

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (!isPublicRoute) {
      // Get user's tenant_id and role from tenant_users
      // Use service role client to bypass RLS for this trusted server-side lookup
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return []
            },
            setAll() {},
          },
        }
      )

      const { data: tenantUser, error: tenantError } = await supabaseAdmin
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single()

      if (tenantUser) {
        // Store tenant context in cookies for all routes
        supabaseResponse.cookies.set('sb-tenant-id', tenantUser.tenant_id, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
        supabaseResponse.cookies.set('sb-user-role', tenantUser.role, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
        supabaseResponse.cookies.set('sb-user-id', user.id, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      } else if (pathname.startsWith('/api/') && !isPublicRoute) {
        // Only block API routes if no tenant found — pages can handle gracefully
        console.error('[middleware] No tenant found for user', {
          userId: user.id,
          userEmail: user.email,
          path: pathname,
        })
        return NextResponse.json(
          { error: 'No tenant membership found for user.' },
          { status: 403 }
        )
      }
    }
  } else if (pathname.startsWith('/api/')) {
    // Unauthenticated API requests (excluding public routes)
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/signup',
      '/api/debug-db',
      '/api/debug/',
      '/api/health',
      '/api/portal/access',
      '/api/postcode-lookup',
      '/api/webhooks/', // Twilio inbound SMS/WhatsApp, SendGrid inbound email
      '/api/calls/twiml', // Twilio voice TwiML callback
    ]

    if (!publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to match your project structure
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
