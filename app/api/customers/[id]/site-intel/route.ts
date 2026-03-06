import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { computePlaceholderSiteIntel, type SiteIntel } from '@/lib/site-intel/placeholder'
import { type CustomerSiteIntel } from '@/lib/site-intel/types'
import { getOSPlacesService } from '@/lib/services/os-places.service'
import { getGoogleSolarService } from '@/lib/services/google-solar.service'
import { mapGoogleSolarToSiteIntel } from '@/lib/site-intel/google-solar-mapper'

// GET /api/customers/:id/site-intel - Get stored site intelligence for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (customerError) {
      console.error('[GET /api/customers/:id/site-intel] Error fetching customer:', customerError)
      return NextResponse.json(
        { error: customerError.message || 'Failed to fetch customer' },
        { status: 500 }
      )
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const metadata = customer.metadata as Record<string, unknown> | null
    const siteIntel = metadata?.site_intel as CustomerSiteIntel | null

    return NextResponse.json({ data: siteIntel })
  } catch (error) {
    console.error('Error in GET /api/customers/:id/site-intel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customers/:id/site-intel - Compute and persist site intelligence for a customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id } = await params

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context' },
        { status: 400 }
      )
    }

    // Fetch customer data needed for enrichment
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, metadata, postcode, address_line_1')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (customerError) {
      console.error('[POST /api/customers/:id/site-intel] Error fetching customer:', customerError)
      return NextResponse.json(
        { error: customerError.message || 'Failed to fetch customer' },
        { status: 500 }
      )
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Initialize site intelligence and source
    let siteIntel: SiteIntel
    let source = 'placeholder_v1'

    const googleSolarService = getGoogleSolarService()
    const osPlacesService = getOSPlacesService()

    if (googleSolarService.isConfigured() && osPlacesService.isConfigured()) {
      try {
        const postcode = customer.postcode as string | null
        const addressLine = customer.address_line_1 as string | null

        if (!postcode) {
          throw new Error('No postcode available for property lookup')
        }

        let propertyLocation
        if (addressLine) {
          propertyLocation = await osPlacesService.matchAddress(postcode, addressLine)
        } else {
          const addresses = await osPlacesService.searchByPostcode(postcode)
          propertyLocation = addresses[0] || null
        }

        if (!propertyLocation) {
          throw new Error('Could not resolve property location via OS Places')
        }

        const solarData = await googleSolarService.getPropertySolarData({
          latitude: propertyLocation.latitude,
          longitude: propertyLocation.longitude,
        })

        if (solarData.coverage !== 'NONE' && solarData.insights) {
          siteIntel = mapGoogleSolarToSiteIntel(solarData.insights, solarData.coverage)
          source = 'google_solar_v1'
        } else {
          throw new Error('No solar coverage available')
        }
      } catch (error) {
        console.error('[POST /api/customers/:id/site-intel] Error using Google Solar, falling back to placeholder:', error)
        siteIntel = computePlaceholderSiteIntel({
          postcode: customer.postcode as string | null,
          country_code: 'GB',
        })
        source = 'placeholder_v1'
      }
    } else {
      siteIntel = computePlaceholderSiteIntel({
        postcode: customer.postcode as string | null,
        country_code: 'GB',
      })
      source = 'placeholder_v1'
    }

    const customerSiteIntel: CustomerSiteIntel = {
      ...siteIntel,
      last_computed_at: new Date().toISOString(),
      source,
    }

    const existingMetadata = (customer.metadata as Record<string, unknown>) || {}
    const updatedMetadata = {
      ...existingMetadata,
      site_intel: customerSiteIntel,
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('[POST /api/customers/:id/site-intel] Error updating customer:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update customer' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: customerSiteIntel })
  } catch (error) {
    console.error('Error in POST /api/customers/:id/site-intel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
