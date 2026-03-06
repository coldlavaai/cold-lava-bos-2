import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { SpecSheetDocument } from '@/lib/pdf/spec-sheet-template'
import type { JobEquipmentAssignment, SystemDesign } from '@/types/equipment'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/[id]/spec-sheet
 * Generate a PDF spec sheet for a job's equipment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)
    const { id: jobId } = await params

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    // Get job with customer details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(name, email, postcode, address)
      `)
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get tenant for installer info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single()

    // Get equipment with specs
    const { data: equipment, error: eqError } = await supabase
      .from('job_equipment_assignments')
      .select(`
        *,
        equipment:equipment_catalogue(
          *,
          panel_specs(*),
          inverter_specs(*),
          battery_specs(*),
          mounting_specs(*),
          ev_charger_specs(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .is('deleted_at', null)

    if (eqError) {
      console.error('[/api/jobs/[id]/spec-sheet] Error fetching equipment:', eqError)
      return NextResponse.json({ error: eqError.message }, { status: 500 })
    }

    // Calculate system design
    let total_kwp = 0
    let total_panels = 0
    let inverter_power_w = 0
    let battery_capacity_kwh = 0

    for (const assignment of equipment || []) {
      const eq = assignment.equipment

      if (eq?.panel_specs) {
        total_kwp += (eq.panel_specs.power_rating_wp * assignment.quantity) / 1000
        total_panels += assignment.quantity
      }

      if (eq?.inverter_specs) {
        inverter_power_w += eq.inverter_specs.rated_ac_power_w * assignment.quantity
      }

      if (eq?.battery_specs) {
        battery_capacity_kwh += eq.battery_specs.usable_capacity_kwh * assignment.quantity
      }
    }

    const dc_ac_ratio = inverter_power_w > 0 ? (total_kwp * 1000) / inverter_power_w : 0
    const estimated_annual_kwh = Math.round(total_kwp * 900)
    const requires_g99 = inverter_power_w > 3680

    const systemDesign: SystemDesign = {
      total_kwp: Math.round(total_kwp * 100) / 100,
      total_panels,
      inverter_power_w,
      battery_capacity_kwh: battery_capacity_kwh > 0 ? battery_capacity_kwh : undefined,
      dc_ac_ratio: Math.round(dc_ac_ratio * 100) / 100,
      estimated_annual_kwh,
      requires_g99,
      g98_g99_recommendation: requires_g99
        ? 'G99: Apply to DNO BEFORE installation'
        : 'G98: Notify DNO within 28 days',
      string_configurations: [],
      compatibility_warnings: [],
    }

    // Build customer address
    const customer = job.customer as { name?: string; postcode?: string; address?: Record<string, string> } | null
    const customerAddress = customer?.address
      ? [
          customer.address.line1,
          customer.address.line2,
          customer.address.city,
          customer.address.county,
          customer?.postcode,
        ].filter(Boolean).join(', ')
      : customer?.postcode || 'Address not provided'

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <SpecSheetDocument
        customerName={customer?.name || 'Customer'}
        customerAddress={customerAddress}
        jobReference={job.job_number || jobId}
        quoteDate={new Date().toLocaleDateString('en-GB')}
        equipment={equipment as JobEquipmentAssignment[]}
        systemDesign={systemDesign}
        installerName={tenant?.name}
        installerMcsNumber={(tenant?.settings as Record<string, string>)?.mcs_number}
      />
    )

    // Return PDF - Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="spec-sheet-${job.job_number || jobId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[/api/jobs/[id]/spec-sheet] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate spec sheet' },
      { status: 500 }
    )
  }
}
