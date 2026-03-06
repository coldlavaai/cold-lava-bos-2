import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/[id]/equipment/system-design
 * Calculate system design summary from job equipment
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

    // Get all equipment assignments with specs
    const { data: assignments, error } = await supabase
      .from('job_equipment_assignments')
      .select(`
        *,
        equipment:equipment_catalogue(
          *,
          panel_specs(*),
          inverter_specs(*),
          battery_specs(*)
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .is('deleted_at', null)

    if (error) {
      console.error('[/api/jobs/[id]/equipment/system-design] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate system metrics
    let total_kwp = 0
    let total_panels = 0
    let inverter_power_w = 0
    let battery_capacity_kwh = 0
    const compatibility_warnings: string[] = []
    const string_configurations: unknown[] = []

    for (const assignment of assignments || []) {
      const eq = assignment.equipment

      // Panel calculations
      if (eq?.panel_specs) {
        const panel_kwp = (eq.panel_specs.power_rating_wp * assignment.quantity) / 1000
        total_kwp += panel_kwp
        total_panels += assignment.quantity
      }

      // Inverter calculations
      if (eq?.inverter_specs) {
        inverter_power_w += eq.inverter_specs.rated_ac_power_w * assignment.quantity
      }

      // Battery calculations
      if (eq?.battery_specs) {
        battery_capacity_kwh += eq.battery_specs.usable_capacity_kwh * assignment.quantity
      }
    }

    // Calculate DC/AC ratio
    const dc_ac_ratio = inverter_power_w > 0 ? (total_kwp * 1000) / inverter_power_w : 0

    // DC/AC ratio warnings
    if (dc_ac_ratio > 1.5) {
      compatibility_warnings.push(`High DC/AC ratio (${dc_ac_ratio.toFixed(2)}). Consider larger inverter.`)
    } else if (dc_ac_ratio < 0.8 && total_kwp > 0) {
      compatibility_warnings.push(`Low DC/AC ratio (${dc_ac_ratio.toFixed(2)}). Inverter may be oversized.`)
    }

    // Estimate annual generation (UK average ~900 kWh/kWp)
    const estimated_annual_kwh = Math.round(total_kwp * 900)

    // G98/G99 check
    const requires_g99 = inverter_power_w > 3680 // 16A single phase = 3.68kW
    let g98_g99_recommendation = 'No solar inverter detected'

    if (inverter_power_w > 0) {
      if (requires_g99) {
        g98_g99_recommendation = 'G99: Apply to DNO BEFORE installation'
      } else {
        g98_g99_recommendation = 'G98: Notify DNO within 28 days of commissioning'
      }
    }

    const systemDesign = {
      total_kwp: Math.round(total_kwp * 100) / 100,
      total_panels,
      inverter_power_w,
      battery_capacity_kwh: battery_capacity_kwh > 0 ? battery_capacity_kwh : undefined,
      dc_ac_ratio: Math.round(dc_ac_ratio * 100) / 100,
      estimated_annual_kwh,
      requires_g99,
      g98_g99_recommendation,
      string_configurations,
      compatibility_warnings,
    }

    return NextResponse.json({ data: systemDesign })
  } catch (error) {
    console.error('[/api/jobs/[id]/equipment/system-design] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
