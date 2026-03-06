import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders, getUserIdFromHeaders, getUserRoleFromHeaders } from '@/lib/supabase/tenant-context'
import { canViewAllJobs } from '@/lib/auth/permissions'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { computePlaceholderSiteIntel, type SiteIntel } from '@/lib/site-intel/placeholder'
import { type JobSiteIntel } from '@/lib/site-intel/types'
import { getOSPlacesService } from '@/lib/services/os-places.service'
import { getGoogleSolarService } from '@/lib/services/google-solar.service'
import { mapGoogleSolarToSiteIntel } from '@/lib/site-intel/google-solar-mapper'

// GET /api/jobs/:id/site-intel - Get stored site intelligence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[GET /api/jobs/:id/site-intel] Request received for job:', id)

    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)

    console.log('[GET /api/jobs/:id/site-intel] Context:', {
      tenantId,
      currentUserId,
      currentUserRole
    })

    if (!tenantId) {
      console.log('[GET /api/jobs/:id/site-intel] No tenant ID - returning 400')
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Fetch job to check permissions and get metadata
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, assigned_to, metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (jobError) {
      console.error('[GET /api/jobs/:id/site-intel] Error fetching job:', jobError)
      return NextResponse.json(
        { error: jobError.message || 'Failed to fetch job' },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && job.assigned_to !== currentUserId) {
      console.log('[GET /api/jobs/:id/site-intel] Permission denied')
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Extract site_intel from metadata
    const metadata = job.metadata as Record<string, unknown> | null
    const siteIntel = metadata?.site_intel as JobSiteIntel | null

    console.log('[GET /api/jobs/:id/site-intel] Returning stored site intel')
    return NextResponse.json({ data: siteIntel })
  } catch (error) {
    console.error('Error in GET /api/jobs/:id/site-intel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/jobs/:id/site-intel - Compute and persist site intelligence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[POST /api/jobs/:id/site-intel] Request received for job:', id)

    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const currentUserId = await getUserIdFromHeaders(headersList)
    const currentUserRole = await getUserRoleFromHeaders(headersList)

    console.log('[POST /api/jobs/:id/site-intel] Context:', {
      tenantId,
      currentUserId,
      currentUserRole
    })

    if (!tenantId) {
      console.log('[POST /api/jobs/:id/site-intel] No tenant ID - returning 400')
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No user context' },
        { status: 400 }
      )
    }

    // Fetch job with customer data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, assigned_to, customer_id, metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (jobError) {
      console.error('[POST /api/jobs/:id/site-intel] Error fetching job:', jobError)
      return NextResponse.json(
        { error: jobError.message || 'Failed to fetch job' },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canSeeAllJobs = canViewAllJobs(currentUserRole)
    if (!canSeeAllJobs && job.assigned_to !== currentUserId) {
      console.log('[POST /api/jobs/:id/site-intel] Permission denied')
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('postcode, address_line_1')
      .eq('id', job.customer_id)
      .maybeSingle()

    if (customerError) {
      console.error('[POST /api/jobs/:id/site-intel] Error fetching customer:', customerError)
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      )
    }

    // Initialize site intelligence and source
    let siteIntel: SiteIntel
    let source = 'placeholder_v1'

    // Session 77: Try real solar analysis if Google Solar is configured
    const googleSolarService = getGoogleSolarService()
    const osPlacesService = getOSPlacesService()

    if (googleSolarService.isConfigured() && osPlacesService.isConfigured()) {
      console.log('[POST /api/jobs/:id/site-intel] Using Google Solar + OS Places')

      try {
        // Step 1: Get precise location via OS Places
        const postcode = customer?.postcode
        const addressLine = customer?.address_line_1

        if (!postcode) {
          throw new Error('No postcode available for property lookup')
        }

        let propertyLocation
        if (addressLine) {
          // Match specific address
          propertyLocation = await osPlacesService.matchAddress(postcode, addressLine)
        } else {
          // Just use postcode, pick first result
          const addresses = await osPlacesService.searchByPostcode(postcode)
          propertyLocation = addresses[0] || null
        }

        if (!propertyLocation) {
          throw new Error('Could not resolve property location via OS Places')
        }

        console.log('[POST /api/jobs/:id/site-intel] Resolved location:', {
          lat: propertyLocation.latitude,
          lng: propertyLocation.longitude,
          uprn: propertyLocation.uprn,
        })

        // Step 2: Get solar data from Google Solar API
        const solarData = await googleSolarService.getPropertySolarData({
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
        })

        if (solarData.coverage !== 'NONE' && solarData.insights) {
          // Map Google Solar data to our format
          siteIntel = mapGoogleSolarToSiteIntel(solarData.insights, solarData.coverage)
          source = 'google_solar_v1'

          console.log('[POST /api/jobs/:id/site-intel] Successfully computed solar intel from Google Solar:', {
            coverage: solarData.coverage,
            potential_label: siteIntel.potential_label,
          })
        } else {
          // No coverage, fall back to placeholder
          console.log('[POST /api/jobs/:id/site-intel] No Google Solar coverage, falling back to placeholder')
          throw new Error('No solar coverage available')
        }
      } catch (error) {
        // Log error and fall back to placeholder
        console.error('[POST /api/jobs/:id/site-intel] Error using Google Solar, falling back to placeholder:', error)
        siteIntel = computePlaceholderSiteIntel({
          postcode: customer?.postcode,
          country_code: 'GB',
        })
        source = 'placeholder_v1'
      }
    } else {
      // Google Solar not configured, use placeholder
      console.log('[POST /api/jobs/:id/site-intel] Google Solar not configured, using placeholder')
      siteIntel = computePlaceholderSiteIntel({
        postcode: customer?.postcode,
        country_code: 'GB',
      })
      source = 'placeholder_v1'
    }

    // Build the full site_intel object with metadata
    const jobSiteIntel: JobSiteIntel = {
      ...siteIntel,
      last_computed_at: new Date().toISOString(),
      source,
    }

    // Update job metadata
    const existingMetadata = (job.metadata as Record<string, unknown>) || {}
    const updatedMetadata = {
      ...existingMetadata,
      site_intel: jobSiteIntel
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('[POST /api/jobs/:id/site-intel] Error updating job:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update job' },
        { status: 500 }
      )
    }

    console.log('[POST /api/jobs/:id/site-intel] Site intel computed and persisted successfully')
    return NextResponse.json({ data: jobSiteIntel })
  } catch (error) {
    console.error('Error in POST /api/jobs/:id/site-intel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
