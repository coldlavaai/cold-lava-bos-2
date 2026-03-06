/**
 * OpenSolar Projects API
 * GET /api/integrations/opensolar/projects
 * 
 * Lists OpenSolar projects available for import.
 * Requires OpenSolar integration to be configured.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { resolveOpenSolarCredentials } from "@/lib/services/integrations.service"

interface OpenSolarAPIProject {
  id: number
  title: string
  address: string
  locality?: string
  state?: string
  zip?: string
  country_iso2?: string
  lat?: number
  lon?: number
  contacts_data?: Array<{
    id: number
    first_name: string
    family_name: string
    email: string
    phone: string
  }>
  systems?: Array<{
    id: number
    kw_stc: number
    price_including_tax: number
    module_quantity: number
    modules?: Array<{
      code: string
      manufacturer_name: string
      quantity: number
    }>
    inverters?: Array<{
      code: string
      manufacturer_name: string
      quantity: number
    }>
    batteries?: Array<{
      code: string
      manufacturer_name: string
      quantity: number
    }>
  }>
  stage?: number
  workflow?: {
    active_stage_id: number
  }
  created_date: string
  modified_date: string
  share_link?: string
  customer_proposal_data?: {
    url?: string
  }
}

export interface OpenSolarProject {
  opensolar_project_id: string
  title: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  address: string
  full_address: string
  lat?: number
  lon?: number
  system_size_kwp: number
  panel_count: number
  estimated_value: number
  status: string
  created_at: string
  modified_at: string
  share_link?: string
  proposal_url?: string
  already_imported: boolean
  job_id?: string
  // Equipment details
  panels?: Array<{ code: string; manufacturer: string; quantity: number }>
  inverters?: Array<{ code: string; manufacturer: string; quantity: number }>
  batteries?: Array<{ code: string; manufacturer: string; quantity: number }>
}

// Map OpenSolar stage to status string
function mapStageToStatus(stage?: number): string {
  switch (stage) {
    case 0: return "designing"
    case 1: return "quoting"
    case 2: return "sold"
    case 3: return "installing"
    case 4: return "complete"
    default: return "unknown"
  }
}

// Get auth token from OpenSolar using username/password
async function getOpenSolarToken(username: string, password: string): Promise<string> {
  const response = await fetch('https://api.opensolar.com/api-token-auth/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenSolar authentication failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.token
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    // Get OpenSolar credentials
    console.log('[OpenSolar Projects] Resolving credentials for tenant:', tenantId)
    const credentials = await resolveOpenSolarCredentials(tenantId)
    
    console.log('[OpenSolar Projects] Credentials resolved:', {
      hasCredentials: !!credentials,
      hasUsername: !!credentials?.username,
      hasPassword: !!credentials?.password,
      hasApiKey: !!credentials?.apiKey,
      hasOrgId: !!credentials?.organizationId,
      orgId: credentials?.organizationId,
    })
    
    if (!credentials) {
      console.log('[OpenSolar Projects] No credentials found')
      return NextResponse.json(
        { error: "OpenSolar integration not configured" },
        { status: 400 }
      )
    }

    if (!credentials.organizationId) {
      console.log('[OpenSolar Projects] No organization ID')
      return NextResponse.json(
        { error: "OpenSolar Organization ID not configured" },
        { status: 400 }
      )
    }

    // Get auth token
    let authToken = credentials.apiKey

    if (credentials.username && credentials.password) {
      try {
        console.log('[OpenSolar Projects] Getting auth token for user:', credentials.username)
        authToken = await getOpenSolarToken(credentials.username, credentials.password)
        console.log('[OpenSolar Projects] Auth token obtained successfully')
      } catch (error) {
        console.error('[OpenSolar Projects] Auth error:', error)
        return NextResponse.json(
          { error: "Failed to authenticate with OpenSolar: " + (error instanceof Error ? error.message : 'Unknown error') },
          { status: 401 }
        )
      }
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "No OpenSolar authentication configured" },
        { status: 400 }
      )
    }

    // Extract org ID (we've already validated it exists above)
    const orgId = credentials.organizationId

    // Helper function to fetch a single page with retry
    async function fetchPage(pageNum: number, pageLimit: number): Promise<OpenSolarAPIProject[] | null> {
      const apiUrl = `https://api.opensolar.com/api/orgs/${orgId}/projects/?page=${pageNum}&limit=${pageLimit}`
      console.log(`[OpenSolar Projects] Fetching page ${pageNum}:`, apiUrl)
      
      let response: Response | null = null
      let lastError = ''
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[OpenSolar Projects] Page ${pageNum}, Attempt ${attempt}/3`)
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          break
        }
        
        lastError = await response.text()
        console.error(`[OpenSolar Projects] Page ${pageNum}, Attempt ${attempt} failed:`, {
          status: response.status,
          error: lastError,
        })
        
        if (response.status !== 503 && response.status !== 429) {
          break
        }
        
        if (attempt < 3) {
          const waitMs = attempt * 1000
          console.log(`[OpenSolar Projects] Waiting ${waitMs}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitMs))
        }
      }
      
      if (!response || !response.ok) {
        console.error(`[OpenSolar Projects] Page ${pageNum} all attempts failed`)
        return null
      }
      
      try {
        const rawResponse = await response.text()
        const projects = JSON.parse(rawResponse)
        if (!Array.isArray(projects)) {
          console.error(`[OpenSolar Projects] Page ${pageNum} response is not an array`)
          return null
        }
        return projects
      } catch (parseError) {
        console.error(`[OpenSolar Projects] Page ${pageNum} parse error:`, parseError)
        return null
      }
    }

    // Fetch ALL pages - loop until we get an empty page or hit max
    const pageLimit = 50 // Fetch 50 per page for efficiency
    const maxPages = 20 // Safety limit: 20 pages * 50 = 1000 max projects
    const allProjects: OpenSolarAPIProject[] = []
    
    console.log('[OpenSolar Projects] Fetching all pages...')
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageProjects = await fetchPage(pageNum, pageLimit)
      
      if (!pageProjects) {
        // Error fetching page - return what we have so far or error on first page
        if (pageNum === 1) {
          return NextResponse.json(
            { error: 'Failed to fetch projects from OpenSolar' },
            { status: 500 }
          )
        }
        console.log(`[OpenSolar Projects] Stopping at page ${pageNum} due to error, returning ${allProjects.length} projects`)
        break
      }
      
      console.log(`[OpenSolar Projects] Page ${pageNum} returned ${pageProjects.length} projects`)
      allProjects.push(...pageProjects)
      
      // If we got 0 items, we've reached the end
      if (pageProjects.length === 0) {
        console.log(`[OpenSolar Projects] Last page reached (got 0 projects)`)
        break
      }
      
      // Small delay between pages to be nice to the API
      if (pageNum < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log(`[OpenSolar Projects] Total projects fetched: ${allProjects.length}`)
    const opensolarProjects = allProjects

    // Check which projects are already imported
    const { data: existingImports } = await supabase
      .from('jobs')
      .select('id, opensolar_project_id')
      .eq('tenant_id', tenantId)
      .not('opensolar_project_id', 'is', null)

    const importedMap = new Map(
      (existingImports || []).map(j => [j.opensolar_project_id, j.id])
    )

    // Transform to our format
    const projects: OpenSolarProject[] = opensolarProjects.map(p => {
      // Get primary contact
      const contact = p.contacts_data?.[0]
      const customerName = contact 
        ? `${contact.first_name} ${contact.family_name}`.trim()
        : p.title

      // Get primary system (first one)
      const system = p.systems?.[0]
      
      // Build full address
      const addressParts = [p.address, p.locality, p.state, p.zip].filter(Boolean)
      const fullAddress = addressParts.join(', ')

      // Check if already imported
      const jobId = importedMap.get(String(p.id))

      return {
        opensolar_project_id: String(p.id),
        title: p.title,
        customer_name: customerName,
        customer_email: contact?.email,
        customer_phone: contact?.phone,
        address: p.address,
        full_address: fullAddress,
        lat: p.lat,
        lon: p.lon,
        system_size_kwp: system?.kw_stc || 0,
        panel_count: system?.module_quantity || 0,
        estimated_value: system?.price_including_tax || 0,
        status: mapStageToStatus(p.stage),
        created_at: p.created_date,
        modified_at: p.modified_date,
        share_link: p.share_link,
        proposal_url: p.customer_proposal_data?.url,
        already_imported: !!jobId,
        job_id: jobId,
        // Equipment
        panels: system?.modules?.map(m => ({
          code: m.code,
          manufacturer: m.manufacturer_name,
          quantity: m.quantity,
        })),
        inverters: system?.inverters?.map(i => ({
          code: i.code,
          manufacturer: i.manufacturer_name,
          quantity: i.quantity,
        })),
        batteries: system?.batteries?.map(b => ({
          code: b.code,
          manufacturer: b.manufacturer_name,
          quantity: b.quantity,
        })),
      }
    })

    return NextResponse.json({
      data: projects,
      pagination: {
        total: projects.length,
        fetchedAll: true,
      },
    })
  } catch (error) {
    console.error("[OpenSolar Projects API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
