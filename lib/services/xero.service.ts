/**
 * Session 109: Xero Service
 * Handles sync between BOS invoices and Xero accounting
 */

import { createClient } from '@/lib/supabase/server'
import { getIntegrationConnection } from './integrations.service'

const XERO_API = 'https://api.xero.com/api.xro/2.0'

interface XeroCredentials {
  access_token: string
  refresh_token?: string
  expires_at: string
  xero_tenant_id: string | null
  xero_tenant_name: string | null
}

interface XeroInvoice {
  InvoiceID?: string
  Type: 'ACCREC' | 'ACCPAY' // ACCREC = Accounts Receivable (sales)
  Contact: {
    ContactID?: string
    Name: string
    EmailAddress?: string
  }
  LineItems: Array<{
    Description: string
    Quantity: number
    UnitAmount: number
    AccountCode?: string
    TaxType?: string
  }>
  Date: string
  DueDate: string
  Reference?: string
  Status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  CurrencyCode?: string
}

/**
 * Get stored Xero credentials for a tenant
 */
export async function getXeroCredentials(tenantId: string): Promise<XeroCredentials | null> {
  const integration = await getIntegrationConnection(tenantId, 'xero')
  
  if (!integration || !integration.credentials) {
    return null
  }
  
  return integration.credentials as unknown as XeroCredentials
}

/**
 * Refresh Xero access token
 */
export async function refreshXeroToken(
  tenantId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    console.error('[Xero] Missing OAuth config')
    return null
  }
  
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  
  if (!response.ok) {
    console.error('[Xero] Token refresh failed')
    return null
  }
  
  const data = await response.json()
  
  // Update stored credentials
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  
  await supabase
    .from('integration_connections')
    .update({
      credentials: {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt,
        token_type: data.token_type,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'xero')
  
  return data.access_token
}

/**
 * Get valid access token (refreshing if needed)
 */
export async function getValidXeroToken(tenantId: string): Promise<{
  accessToken: string
  xeroTenantId: string
} | null> {
  const credentials = await getXeroCredentials(tenantId)
  
  if (!credentials) {
    return null
  }
  
  if (!credentials.xero_tenant_id) {
    console.error('[Xero] No Xero tenant ID stored')
    return null
  }
  
  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(credentials.expires_at)
  const now = new Date(Date.now() + 5 * 60 * 1000)
  
  let accessToken = credentials.access_token
  
  if (now >= expiresAt && credentials.refresh_token) {
    const newToken = await refreshXeroToken(tenantId, credentials.refresh_token)
    if (!newToken) {
      return null
    }
    accessToken = newToken
  }
  
  return {
    accessToken,
    xeroTenantId: credentials.xero_tenant_id,
  }
}

/**
 * Create invoice in Xero
 */
export async function createXeroInvoice(
  tenantId: string,
  invoice: XeroInvoice
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const auth = await getValidXeroToken(tenantId)
  
  if (!auth) {
    return { success: false, error: 'No valid Xero connection' }
  }
  
  const response = await fetch(`${XERO_API}/Invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'xero-tenant-id': auth.xeroTenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Invoices: [invoice] }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[Xero] Create invoice failed:', error)
    return { success: false, error }
  }
  
  const data = await response.json()
  const createdInvoice = data.Invoices?.[0]
  
  return {
    success: true,
    invoiceId: createdInvoice?.InvoiceID,
  }
}

/**
 * Get or create contact in Xero
 */
export async function getOrCreateXeroContact(
  tenantId: string,
  contact: { name: string; email?: string; phone?: string }
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  const auth = await getValidXeroToken(tenantId)
  
  if (!auth) {
    return { success: false, error: 'No valid Xero connection' }
  }
  
  // Try to find existing contact by name
  const searchResponse = await fetch(
    `${XERO_API}/Contacts?where=Name=="${encodeURIComponent(contact.name)}"`,
    {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'xero-tenant-id': auth.xeroTenantId,
      },
    }
  )
  
  if (searchResponse.ok) {
    const searchData = await searchResponse.json()
    if (searchData.Contacts?.length > 0) {
      return { success: true, contactId: searchData.Contacts[0].ContactID }
    }
  }
  
  // Create new contact
  const createResponse = await fetch(`${XERO_API}/Contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'xero-tenant-id': auth.xeroTenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Contacts: [{
        Name: contact.name,
        EmailAddress: contact.email,
        Phones: contact.phone ? [{
          PhoneType: 'DEFAULT',
          PhoneNumber: contact.phone,
        }] : undefined,
      }],
    }),
  })
  
  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error('[Xero] Create contact failed:', error)
    return { success: false, error }
  }
  
  const data = await createResponse.json()
  return {
    success: true,
    contactId: data.Contacts?.[0]?.ContactID,
  }
}

/**
 * Sync BOS quote to Xero invoice
 */
export async function syncQuoteToXero(
  tenantId: string,
  quote: {
    id: string
    quote_number: string
    customer_name: string
    customer_email?: string
    total_amount: number
    items: Array<{
      description: string
      quantity: number
      unit_price: number
    }>
    valid_until?: string
  }
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  // Get or create contact
  const contactResult = await getOrCreateXeroContact(tenantId, {
    name: quote.customer_name,
    email: quote.customer_email,
  })
  
  if (!contactResult.success || !contactResult.contactId) {
    return { success: false, error: contactResult.error || 'Failed to create contact' }
  }
  
  // Create invoice
  const today = new Date().toISOString().split('T')[0]
  const dueDate = quote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const invoice: XeroInvoice = {
    Type: 'ACCREC',
    Contact: {
      ContactID: contactResult.contactId,
      Name: quote.customer_name,
    },
    LineItems: quote.items.map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unit_price / 100, // Convert from pence to pounds
    })),
    Date: today,
    DueDate: dueDate,
    Reference: quote.quote_number,
    Status: 'DRAFT',
    CurrencyCode: 'GBP',
  }
  
  return createXeroInvoice(tenantId, invoice)
}

/**
 * Test Xero connection
 */
export async function testXeroConnection(
  tenantId: string
): Promise<{ success: boolean; organizationName?: string; error?: string }> {
  const auth = await getValidXeroToken(tenantId)
  
  if (!auth) {
    return { success: false, error: 'No valid Xero connection' }
  }
  
  // Get organization info
  const response = await fetch(`${XERO_API}/Organisation`, {
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'xero-tenant-id': auth.xeroTenantId,
    },
  })
  
  if (!response.ok) {
    return { success: false, error: 'Failed to connect to Xero' }
  }
  
  const data = await response.json()
  return {
    success: true,
    organizationName: data.Organisations?.[0]?.Name,
  }
}
