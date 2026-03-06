// Entities from the backend API
export interface Customer {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  postcode: string | null
  source_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Session 79: Customer-level metadata (e.g., site_intel)
  metadata?: Record<string, unknown> | null
}

export interface JobStage {
  id: string
  tenant_id: string
  name: string
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StageTransition {
  id: string
  job_id: string
  from_stage_id: string | null
  to_stage_id: string
  transitioned_at: string
  notes: string | null
  transitioned_by: string
  // Expanded fields
  from_stage?: JobStage | null
  to_stage?: JobStage
}

export interface Job {
  id: string
  tenant_id: string
  customer_id: string
  job_number: string
  current_stage_id: string
  assigned_to: string | null
  estimated_value: number | null
  system_size_kwp: number | null
  source: string | null
  tags: string[] | null
  notes: string | null
  stage_changed_at: string
  created_at: string
  updated_at: string
  // Compliance fields
  site_supply_type: string | null
  export_capacity_kw: number | null
  dno_required: boolean | null
  dno_reference: string | null
  installer_name: string | null
  installer_mcs_number: string | null
  inverter_model: string | null
  panel_model: string | null
  mounting_system: string | null
  // Generated compliance status (Session 58 - optional until migration runs)
  compliance_status?: 'ready' | 'in_progress' | 'not_started' | 'dno_pending' | null
  // Website score from lead gen analysis (0-100)
  website_score?: number | null
  // Sales pipeline fields
  region?: string | null
  lead_type?: string | null
  vertical?: string | null
  decision_maker_name?: string | null
  decision_maker_title?: string | null
  decision_maker_linkedin?: string | null
  decision_maker_phone?: string | null
  decision_maker_email?: string | null
  company_employee_count?: string | null
  company_revenue?: string | null
  company_locations?: number | null
  pain_points?: string[] | null
  call_brief?: string | null
  estimated_deal_value?: number | null
  sales_approach?: string | null
  // Integration metadata (Session 64 - OpenSolar integration)
  // Structure: { opensolar?: { project_id?: string | null, project_url?: string | null } }
  metadata?: Record<string, unknown> | null
  // Installation fields
  installation_address?: string | null
  installation_postcode?: string | null
  installation_scheduled_date?: string | null
  installation_completed_date?: string | null
  mcs_submission_status?: string | null
  dno_application_status?: string | null
  // Expanded fields
  customer?: Customer
  current_stage?: JobStage
  stage_transitions?: StageTransition[]
}

export interface Task {
  id: string
  tenant_id: string
  title: string
  description: string | null
  due_date: string | null
  due_time?: string | null
  priority: string
  status: string
  assigned_to: string | null
  linked_entity_type: string | null
  linked_entity_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  // Expanded joins
  assignee?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
}

export interface InstallationPhoto {
  id: string
  tenant_id: string
  job_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  caption: string | null
  uploaded_by: string | null
  created_at: string
  url?: string | null // signed URL, populated by API
}

export interface InstallationDocument {
  id: string
  tenant_id: string
  job_id: string
  document_type: "dno_approval" | "mcs_certificate" | "handover_pack" | "om_manual" | "other"
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
  url?: string | null // signed URL, populated by API
}

export interface Appointment {
  id: string
  tenant_id: string
  customer_id: string | null
  job_id: string | null
  appointment_type: string | null  // Normalized type name from API
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  assigned_to: string | null
  status: string
  created_by: string
  created_at: string
  updated_at: string
  // Expanded fields
  customer?: Customer
  job?: Job
  assignee?: TenantUser  // Expanded user data for assigned_to
}

// Pagination metadata
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Query parameters
export interface JobsQueryParams {
  search?: string
  status?: string
  assigned_to?: string
  current_stage_id?: string
  stage_ids?: string // Comma-separated list of stage IDs for multi-select filtering
  compliance_status?: string // Session 60 - Phase 4: Filter by compliance status
  tags?: string
  page?: number
  limit?: number
  offset?: number
}

export interface CustomersQueryParams {
  search?: string
  source_id?: string
  page?: number
  limit?: number
  offset?: number
}

export interface TasksQueryParams {
  entity_type?: string
  entity_id?: string
  status?: string
  priority?: string
  assigned_to?: string
  due_before?: string
  due_after?: string
  view?: "today" | "week" | "overdue"
  limit?: number
  offset?: number
}

export interface AppointmentsQueryParams {
  customer_id?: string
  job_id?: string
  type?: string
  status?: string
  assigned_to?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

// Communications
export interface Thread {
  id: string
  tenant_id: string
  customer_id: string | null
  customer_name: string
  channel: string
  subject: string | null
  last_message: string
  last_message_at: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  direction: "inbound" | "outbound"
  body: string
  status?: string
  sent_at: string
  created_at: string
}

// Tenant Settings
export interface Tenant {
  id: string
  name?: string // Legacy field
  company_name?: string // Spec-aligned field from /api/auth/me
  slug?: string
  tier?: string
  settings?: Record<string, unknown>
  is_active?: boolean
  timezone?: string
  created_at?: string
  updated_at?: string
}

// Users
export interface TenantUser {
  id: string
  tenant_id: string
  // The underlying auth/user table ID. This is what foreign keys like
  // jobs.assigned_to should point at.
  user_id: string
  email: string
  name: string
  role: string
  profile_id: string | null
  status: string
  created_at: string
  updated_at: string
}

// Permission actions per module
export interface ModulePermissions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

// Full permissions map
export interface ProfilePermissions {
  customers: ModulePermissions
  jobs: ModulePermissions
  calendar: ModulePermissions
  comms: ModulePermissions
  settings: ModulePermissions
  [key: string]: ModulePermissions
}

// User profile (permission template)
export interface UserProfile {
  id: string
  tenant_id: string
  name: string
  description: string | null
  permissions: ProfilePermissions
  is_system: boolean
  created_at: string
  updated_at: string
}

// Current authenticated user (Session 73)
export interface CurrentUser {
  user: {
    id: string
    email: string
    full_name: string
    role: string
    avatar_url: string | null
    created_at: string
    updated_at: string
  }
  tenant: {
    id: string
    company_name: string
    slug: string
    tier: string
    settings: Record<string, unknown>
    is_active: boolean
  }
  permissions: {
    can_manage_users: boolean
    can_manage_billing: boolean
    can_delete_jobs: boolean
    can_access_analytics: boolean
  }
}

// Customer Timeline
export interface TimelineItem {
  id: string
  type: 'job' | 'job_event' | 'message_thread' | 'appointment' | 'call_recording' | 'customer_note'
  timestamp: string
  title: string
  description?: string
  // Foreign keys for navigation
  job_id?: string
  thread_id?: string
  appointment_id?: string
  // Additional metadata
  metadata?: Record<string, unknown>
}

// Session 58: Compliance Status Views (optional until migration runs)

export interface ComplianceDashboardSummary {
  tenant_id: string
  // Status counts
  total_jobs: number
  ready_count: number
  in_progress_count: number
  not_started_count: number
  dno_pending_count: number
  // Percentages
  ready_percentage: number
  started_percentage: number
  // DNO statistics
  dno_required_count: number
  dno_pending_submission: number
  dno_submitted_count: number
  // Field completion
  avg_critical_fields_filled: number
  // Stage breakdown
  leads_count: number
  active_jobs_count: number
  completed_jobs_count: number
  cancelled_jobs_count: number
  non_lead_ready_count: number
  non_lead_total: number
  // Recent activity
  updated_last_week: number
  updated_last_month: number
}

export interface JobMissingComplianceFields {
  id: string
  tenant_id: string
  job_number: string
  customer_id: string
  customer_name: string
  compliance_status: 'in_progress' | 'not_started' | 'dno_pending'
  current_stage_id: string
  stage_name: string
  stage_type: string
  dno_required: boolean | null
  missing_critical_fields: string[]
  missing_optional_fields: string[]
  missing_critical_count: number
  critical_fields_total: number
  updated_at: string
}

// Quotes
export interface QuoteLineItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  position: number
}

export interface Quote {
  id: string
  tenant_id: string
  job_id: string
  quote_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  total_amount: number | null
  valid_until: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Expanded fields
  line_items?: QuoteLineItem[]
  job?: Job
  creator?: TenantUser
}

// OpenSolar Integration (Session 71)
export interface OpenSolarProjectSummary {
  project_id: string
  project_name?: string
  status?: string
  system_size_kwp?: number
  total_price?: number
  currency?: string
  last_updated_at?: string
  primary_proposal_url?: string
  primary_proposal_pdf_url?: string
}

// Communications Integrations (Session 88)
export interface ProviderStatus {
  provider: 'sendgrid' | 'twilio'
  name: string
  channel: 'email' | 'sms'
  configured: boolean
  details: {
    fromEmail?: string | null
    fromName?: string | null
    phoneNumber?: string | null
  }
}

export interface CommunicationsIntegrationsStatus {
  communications: {
    email: ProviderStatus
    sms: ProviderStatus
  }
}

// Integration Connections (Session 89)
export interface IntegrationConnection {
  id: string
  tenant_id: string
  integration_type: string
  name: string | null
  credentials: Record<string, unknown>
  oauth_access_token: string | null
  oauth_refresh_token: string | null
  oauth_expires_at: string | null
  oauth_scopes: string[] | null
  is_active: boolean
  last_verified_at: string | null
  last_error: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
}

// Request/Response types for integration configuration
export interface ConfigureEmailIntegrationRequest {
  provider: 'sendgrid'
  apiKey: string
  fromEmail: string
  fromName?: string
}

export interface ConfigureSmsIntegrationRequest {
  provider: 'twilio'
  accountSid: string
  authToken: string
  phoneNumber: string
}

export interface TestEmailRequest {
  toEmail?: string
}

export interface TestSmsRequest {
  toPhone?: string
}

export interface TestIntegrationResponse {
  success: boolean
  message: string
  details?: Record<string, unknown> // Provider-specific test data
}

// Session 90: Unified Integrations System
export type IntegrationType =
  | 'sendgrid'
  | 'twilio'
  | 'opensolar'
  | 'stripe'
  | 'google_calendar'
  | 'otter'
  | 'xero'
  | 'quickbooks'

export type IntegrationCategory =
  | 'communications'
  | 'solar'
  | 'payments'
  | 'accounting'
  | 'calendar'
  | 'transcription'

export interface IntegrationStatus {
  integration_type: IntegrationType
  name: string
  description: string
  category: IntegrationCategory
  configured: boolean
  is_active: boolean
  last_verified_at: string | null
  last_error: string | null
  details: Record<string, unknown> // Non-sensitive details only
}

export interface GetIntegrationsResponse {
  categories: {
    communications: {
      email?: IntegrationStatus
      sms?: IntegrationStatus
    }
    solar: {
      opensolar?: IntegrationStatus
    }
    payments: {
      stripe?: IntegrationStatus
    }
    accounting: {
      xero?: IntegrationStatus
      quickbooks?: IntegrationStatus
    }
    calendar: {
      google_calendar?: IntegrationStatus
    }
    transcription: {
      otter?: IntegrationStatus
    }
  }
}

// OpenSolar Integration (Session 90)
export interface ConfigureOpenSolarRequest {
  username?: string
  password?: string
  apiKey?: string // Legacy support
  organizationId?: string
  defaultProjectId?: string
}

export interface TestOpenSolarResponse extends TestIntegrationResponse {
  details?: {
    organizationName?: string
    projectsCount?: number
  }
}

// Stripe Integration (Session 90 - Stub)
export interface ConfigureStripeRequest {
  publishableKey: string
  secretKey: string
  webhookSecret?: string
}

// Google Calendar Integration (Session 90 - Stub)
export interface ConfigureGoogleCalendarRequest {
  calendarId: string
}

// WhatsApp extension to Twilio (Session 90)
export interface ConfigureTwilioRequest extends ConfigureSmsIntegrationRequest {
  whatsappNumber?: string
}

// Otter.ai Integration (Session 93)
export interface ConfigureOtterRequest {
  webhookSecret: string
}

// ====================================
// Call Recordings (Session 92)
// ====================================

export interface CallRecordingActionItem {
  text: string
  owner_user_id?: string
  due_date?: string
}

export interface CallRecording {
  id: string
  tenant_id: string

  // Linkage to BOS entities
  customer_id?: string
  job_id?: string
  message_thread_id?: string

  // Provider & external references
  provider: string
  provider_call_id?: string
  provider_meeting_url?: string

  // Media & transcription
  audio_url?: string
  transcript?: string
  summary?: string
  action_items?: CallRecordingActionItem[]
  language?: string

  // Call metadata
  direction?: 'inbound' | 'outbound'
  started_at?: string
  ended_at?: string
  duration_seconds?: number

  // Timestamps
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateCallRecordingRequest {
  // Linkage to BOS entities (at least one recommended)
  customer_id?: string
  job_id?: string
  message_thread_id?: string

  // Provider information
  provider: string
  provider_call_id?: string
  provider_meeting_url?: string

  // Media & transcription
  audio_url?: string
  transcript?: string
  summary?: string
  action_items?: CallRecordingActionItem[]
  language?: string

  // Call metadata
  direction?: 'inbound' | 'outbound'
  started_at?: string
  ended_at?: string
  duration_seconds?: number
}

// ============================================================================
// DBR (Database Reactivation) Types
// Based on docs/03-API-SPEC-PART2.md Section 30
// Session 99A: DBR Backend
// ============================================================================

export interface DBRCampaign {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived'

  // Multi-channel configuration
  channel: 'sms' | 'email' | 'whatsapp'

  sms_account_id: string | null
  twilio_phone_override: string | null
  calcom_link: string | null

  message_delays: {
    m1_to_m2_hours?: number
    m2_to_m3_hours?: number
    m3_to_dead_hours?: number
  } | null
  rate_limit_per_interval: number
  rate_limit_interval_seconds: number
  working_hours: {
    start: number
    end: number
    days: number[] // 1-7 (Mon-Sun)
  } | null

  source_type: 'csv' | 'manual' | 'crm_segment'
  source_details: object | null

  total_contacts: number
  active_contacts: number
  replied_contacts: number
  call_booked_contacts: number
  installed_contacts: number
  reply_rate: number | null
  call_booking_rate: number | null

  last_run_at: string | null
  next_run_at: string | null

  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DBRLead {
  id: string
  tenant_id: string
  campaign_id: string
  customer_id: string
  customer_name: string | null
  phone: string
  email: string | null
  postcode: string | null

  message_stage: 'Ready' | 'M1_sent' | 'M2_sent' | 'M3_sent' | 'In_conversation' | 'Ended'

  contact_status:
    | 'NEUTRAL'
    | 'HOT'
    | 'WARM'
    | 'COLD'
    | 'CALL_BOOKED'
    | 'INSTALLED'
    | 'DEAD'
    | 'REMOVED'
    | 'BAD_NUMBER'

  outcome: 'WON' | 'LOST' | 'ARCHIVED' | null
  outcome_reason: string | null
  outcome_notes: string | null
  moved_to_history_at: string | null

  manual_mode: boolean

  m1_sent_at: string | null
  m2_sent_at: string | null
  m3_sent_at: string | null
  first_reply_at: string | null
  latest_reply_at: string | null
  call_booked_at: string | null
  call_scheduled_at: string | null
  last_called_at: string | null

  priority_score: number
  priority_updated_at: string | null
  last_call_outcome: 'answered' | 'no_answer' | 'voicemail' | 'wrong_number' | 'callback_requested' | null
  call_count: number
  call_prep_notes: string | null

  conversation_history: string | null
  latest_reply: string | null

  archived: boolean
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// DBR union types for components
export type DBRMessageStage = DBRLead['message_stage']
export type DBRContactStatus = DBRLead['contact_status']

export interface DBRCallQueueItem {
  lead_id: string
  campaign_id: string
  customer_id: string
  customer_name: string
  phone: string
  postcode: string | null
  priority_score: number
  last_called_at: string | null
  last_call_outcome: string | null
}

export interface DBRAnalyticsOverview {
  total_campaigns: number
  active_campaigns: number
  total_contacts: number
  replied_contacts: number
  reply_rate: number
  calls_booked_last_7_days: number
}

// Session 105: Analytics v1 - Tenant Overview
export interface TenantAnalyticsOverview {
  date_range: {
    start: string // ISO date
    end: string // ISO date
  }
  customers: {
    total: number
    new_last_30_days: number
  }
  jobs: {
    total: number
    new_last_30_days: number
    jobs_completed_last_30_days: number
    pipeline_value_pence: number
    won_value_pence_last_30_days: number
  }
  communications: {
    emails_sent_last_30_days: number
    sms_sent_last_30_days: number
  }
}

// Request/Response types for DBR APIs

export interface CreateDBRCampaignRequest {
  name: string
  description?: string
  channel?: 'sms' | 'email' | 'whatsapp'
  sms_account_id?: string
  twilio_phone_override?: string
  calcom_link?: string
  message_delays?: {
    m1_to_m2_hours?: number
    m2_to_m3_hours?: number
    m3_to_dead_hours?: number
  }
  rate_limit_per_interval?: number
  rate_limit_interval_seconds?: number
  working_hours?: {
    start: number
    end: number
    days: number[]
  }
  source_type?: 'csv' | 'manual' | 'crm_segment'
  source_details?: object
}

export interface UpdateDBRLeadRequest {
  contact_status?: DBRLead['contact_status']
  manual_mode?: boolean
  outcome?: 'WON' | 'LOST' | 'ARCHIVED' | null
  outcome_reason?: string | null
  outcome_notes?: string | null
  priority_score?: number
  call_prep_notes?: string | null
  version: number // For optimistic locking
}

export interface SendDBRLeadMessageRequest {
  body: string
  useDefaultNumber?: boolean
}

export interface SendDBRLeadMessageResponse {
  message_id: string
  sent_at: string
}

// ========================================
// Survey & Visit Routing Types
// ========================================

export interface EligibleJob {
  job_id: string
  job_number: string | null
  customer_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  full_postcode: string
  postcode_area: string
  address_line_1: string
  address_line_2: string
  city: string
  default_visit_duration_minutes: number
  created_at: string
}

export interface RouteStop {
  id: string
  route_id: string
  customer_id: string
  job_id: string
  stop_number: number
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  full_postcode: string
  postcode_area: string | null
  arrival_time: string
  visit_duration_minutes: number
  departure_time: string
  travel_time_to_next_minutes: number
  notes: string | null
  created_at: string
}

export interface Route {
  id: string
  tenant_id: string
  route_date: string
  surveyor_id: string
  total_travel_minutes: number
  total_visit_minutes: number
  total_duration_minutes: number
  total_stops: number
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string | null
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
  updated_at: string
  // Expanded fields
  surveyor?: {
    id: string
    name: string
    email: string
  }
  stops?: RouteStop[]
}

export interface GenerateRouteRequest {
  customer_job_pairs: Array<{
    customer_id: string
    job_id: string
  }>
  surveyor_ids: string[]
  route_date: string
  max_visits_per_day?: number
  working_hours?: {
    start: string  // HH:MM format (e.g., "09:00")
    end: string    // HH:MM format (e.g., "17:00")
  }
}

export interface GenerateRouteResponse {
  routes: Route[]
  unassigned_jobs: Array<{
    job_id: string
    customer_id: string
    reason: string
  }>
}

// ============================================
// Unified Communications Hub Types (Session 111)
// ============================================

export interface CustomerCommunicationSummary {
  customer_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null

  // Activity summary
  last_activity_at: string
  last_activity_type: 'sms' | 'email' | 'whatsapp' | 'call'
  last_activity_preview: string

  // Unread counts
  unread_sms_count: number
  unread_email_count: number
  unread_whatsapp_count: number
  total_unread_count: number

  // Channel indicators (has activity in these channels)
  has_sms: boolean
  has_email: boolean
  has_whatsapp: boolean
  has_calls: boolean
}

export interface WhatsAppMedia {
  url: string
  content_type: string
  filename?: string
  size?: number
}

export interface UnifiedCommunicationItem {
  id: string
  type: 'sms' | 'email' | 'whatsapp' | 'call'
  direction: 'inbound' | 'outbound'
  timestamp: string

  // Common fields
  body: string
  preview: string // Truncated for display

  // Channel-specific
  subject?: string // Email only
  body_html?: string // HTML body for synced emails (Gmail/Outlook)
  from_email?: string // Sender email for synced emails
  status?: 'queued' | 'sent' | 'delivered' | 'failed' // Outbound messages
  media?: WhatsAppMedia[] // WhatsApp/SMS media attachments

  // Call-specific
  call_recording?: {
    id: string
    direction: string
    duration_seconds: number
    provider: string
    summary: string | null
    has_transcript: boolean
    action_items_count: number
    audio_url: string | null
    provider_meeting_url: string | null
  }
}

export interface CustomerConversationResponse {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  items: UnifiedCommunicationItem[]
  pagination: PaginationMeta
}

// ============================================
// Email Integration Types (Gmail/Outlook OAuth)
// ============================================

export interface EmailIntegration {
  id: string
  tenant_id: string
  user_id: string
  provider: 'gmail' | 'outlook' | 'office365'
  email_address: string
  display_name: string | null
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface EmailSignature {
  id: string
  tenant_id: string
  user_id: string
  name: string
  html_content: string
  text_content: string | null
  is_default: boolean
  source: string
  integration_id: string | null
  created_at: string
  updated_at: string
}

export interface EmailThreadSynced {
  id: string
  tenant_id: string
  integration_id: string
  customer_id: string | null
  provider: 'gmail' | 'outlook' | 'office365'
  provider_message_id: string
  provider_thread_id: string | null
  from_email: string
  from_name: string | null
  to_emails: string[]
  cc_emails: string[]
  subject: string
  body_text: string | null
  body_html: string | null
  direction: 'inbound' | 'outbound'
  signature_id: string | null
  is_read: boolean
  is_sent: boolean
  received_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface EmailAttachment {
  id: string
  tenant_id: string
  email_thread_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

// ============================================
// Sales Pipeline Call Logs
// ============================================

export interface CallLog {
  id: string
  job_id: string
  tenant_id: string
  call_date: string
  duration_minutes: number | null
  outcome: string | null
  notes: string | null
  next_action_date: string | null
  next_action_description: string | null
  created_by: string | null
  created_at: string
}

export interface CreateCallLogRequest {
  job_id: string
  call_date?: string
  duration_minutes?: number
  outcome?: string
  notes?: string
  next_action_date?: string
  next_action_description?: string
}

// Sales pipeline verticals
export const VERTICALS = [
  'Detailing',
  'Commercial Landscaping',
  'Solar',
  'Recruitment',
  'Mortgage Brokers',
  'Property Management',
  'Accountancy',
  'Law Firms',
  'Dental/Medical',
  'Commercial Cleaning',
  'Logistics/Courier',
  'Wedding Venues',
  'Car Dealerships',
  'Commercial Trades',
  'Care Homes',
  'Gym Chains',
  'Nurseries/Childcare',
  'High-ticket',
] as const

export type Vertical = typeof VERTICALS[number]

// Sales pipeline stages
export const SALES_STAGES = [
  'New Lead',
  'Researching',
  'Contacted',
  'Meeting Booked',
  'Demo Sent',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const

export type SalesStage = typeof SALES_STAGES[number]

// Call outcomes
export const CALL_OUTCOMES = [
  'No Answer',
  'Callback',
  'Interested',
  'Not Interested',
  'Meeting Booked',
] as const

export type CallOutcome = typeof CALL_OUTCOMES[number]
