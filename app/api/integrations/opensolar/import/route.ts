/**
 * OpenSolar Import API
 * POST /api/integrations/opensolar/import
 * 
 * Imports one or more OpenSolar projects as Cold Lava BOS jobs.
 * Creates customer, job, and links equipment.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantIdFromHeaders } from "@/lib/supabase/tenant-context"
import { headers } from "next/headers"
import { resolveOpenSolarCredentials } from "@/lib/services/integrations.service"

interface ImportRequest {
  projectIds: string[]
}

interface OpenSolarProject {
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
    output_annual_kwh?: number
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
      battery_total_kwh?: number
    }>
  }>
  stage?: number
  number_of_phases?: number
  roof_type?: string
  notes?: string
  site_notes?: string
  created_date: string
  modified_date: string
  share_link?: string
}

// Get auth token from OpenSolar using username/password
async function getOpenSolarToken(username: string, password: string): Promise<string> {
  const response = await fetch('https://api.opensolar.com/api-token-auth/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error(`OpenSolar authentication failed: ${response.status}`)
  }

  const data = await response.json()
  return data.token
}

// Fetch a single project with full details
async function fetchProjectDetails(
  projectId: string,
  orgId: string,
  token: string
): Promise<OpenSolarProject> {
  const response = await fetch(
    `https://api.opensolar.com/api/orgs/${orgId}/projects/${projectId}/`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch project ${projectId}: ${response.status}`)
  }

  return response.json()
}

// Map OpenSolar stage to job status
function mapStageToJobStatus(stage?: number): string {
  switch (stage) {
    case 0: return "lead"
    case 1: return "quoted"
    case 2: return "accepted"
    case 3: return "scheduled"
    case 4: return "completed"
    default: return "lead"
  }
}

export async function POST(request: NextRequest) {
  console.log('[OpenSolar Import] Starting import request')
  
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    console.log('[OpenSolar Import] Tenant ID:', tenantId)

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[OpenSolar Import] Auth error:', authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[OpenSolar Import] User:', user.id)

    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 400 })
    }

    // Parse request
    const body: ImportRequest = await request.json()
    const { projectIds } = body
    
    console.log('[OpenSolar Import] Project IDs to import:', projectIds)

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: "projectIds array is required" },
        { status: 400 }
      )
    }

    // Limit batch size
    if (projectIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 projects per import" },
        { status: 400 }
      )
    }

    // Get OpenSolar credentials
    const credentials = await resolveOpenSolarCredentials(tenantId)
    if (!credentials || !credentials.organizationId) {
      return NextResponse.json(
        { error: "OpenSolar integration not configured" },
        { status: 400 }
      )
    }

    // Get auth token
    let authToken = credentials.apiKey
    if (credentials.username && credentials.password) {
      authToken = await getOpenSolarToken(credentials.username, credentials.password)
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "No OpenSolar authentication configured" },
        { status: 400 }
      )
    }

    // Check which projects are already imported
    const { data: existingJobs } = await supabase
      .from('jobs')
      .select('opensolar_project_id')
      .eq('tenant_id', tenantId)
      .in('opensolar_project_id', projectIds)

    const alreadyImported = new Set(
      (existingJobs || []).map(j => j.opensolar_project_id)
    )

    // Filter out already imported
    const toImport = projectIds.filter(id => !alreadyImported.has(id))

    if (toImport.length === 0) {
      return NextResponse.json({
        data: {
          imported: 0,
          skipped: projectIds.length,
          message: "All projects already imported",
        },
      })
    }

    // Fetch and import each project
    const results = {
      imported: 0,
      failed: 0,
      skipped: alreadyImported.size,
      jobs: [] as Array<{ id: string; opensolar_id: string; title: string }>,
      errors: [] as Array<{ projectId: string; error: string }>,
    }

    for (const projectId of toImport) {
      try {
        // Fetch project details from OpenSolar
        const project = await fetchProjectDetails(
          projectId,
          credentials.organizationId,
          authToken
        )

        // Get primary contact
        const contact = project.contacts_data?.[0]
        
        // Get primary system
        const system = project.systems?.[0]

        // Build full address
        const addressParts = [
          project.address,
          project.locality,
          project.state,
          project.zip,
        ].filter(Boolean)
        const fullAddress = addressParts.join(', ')

        // Create or find customer
        let customerId: string | null = null
        const customerName = contact 
          ? `${contact.first_name || ''} ${contact.family_name || ''}`.trim()
          : project.title || 'Unknown'
        
        if (contact?.email) {
          // Check if customer exists by email
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('email', contact.email)
            .single()

          if (existingCustomer) {
            customerId = existingCustomer.id
            console.log('[Import] Found existing customer:', customerId)
          } else {
            // Create new customer with correct column names
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                tenant_id: tenantId,
                name: customerName,
                email: contact.email,
                phone: contact.phone || null,
                address_line_1: project.address || null,
                city: project.locality || null,
                postcode: project.zip || null,
                created_by: user.id,
                notes: `Imported from OpenSolar project ${projectId}`,
              })
              .select('id')
              .single()

            if (customerError) {
              console.error('[Import] Customer create error:', customerError)
            } else {
              customerId = newCustomer.id
              console.log('[Import] Created new customer:', customerId)
            }
          }
        } else {
          // No email - create customer with just a name
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: customerName,
              address_line_1: project.address || null,
              city: project.locality || null,
              postcode: project.zip || null,
              created_by: user.id,
              notes: `Imported from OpenSolar project ${projectId}`,
            })
            .select('id')
            .single()

          if (customerError) {
            console.error('[Import] Customer create (no email) error:', customerError)
          } else {
            customerId = newCustomer.id
            console.log('[Import] Created customer (no email):', customerId)
          }
        }

        // Create job - use only columns that exist in the jobs table
        const jobTitle = project.title || fullAddress || `OpenSolar Import ${projectId}`
        
        // Build notes with all the details
        const noteParts = []
        if (jobTitle) noteParts.push(`Project: ${jobTitle}`)
        if (fullAddress) noteParts.push(`Address: ${fullAddress}`)
        if (project.notes) noteParts.push(`Notes: ${project.notes}`)
        if (project.site_notes) noteParts.push(`Site Notes: ${project.site_notes}`)
        
        // Store extra data in metadata JSONB
        const jobMetadata = {
          opensolar_title: project.title,
          address: fullAddress,
          latitude: project.lat,
          longitude: project.lon,
          panel_count: system?.module_quantity,
          annual_production_kwh: system?.output_annual_kwh,
          number_of_phases: project.number_of_phases,
          roof_type: project.roof_type,
          imported_at: new Date().toISOString(),
          imported_by: user.id,
        }

        console.log('[Import] Creating job for project:', projectId, {
          customerId,
          systemSize: system?.kw_stc,
          estimatedValue: system?.price_including_tax,
        })
        
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            system_size_kwp: system?.kw_stc || null,
            estimated_value: system?.price_including_tax || null,
            notes: noteParts.join('\n\n') || null,
            metadata: jobMetadata,
            // OpenSolar link
            opensolar_project_id: String(project.id),
            opensolar_share_link: project.share_link,
            // Source
            source: 'opensolar',
          })
          .select('id')
          .single()

        if (jobError) {
          console.error('[Import] Job create error:', jobError)
          results.failed++
          results.errors.push({
            projectId,
            error: jobError.message,
          })
          continue
        }

        console.log('[Import] Job created successfully:', newJob.id)

        // Add equipment details to notes if available
        if (system && newJob) {
          const equipmentNotes = []
          
          if (system.modules?.length) {
            const panelInfo = system.modules
              .map(m => `${m.quantity}x ${m.manufacturer_name} ${m.code}`)
              .join(', ')
            equipmentNotes.push(`Panels: ${panelInfo}`)
          }
          
          if (system.inverters?.length) {
            const inverterInfo = system.inverters
              .map(i => `${i.quantity}x ${i.manufacturer_name} ${i.code}`)
              .join(', ')
            equipmentNotes.push(`Inverters: ${inverterInfo}`)
          }
          
          if (system.batteries?.length) {
            const batteryInfo = system.batteries
              .map(b => `${b.quantity}x ${b.manufacturer_name} ${b.code}`)
              .join(', ')
            equipmentNotes.push(`Batteries: ${batteryInfo}`)
          }

          if (equipmentNotes.length > 0) {
            // Append equipment notes to existing notes
            const { data: existingJob } = await supabase
              .from('jobs')
              .select('notes')
              .eq('id', newJob.id)
              .single()
            
            const currentNotes = existingJob?.notes || ''
            const fullNotes = [currentNotes, '\n--- Equipment ---', ...equipmentNotes].filter(Boolean).join('\n')
            
            await supabase
              .from('jobs')
              .update({ notes: fullNotes })
              .eq('id', newJob.id)
          }
        }

        results.imported++
        results.jobs.push({
          id: newJob.id,
          opensolar_id: projectId,
          title: jobTitle,
        })

      } catch (error) {
        console.error(`[Import] Failed to import project ${projectId}:`, error)
        results.failed++
        results.errors.push({
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      data: {
        imported: results.imported,
        failed: results.failed,
        skipped: results.skipped,
        jobs: results.jobs,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })
  } catch (error) {
    console.error("[OpenSolar Import API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
