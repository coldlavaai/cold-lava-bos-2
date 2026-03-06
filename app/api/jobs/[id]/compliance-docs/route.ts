import { createClient } from '@/lib/supabase/server'
import { getTenantIdFromHeaders } from '@/lib/supabase/tenant-context'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Type definitions for compliance document generation
interface ComplianceJob {
  job_number: string
  customer_id: string
  system_size_kwp?: number | null
  site_supply_type?: string | null
  export_capacity_kw?: number | null
  estimated_value?: number | null
  dno_required?: boolean | null
  dno_reference?: string | null
  installer_name?: string | null
  installer_mcs_number?: string | null
  inverter_model?: string | null
  panel_model?: string | null
  mounting_system?: string | null
  notes?: string | null
}

interface ComplianceCustomer {
  name: string
  email?: string | null
  phone?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
}

// POST /api/jobs/:id/compliance-docs - Generate compliance document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    console.log('[POST /api/jobs/:id/compliance-docs] Request received for job:', jobId)

    const supabase = await createClient()
    const headersList = await headers()
    const tenantId = await getTenantIdFromHeaders(headersList)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context - check cookies' },
        { status: 400 }
      )
    }

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Fetch customer data
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', job.customer_id)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Generate HTML document
    const html = generateComplianceDocument(job, customer)

    // Return as downloadable HTML file
    // Browsers can save this as PDF using Print > Save as PDF
    const filename = `job-${job.job_number}-compliance-pack.html`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[POST /api/jobs/:id/compliance-docs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    )
  }
}

function generateComplianceDocument(job: ComplianceJob, customer: ComplianceCustomer): string {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatAddress = () => {
    const parts = [
      customer.address_line_1,
      customer.address_line_2,
      customer.city,
      customer.postcode,
    ].filter(Boolean)
    return parts.join(', ')
  }

  // Calculate completion status for sections
  const calculateStatus = (fields: (string | number | boolean | null | undefined)[]) => {
    const filled = fields.filter(f => f).length
    const total = fields.length
    if (filled === 0) return { badge: 'incomplete', text: 'Not Started' }
    if (filled === total) return { badge: 'complete', text: 'Complete' }
    return { badge: 'partial', text: `${filled}/${total} Complete` }
  }

  const systemStatus = calculateStatus([job.site_supply_type, job.export_capacity_kw])
  const dnoStatus = job.dno_required
    ? calculateStatus([job.dno_reference])
    : { badge: 'complete', text: 'Not Required' }
  const installerStatus = calculateStatus([job.installer_name, job.installer_mcs_number])
  const equipmentStatus = calculateStatus([job.inverter_model, job.panel_model, job.mounting_system])

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Pack - Job ${job.job_number}</title>
  <style>
    @media print {
      @page {
        margin: 2cm;
      }
      body {
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }

    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }

    .job-number {
      font-size: 18px;
      color: #666;
      margin-top: 10px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      background: #2563eb;
      color: white;
      padding: 10px 15px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
    }

    .field-group {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 10px;
      margin-bottom: 12px;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    .field-label {
      font-weight: bold;
      color: #555;
    }

    .field-value {
      color: #333;
    }

    .empty-value {
      color: #999;
      font-style: italic;
    }

    .print-instructions {
      background: #f0f9ff;
      border: 1px solid #2563eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }

    .print-instructions h3 {
      margin-top: 0;
      color: #2563eb;
    }

    .summary-box {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .summary-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 15px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .summary-item {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .summary-item-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .summary-item-value {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-complete {
      background: #dcfce7;
      color: #166534;
    }

    .badge-incomplete {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-partial {
      background: #fef3c7;
      color: #92400e;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="print-instructions no-print">
    <h3>📄 Save as PDF</h3>
    <p>To save this document as a PDF, use your browser's print function (Ctrl/Cmd + P) and select "Save as PDF" as the destination.</p>
  </div>

  <div class="header">
    <h1>Project Compliance Pack</h1>
    <div class="job-number">Job Number: ${job.job_number}</div>
    <div class="job-number">Generated: ${formatDate(new Date().toISOString())}</div>
  </div>

  <div class="summary-box">
    <div class="summary-title">Compliance Summary</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-item-label">System Details</div>
        <div class="summary-item-value">
          <span class="badge badge-${systemStatus.badge}">${systemStatus.text}</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">DNO Notification</div>
        <div class="summary-item-value">
          <span class="badge badge-${dnoStatus.badge}">${dnoStatus.text}</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Installer Info</div>
        <div class="summary-item-value">
          <span class="badge badge-${installerStatus.badge}">${installerStatus.text}</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Equipment Details</div>
        <div class="summary-item-value">
          <span class="badge badge-${equipmentStatus.badge}">${equipmentStatus.text}</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Customer</div>
        <div class="summary-item-value">${customer.name}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">System Size</div>
        <div class="summary-item-value">${job.system_size_kwp ? `${job.system_size_kwp} kWp` : 'TBD'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="field-group">
      <div class="field-label">Customer Name:</div>
      <div class="field-value">${customer.name || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Email:</div>
      <div class="field-value">${customer.email || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Phone:</div>
      <div class="field-value">${customer.phone || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Installation Address:</div>
      <div class="field-value">${formatAddress() || '<span class="empty-value">Not specified</span>'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      System Details
      <span class="badge badge-${systemStatus.badge}" style="float: right;">${systemStatus.text}</span>
    </div>
    <div class="field-group">
      <div class="field-label">System Size:</div>
      <div class="field-value">${job.system_size_kwp ? `${job.system_size_kwp} kWp` : '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Supply Type:</div>
      <div class="field-value">${job.site_supply_type || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Export Capacity:</div>
      <div class="field-value">${job.export_capacity_kw ? `${job.export_capacity_kw} kW` : '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Estimated Value:</div>
      <div class="field-value">${job.estimated_value ? `£${(job.estimated_value / 100).toFixed(2)}` : '<span class="empty-value">Not specified</span>'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      DNO Information
      <span class="badge badge-${dnoStatus.badge}" style="float: right;">${dnoStatus.text}</span>
    </div>
    <div class="field-group">
      <div class="field-label">DNO Required:</div>
      <div class="field-value">${job.dno_required ? 'Yes' : 'No'}</div>
    </div>
    ${job.dno_required ? `
    <div class="field-group">
      <div class="field-label">DNO Reference:</div>
      <div class="field-value">${job.dno_reference || '<span class="empty-value">Pending</span>'}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">
      Installer Information
      <span class="badge badge-${installerStatus.badge}" style="float: right;">${installerStatus.text}</span>
    </div>
    <div class="field-group">
      <div class="field-label">Installer Name:</div>
      <div class="field-value">${job.installer_name || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">MCS Certificate Number:</div>
      <div class="field-value">${job.installer_mcs_number || '<span class="empty-value">Not specified</span>'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      Equipment Details
      <span class="badge badge-${equipmentStatus.badge}" style="float: right;">${equipmentStatus.text}</span>
    </div>
    <div class="field-group">
      <div class="field-label">Inverter Model:</div>
      <div class="field-value">${job.inverter_model || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Panel Model:</div>
      <div class="field-value">${job.panel_model || '<span class="empty-value">Not specified</span>'}</div>
    </div>
    <div class="field-group">
      <div class="field-label">Mounting System:</div>
      <div class="field-value">${job.mounting_system || '<span class="empty-value">Not specified</span>'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div class="field-value" style="padding: 10px; background: #f9fafb; min-height: 60px; border-radius: 4px;">
      ${job.notes || '<span class="empty-value">No additional notes</span>'}
    </div>
  </div>

  <div class="footer">
    <p>This document was generated on ${formatDate(new Date().toISOString())} for job ${job.job_number}</p>
    <p>For official MCS certification and DNO applications, please ensure all required fields are completed and supporting documentation is attached.</p>
  </div>
</body>
</html>`
}
