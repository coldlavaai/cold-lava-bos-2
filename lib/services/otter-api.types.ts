/**
 * Session 94: Otter.ai API Types
 * Type definitions for Otter.ai API based on their API documentation
 * Reference: https://otter.ai/developer/api-reference
 */

// ============================================
// OAuth & Authentication
// ============================================

export interface OtterOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface OtterTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number // seconds
  token_type: 'Bearer'
  scope: string
}

// ============================================
// User & Account
// ============================================

export interface OtterUser {
  user_id: string
  email: string
  name: string
  picture_url?: string
  created_at: string
}

export interface OtterAccount {
  account_id: string
  name: string
  plan: 'free' | 'pro' | 'business' | 'enterprise'
  seat_count?: number
}

// ============================================
// Speeches (Recordings)
// ============================================

export interface OtterSpeech {
  speech_id: string
  title: string
  summary?: string
  created_at: string
  started_at?: string
  ended_at?: string
  duration?: number // seconds

  // URLs
  otter_url: string
  audio_url?: string

  // Transcription
  transcript?: string
  language?: string

  // Speakers
  speakers?: OtterSpeaker[]

  // AI features
  action_items?: OtterActionItem[]
  outline?: string[]

  // Status
  status: 'processing' | 'completed' | 'failed'

  // Folder/organization
  folder_id?: string

  // Custom fields (for BOS linkage)
  custom_metadata?: Record<string, unknown>
}

export interface OtterSpeaker {
  speaker_id: string
  speaker_name?: string
  speaker_photo_url?: string
}

export interface OtterActionItem {
  text: string
  speaker_id?: string
  timestamp?: number
}

export interface OtterTranscriptSegment {
  speaker_id: string
  text: string
  start_time: number
  end_time: number
  confidence?: number
}

// ============================================
// Meetings & Bot Scheduling
// ============================================

export interface OtterMeeting {
  meeting_id: string
  title: string
  start_time: string // ISO 8601
  end_time?: string
  meeting_url?: string // Zoom/Meet/Teams URL
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

  // Bot
  bot_status?: 'joining' | 'in_call' | 'left' | 'failed'

  // Recording
  speech_id?: string // If completed and has recording

  // Custom metadata
  custom_metadata?: Record<string, unknown>
}

export interface CreateOtterMeetingRequest {
  title: string
  start_time: string // ISO 8601
  meeting_url: string // Zoom/Meet/Teams URL
  auto_join?: boolean // Should bot auto-join?
  custom_metadata?: Record<string, unknown>
}

export interface ScheduleBotRequest {
  meeting_url: string
  start_time?: string
  custom_metadata?: Record<string, unknown>
}

// ============================================
// API List Responses
// ============================================

export interface OtterSpeechesListResponse {
  speeches: OtterSpeech[]
  page_size: number
  offset: number
  total_count: number
  has_more: boolean
}

export interface OtterMeetingsListResponse {
  meetings: OtterMeeting[]
  page_size: number
  offset: number
  total_count: number
  has_more: boolean
}

// ============================================
// Webhooks
// ============================================

export interface OtterWebhookEvent {
  event_type: 'speech.created' | 'speech.updated' | 'speech.completed' | 'meeting.started' | 'meeting.ended'
  created_at: string
  data: OtterSpeech | OtterMeeting
}

// ============================================
// API Errors
// ============================================

export interface OtterApiError {
  error: string
  error_description?: string
  status_code: number
}
