import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./client"
import type {
  Job,
  JobStage,
  Customer,
  Task,
  Appointment,
  JobsQueryParams,
  CustomersQueryParams,
  TasksQueryParams,
  AppointmentsQueryParams,
  Thread,
  Message,
  Tenant,
  TenantUser,
  CurrentUser,
  TimelineItem,
  ComplianceDashboardSummary,
  JobMissingComplianceFields,
  Quote,
  OpenSolarProjectSummary,
  CommunicationsIntegrationsStatus,
  ConfigureEmailIntegrationRequest,
  GetIntegrationsResponse,
  ConfigureOpenSolarRequest,
  TestOpenSolarResponse,
  ConfigureStripeRequest,
  ConfigureSmsIntegrationRequest,
  ConfigureTwilioRequest,
  TestEmailRequest,
  TestSmsRequest,
  TestIntegrationResponse,
  CallRecording,
  ConfigureOtterRequest,
  DBRCampaign,
  DBRLead,
  CreateDBRCampaignRequest,
  UpdateDBRLeadRequest,
  SendDBRLeadMessageRequest,
  TenantAnalyticsOverview,
  DBRAnalyticsOverview,
  EmailIntegration,
  EmailSignature,
  InstallationPhoto,
  InstallationDocument,
  UserProfile,
} from "./types"
import type { JobSiteIntel } from "@/lib/site-intel/types"
import type { SolarVisualizationData } from "@/lib/services/solar-api.types"

// Helper to build query string
function buildQueryString(params: Record<string, unknown> | object): string {
  const searchParams = new URLSearchParams()
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

// Jobs
export function useJobs(params: JobsQueryParams = {}) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: async () => {
      // Return the full ApiResponse<Job[]> so callers can access
      // both data and pagination metadata consistently.
      const response = await api.get<Job[]>(`/jobs${buildQueryString(params)}`)
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data instantly
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnMount: false, // Use cached data if fresh - rely on mutation invalidation
    placeholderData: (previousData) => previousData, // Show stale data while revalidating
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const response = await api.get<Job>(`/jobs/${id}?expand=customer,current_stage`)
      return response.data
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - job details change occasionally
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useJobTasks(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "tasks"],
    queryFn: async () => {
      const response = await api.get<Task[]>(`/tasks?linked_entity_type=job&linked_entity_id=${jobId}`)
      return response.data
    },
    enabled: !!jobId,
    staleTime: 60 * 1000, // 1 minute - tasks change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useJobAppointments(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "appointments"],
    queryFn: async () => {
      const response = await api.get<Appointment[]>(`/appointments?job_id=${jobId}`)
      return response.data
    },
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Job Stages
export function useJobStages() {
  return useQuery({
    queryKey: ["job-stages"],
    queryFn: async () => {
      const response = await api.get<JobStage[]>("/job-stages")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - job stages rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  })
}

// Customers
export function useCustomers(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => {
      // Return the full ApiResponse<Customer[]> so callers can access
      // both data and pagination metadata consistently.
      const response = await api.get<Customer[]>(`/customers${buildQueryString(params)}`)
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data instantly
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Use cached data if fresh - rely on mutation invalidation
    placeholderData: (previousData) => previousData,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const response = await api.get<Customer>(`/customers/${id}`)
      return response.data
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - customer details rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCustomerJobs(customerId: string) {
  return useQuery({
    queryKey: ["customers", customerId, "jobs"],
    queryFn: async () => {
      const response = await api.get<Job[]>(`/jobs?customer_id=${customerId}&expand=current_stage`)
      return response.data
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCustomerAppointments(customerId: string) {
  return useQuery({
    queryKey: ["customers", customerId, "appointments"],
    queryFn: async () => {
      const response = await api.get<Appointment[]>(`/appointments?customer_id=${customerId}`)
      return response.data
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCustomerTimeline(customerId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["customers", customerId, "timeline"],
    queryFn: async () => {
      const response = await api.get<TimelineItem[]>(`/customers/${customerId}/timeline`)
      return response.data
    },
    enabled: !!customerId && (options?.enabled !== false),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateCustomerNote(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { note: string }) => {
      const response = await api.post(`/customers/${customerId}/notes`, data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate the timeline query to refresh and show the new note
      queryClient.invalidateQueries({ queryKey: ["customers", customerId, "timeline"] })
    },
  })
}

// Tasks
export function useTasks(params: TasksQueryParams = {}) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: async () => {
      const response = await api.get<Task[]>(`/tasks${buildQueryString(params)}`)
      return response.data
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      due_date?: string
      linked_entity_type?: string
      linked_entity_id?: string
      priority?: 'low' | 'medium' | 'high'
    }) => {
      const response = await api.post<Task>("/tasks", data)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      // Invalidate job tasks if linked to a job
      if (variables.linked_entity_type === 'job' && variables.linked_entity_id) {
        queryClient.invalidateQueries({ queryKey: ["jobs", variables.linked_entity_id, "tasks"] })
      }
      // Also invalidate based on returned entity data
      if (data.linked_entity_type === 'job' && data.linked_entity_id) {
        queryClient.invalidateQueries({ queryKey: ["jobs", data.linked_entity_id, "tasks"] })
      }
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<Task>(`/tasks/${taskId}/complete`, {})
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      // Invalidate job tasks if linked to a job
      if (data.linked_entity_type === 'job' && data.linked_entity_id) {
        queryClient.invalidateQueries({ queryKey: ["jobs", data.linked_entity_id, "tasks"] })
      }
    },
  })
}

// Installation Photos
export function useInstallationPhotos(jobId: string) {
  return useQuery({
    queryKey: ["installations", jobId, "photos"],
    queryFn: async () => {
      const response = await api.get<InstallationPhoto[]>(`/installations/${jobId}/photos`)
      return response.data
    },
    enabled: !!jobId,
  })
}

export function useUploadInstallationPhoto(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/installations/${jobId}/photos`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Upload failed")
      }
      return (await response.json()).data as InstallationPhoto
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installations", jobId, "photos"] })
    },
  })
}

export function useDeleteInstallationPhoto(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photoId: string) => {
      const response = await fetch(`/api/installations/${jobId}/photos/${photoId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Delete failed")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installations", jobId, "photos"] })
    },
  })
}

// Installation Documents
export function useInstallationDocuments(jobId: string) {
  return useQuery({
    queryKey: ["installations", jobId, "documents"],
    queryFn: async () => {
      const response = await api.get<InstallationDocument[]>(`/installations/${jobId}/documents`)
      return response.data
    },
    enabled: !!jobId,
  })
}

export function useUploadInstallationDocument(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/installations/${jobId}/documents`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Upload failed")
      }
      return (await response.json()).data as InstallationDocument
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installations", jobId, "documents"] })
    },
  })
}

export function useDeleteInstallationDocument(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (docId: string) => {
      const response = await fetch(`/api/installations/${jobId}/documents/${docId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Delete failed")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installations", jobId, "documents"] })
    },
  })
}

// Appointments
export function useAppointments(params: AppointmentsQueryParams = {}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: async () => {
      const response = await api.get<Appointment[]>(`/appointments${buildQueryString(params)}`)
      return response.data
    },
  })
}

// Mutations
export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Job>) => {
      const response = await api.post<Job>("/jobs", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Job>) => {
      const { id, ...data } = params
      const response = await api.patch<Job>(`/jobs/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", variables.id] })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/jobs/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    },
  })
}

export function useTransitionJobStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { jobId: string; toStageId: string; notes?: string }) => {
      const response = await api.post(`/jobs/${params.jobId}/stage-transitions`, {
        to_stage_id: params.toStageId,
        notes: params.notes,
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      // Invalidate jobs queries to refetch
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", variables.jobId] })
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const response = await api.post<Customer>("/customers", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Customer>) => {
      const { id, ...data } = params
      const response = await api.patch<Customer>(`/customers/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/customers/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Appointment>) => {
      const response = await api.post<Appointment>("/appointments", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Appointment>) => {
      const { id, ...data } = params
      const response = await api.patch<Appointment>(`/appointments/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] })
    },
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

// Threads (Communications)
export function useThreads(params?: { channel?: string; customer_id?: string; unread_only?: boolean }) {
  return useQuery({
    queryKey: ["threads", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params?.channel) queryParams.set('channel', params.channel)
      if (params?.customer_id) queryParams.set('customer_id', params.customer_id)
      if (params?.unread_only) queryParams.set('unread_only', 'true')

      const url = `/threads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await api.get<Thread[]>(url)
      return response.data
    },
  })
}

export function useThread(id: string) {
  return useQuery({
    queryKey: ["threads", id],
    queryFn: async () => {
      const response = await api.get<Thread>(`/threads/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: ["threads", threadId, "messages"],
    queryFn: async () => {
      const response = await api.get<{ thread: Thread; messages: Message[] }>(
        `/messages/threads/${threadId}`
      )
      return response.data
    },
    enabled: !!threadId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { thread_id: string; body: string }) => {
      const response = await api.post<Message>(`/threads/${params.thread_id}/messages`, {
        body: params.body,
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] })
      queryClient.invalidateQueries({ queryKey: ["threads", variables.thread_id] })
      queryClient.invalidateQueries({ queryKey: ["threads", variables.thread_id, "messages"] })
    },
  })
}

export function useMarkThreadAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (threadId: string) => {
      const response = await api.patch(`/threads/${threadId}`, { is_read: true })
      return response.data
    },
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] })
      queryClient.invalidateQueries({ queryKey: ["threads", threadId] })
    },
  })
}

// Communications Integrations (Session 88)
export function useCommunicationsIntegrationsStatus() {
  return useQuery({
    queryKey: ["integrations", "communications"],
    queryFn: async () => {
      const response = await api.get<CommunicationsIntegrationsStatus>("/integrations/communications")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - integration config doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  })
}

// Communications Integrations - Configuration (Session 89B)
export function useConfigureEmailIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigureEmailIntegrationRequest) => {
      const response = await api.post("/integrations/communications/email", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "communications"] })
    },
  })
}

export function useConfigureSmsIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigureTwilioRequest) => {
      const response = await api.post("/integrations/communications/sms", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "communications"] })
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
      queryClient.invalidateQueries({ queryKey: ["integrationStatus"] })
      queryClient.invalidateQueries({ queryKey: ["twilio-config"] })
    },
  })
}

/**
 * Fetch existing Twilio configuration for form prefill
 * Returns sanitized config (no auth_token)
 */
export interface TwilioConfig {
  configured: boolean
  accountSid?: string | null
  phoneNumber?: string | null
  whatsappNumber?: string | null
  isActive?: boolean
}

export function useTwilioConfig() {
  return useQuery<TwilioConfig>({
    queryKey: ["twilio-config"],
    queryFn: async () => {
      const response = await api.get<TwilioConfig>("/integrations/communications/sms")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useTestEmailIntegration() {
  return useMutation({
    mutationFn: async (data: TestEmailRequest) => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/communications/email/test",
        data
      )
      return response.data
    },
  })
}

export function useTestSmsIntegration() {
  return useMutation({
    mutationFn: async (data: TestSmsRequest) => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/communications/sms/test",
        data
      )
      return response.data
    },
  })
}

// Unified Integrations (Session 90)
export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const response = await api.get<GetIntegrationsResponse>("/integrations")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useConfigureOpenSolar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigureOpenSolarRequest) => {
      const response = await api.post("/integrations/opensolar/configure", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

export function useTestOpenSolar() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestOpenSolarResponse>(
        "/integrations/opensolar/test"
      )
      return response.data
    },
  })
}

export function useConfigureStripe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigureStripeRequest) => {
      const response = await api.post("/integrations/stripe/configure", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

export function useTestStripe() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/stripe/test"
      )
      return response.data
    },
  })
}

export function useTestGoogleCalendar() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/google-calendar/test"
      )
      return response.data
    },
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: string) => {
      const response = await api.delete(`/integrations/${type}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
      queryClient.invalidateQueries({ queryKey: ["integrations", "communications"] })
    },
  })
}

export function useConfigureOtter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigureOtterRequest) => {
      const response = await api.post("/integrations/otter/configure", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

export function useTestOtter() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/otter/test"
      )
      return response.data
    },
  })
}

export function useDisconnectOtter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { success: boolean } }>(
        '/integrations/otter/disconnect'
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

// ====================================
// Xero Integration (Session 109)
// ====================================

/**
 * Test Xero integration connection
 */
export function useTestXero() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/xero/test"
      )
      return response.data
    },
  })
}

/**
 * Disconnect Xero integration
 */
export function useDisconnectXero() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { success: boolean } }>(
        '/integrations/xero/disconnect'
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

// ====================================
// QuickBooks Integration (Session 109)
// ====================================

/**
 * Test QuickBooks integration connection
 */
export function useTestQuickBooks() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TestIntegrationResponse>(
        "/integrations/quickbooks/test"
      )
      return response.data
    },
  })
}

/**
 * Disconnect QuickBooks integration
 */
export function useDisconnectQuickBooks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { success: boolean } }>(
        '/integrations/quickbooks/disconnect'
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
  })
}

// ====================================
// Call Recordings (Session 92)
// ====================================

/**
 * Fetch call recordings for a specific job
 */
export function useCallRecordingsForJob(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["call-recordings", "job", jobId],
    queryFn: async () => {
      const response = await api.get<{ data: CallRecording[] }>(
        `/call-recordings?job_id=${jobId}`
      )
      return response.data.data
    },
    enabled: !!jobId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch call recordings for a specific customer
 */
export function useCallRecordingsForCustomer(customerId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["call-recordings", "customer", customerId],
    queryFn: async () => {
      const response = await api.get<{ data: CallRecording[] }>(
        `/call-recordings?customer_id=${customerId}`
      )
      return response.data.data
    },
    enabled: !!customerId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch call recordings for a specific message thread
 */
export function useCallRecordingsForThread(threadId: string) {
  return useQuery({
    queryKey: ["call-recordings", "thread", threadId],
    queryFn: async () => {
      const response = await api.get<{ data: CallRecording[] }>(
        `/call-recordings?thread_id=${threadId}`
      )
      return response.data.data
    },
    enabled: !!threadId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Schedule Otter bot for an appointment
 * Session 94: Otter OAuth integration
 */
export function useScheduleOtterBot(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { success: boolean; meeting_id?: string } }>(
        `/appointments/${appointmentId}/schedule-otter`
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate appointment queries
      queryClient.invalidateQueries({ queryKey: ["appointments", appointmentId] })
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}

// Tenant (Settings)
export function useTenant() {
  return useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const response = await api.get<Tenant>("/tenant")
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - tenant settings don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      const response = await api.patch<Tenant>("/tenant", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] })
    },
  })
}

// Users (Settings)
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get<TenantUser[]>("/users")
      return response.data
    },
    staleTime: 0, // Always refetch to ensure UI is up to date
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Session 73 - Get current authenticated user with role and permissions
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get<CurrentUser>("/auth/me")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - role/permissions change infrequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await api.post<TenantUser>("/users/invite", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: async () => {
      // After successful delete, force refetch the users list immediately
      // Use refetchQueries instead of invalidateQueries to ensure refetch happens
      await queryClient.refetchQueries({ queryKey: ["users"] })
    },
  })
}

// ============================================================================
// User Profiles (Permission Templates)
// ============================================================================

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const response = await api.get<UserProfile[]>("/settings/profiles")
      return response.data
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useSaveProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id?: string
      name: string
      description?: string
      permissions: Record<string, Record<string, boolean>>
    }) => {
      const response = await api.post<UserProfile>("/settings/profiles", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] })
    },
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/profiles?id=${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] })
    },
  })
}

// ============================================================================
// Session 58: Compliance Status Views
// ============================================================================
// These hooks fetch from database views created in the Session 58 migration.
// They are fully guarded and will return null/error if views don't exist yet.

/**
 * Fetch compliance dashboard summary from the compliance_dashboard_summary view.
 * Returns aggregate compliance metrics for the current tenant.
 *
 * @returns {ComplianceDashboardSummary | null} Dashboard summary or null if view doesn't exist
 */
export function useComplianceDashboardSummary() {
  return useQuery({
    queryKey: ["compliance", "dashboard-summary"],
    queryFn: async () => {
      try {
        const response = await api.get<ComplianceDashboardSummary>("/compliance/dashboard-summary")
        return response.data
      } catch (error: unknown) {
        // Guard: If view doesn't exist yet (42P01 = undefined_table), return null
        const err = error as { status?: number; message?: string }
        if (err.status === 500 && err.message?.includes('does not exist')) {
          console.info('[useComplianceDashboardSummary] View not available yet - migration pending')
          return null
        }
        throw error
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if view doesn't exist
  })
}

/**
 * Fetch jobs with missing compliance fields from the jobs_missing_compliance_fields view.
 * Returns list of jobs that need compliance data entry.
 *
 * @returns {JobMissingComplianceFields[] | null} Missing fields list or null if view doesn't exist
 */
export function useJobsMissingComplianceFields() {
  return useQuery({
    queryKey: ["compliance", "missing-fields"],
    queryFn: async () => {
      try {
        const response = await api.get<JobMissingComplianceFields[]>("/compliance/missing-fields")
        return response.data
      } catch (error: unknown) {
        // Guard: If view doesn't exist yet (42P01 = undefined_table), return null
        const err = error as { status?: number; message?: string }
        if (err.status === 500 && err.message?.includes('does not exist')) {
          console.info('[useJobsMissingComplianceFields] View not available yet - migration pending')
          return null
        }
        throw error
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if view doesn't exist
  })
}

// ============================================================================
// Session 67: Quotes
// ============================================================================

/**
 * Fetch quotes for a specific job
 */
export function useJobQuotes(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "quotes"],
    queryFn: async () => {
      const response = await api.get<Quote[]>(`/quotes?job_id=${jobId}`)
      return response.data
    },
    enabled: !!jobId,
  })
}

/**
 * Fetch a single quote with line items
 */
export function useQuote(id: string) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      const response = await api.get<Quote>(`/quotes/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * Create a new quote for a job
 */
export function useCreateQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      job_id: string
      total_amount: number | null
      valid_until: string | null
      line_items: Array<{
        description: string
        quantity: number
        unit_price: number
        total_price?: number
      }>
    }) => {
      const response = await api.post<Quote>("/quotes", data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", data.job_id, "quotes"] })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}

/**
 * Update an existing quote
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
      total_amount?: number | null
      valid_until?: string | null
      line_items?: Array<{
        description: string
        quantity: number
        unit_price: number
        total_price?: number
      }>
    }) => {
      const { id, ...data } = params
      const response = await api.patch<Quote>(`/quotes/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", data.id] })
      queryClient.invalidateQueries({ queryKey: ["jobs", data.job_id, "quotes"] })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}

/**
 * Mark a quote as sent
 */
export function useSendQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await api.post<{ message: string; data: Quote }>(`/quotes/${quoteId}/send`, {})
      return response.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", data.id] })
      queryClient.invalidateQueries({ queryKey: ["jobs", data.job_id, "quotes"] })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}

/**
 * Download quote as PDF
 * Session 68: Phase 2 - PDF Generation
 */
export function useDownloadQuotePdf() {
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download PDF')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `quote-${quoteId}.pdf`

      // Create blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return { success: true, filename }
    },
  })
}

/**
 * Email quote to customer with PDF attachment
 * Session 68: Phase 2 - Email Sending
 */
export function useEmailQuote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      quoteId: string
      to?: string
      subject?: string
      message?: string
    }) => {
      const { quoteId, ...body } = params
      const response = await api.post<{ message: string; data: { id: string; status: string; to: string } }>(
        `/quotes/${quoteId}/email`,
        body
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", data.data.id] })
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      // We don't have job_id in the response, so invalidate all job quotes
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    },
  })
}

// ====================================
// OpenSolar Integration (Session 71)
// ====================================

/**
 * Fetch OpenSolar project summary for a job
 */
export function useJobOpenSolar(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "opensolar"],
    queryFn: async () => {
      const response = await api.get<{ data: OpenSolarProjectSummary | null }>(`/jobs/${jobId}/opensolar`)
      return response.data.data
    },
    enabled: !!jobId,
  })
}

/**
 * Create a new OpenSolar project for a job
 */
export function useCreateOpenSolarProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<{ data: OpenSolarProjectSummary }>(`/jobs/${jobId}/opensolar/create`, {})
      return response.data.data
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "opensolar"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] })
    },
  })
}

/**
 * Link an existing OpenSolar project to a job
 */
export function useLinkOpenSolarProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { jobId: string; project_id: string; project_url?: string }) => {
      const { jobId, ...body } = params
      const response = await api.post<{ data: OpenSolarProjectSummary }>(`/jobs/${jobId}/opensolar/link`, body)
      return response.data.data
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", params.jobId, "opensolar"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", params.jobId] })
    },
  })
}

/**
 * Sync job data to OpenSolar project
 */
export function useSyncToOpenSolar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.patch<{ data: OpenSolarProjectSummary }>(`/jobs/${jobId}/opensolar/sync`, {})
      return response.data.data
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "opensolar"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] })
    },
  })
}

// ====================================
// Site Intelligence (Session 76-79)
// ====================================

/**
 * Fetch stored site intelligence for a job
 */
export function useJobSiteIntel(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "site-intel"],
    queryFn: async () => {
      const response = await api.get<{ data: JobSiteIntel | null }>(`/jobs/${jobId}/site-intel`)
      return response.data.data
    },
    enabled: !!jobId,
  })
}

/**
 * Compute and persist site intelligence for a job
 */
export function useComputeJobSiteIntel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<{ data: JobSiteIntel }>(`/jobs/${jobId}/site-intel`, {})
      return response.data.data
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "site-intel"] })
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] })
    },
  })
}

// ====================================
// Solar Visualization (Session 80)
// ====================================

/**
 * Fetch solar visualization data for a job (imagery + panel layouts)
 */
export function useJobSolarLayers(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["jobs", jobId, "solar-layers"],
    queryFn: async () => {
      try {
        const response = await api.get<SolarVisualizationData | null>(`/jobs/${jobId}/solar-layers`)

        // If no data, return null
        if (!response.data) {
          return null
        }

        // If API returns error in body, throw it
        if ('error' in response.data) {
          throw new Error((response.data as {error: string}).error || 'Failed to fetch solar data')
        }

        return response.data
      } catch (error: unknown) {
        // Handle axios error response
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { error?: string } } }
          if (axiosError.response?.data?.error) {
            throw new Error(axiosError.response.data.error)
          }
        }
        throw error
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled && !!jobId : !!jobId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - imagery doesn't change often
    gcTime: 48 * 60 * 60 * 1000,    // 48 hours
    retry: false, // Don't retry on error
  })
}

/**
 * Fetch solar visualization data for a customer (imagery + panel layouts)
 */
export function useCustomerSolarLayers(customerId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["customers", customerId, "solar-layers"],
    queryFn: async () => {
      try {
        const response = await api.get<SolarVisualizationData | null>(`/customers/${customerId}/solar-layers`)

        // If no data, return null
        if (!response.data) {
          return null
        }

        // If API returns error in body, throw it
        if ('error' in response.data) {
          throw new Error((response.data as {error: string}).error || 'Failed to fetch solar data')
        }

        return response.data
      } catch (error: unknown) {
        // Handle axios error response
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { error?: string } } }
          if (axiosError.response?.data?.error) {
            throw new Error(axiosError.response.data.error)
          }
        }
        throw error
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled && !!customerId : !!customerId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - imagery doesn't change often
    gcTime: 48 * 60 * 60 * 1000,    // 48 hours
    retry: false, // Don't retry on error
  })
}

// ====================================
// DBR Campaigns (Session 99A)
// ====================================

/**
 * Fetch DBR campaigns with optional filtering
 */
export function useDBRCampaigns(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["dbr-campaigns", params],
    queryFn: async () => {
      const response = await api.get<DBRCampaign[]>(`/dbr/campaigns${buildQueryString(params)}`)
      return response
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Create a new DBR campaign
 */
export function useCreateDBRCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDBRCampaignRequest) => {
      const response = await api.post<DBRCampaign>("/dbr/campaigns", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dbr-campaigns"] })
    },
  })
}

/**
 * Update a DBR campaign (primarily for status control)
 */
export function useUpdateDBRCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: { status?: 'draft' | 'running' | 'paused' | 'completed' | 'archived'; name?: string; description?: string | null } }) => {
      const response = await api.patch<DBRCampaign>(`/dbr/campaigns/${campaignId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dbr-campaigns"] })
    },
  })
}

/**
 * Fetch leads for a specific DBR campaign
 */
export function useDBRLeads(
  campaignId: string,
  params: {
    message_stage?: string
    contact_status?: string
    has_replied?: boolean
    manual_mode?: boolean
    sortBy?: string
    sortDir?: string
    page?: number
    limit?: number
  } = {}
) {
  return useQuery({
    queryKey: ["dbr-campaigns", campaignId, "leads", params],
    queryFn: async () => {
      const response = await api.get<DBRLead[]>(`/dbr/campaigns/${campaignId}/leads${buildQueryString(params)}`)
      return response
    },
    enabled: !!campaignId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Update a DBR lead (optimistic locking via version)
 */
export function useUpdateDBRLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: UpdateDBRLeadRequest }) => {
      const response = await api.patch<DBRLead>(`/dbr/leads/${leadId}`, data)
      return response.data
    },
    onSuccess: (updatedLead) => {
      // Invalidate the lead's campaign list
      queryClient.invalidateQueries({ queryKey: ["dbr-campaigns", updatedLead.campaign_id, "leads"] })
    },
  })
}

/**
 * Send a manual message to a DBR lead
 */
export function useSendDBRLeadMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: SendDBRLeadMessageRequest }) => {
      const response = await api.post<{ message_id: string; sent_at: string }>(`/dbr/leads/${leadId}/send-message`, data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate queries to refresh lead state and message threads
      queryClient.invalidateQueries({ queryKey: ["dbr-campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["message-threads"] })
    },
  })
}

// ====================================
// Analytics (Session 105)
// ====================================

/**
 * Fetch tenant analytics overview (last 30 days)
 * Returns aggregate metrics from analytics.tenant_daily_stats
 */
export function useTenantAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "tenant", "overview"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/tenant/overview", {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch tenant analytics")
      }
      return response.json() as Promise<TenantAnalyticsOverview>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics are aggregated daily
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch DBR analytics overview
 * Returns DBR campaign performance metrics for dashboard cards
 */
export function useDBRAnalyticsOverview(window: "7d" | "30d" = "7d") {
  return useQuery({
    queryKey: ["analytics", "dbr", "overview", window],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dbr/overview?window=${window}`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch DBR analytics")
      }
      return response.json() as Promise<DBRAnalyticsOverview>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ====================================
// Notifications
// ====================================

export interface Notification {
  id: string
  tenant_id: string
  user_id: string | null
  type: string // 'feed' | 'reminder' | 'system'
  category: string | null
  title: string
  body: string | null
  icon: string | null
  link: string | null
  entity_type: string | null
  entity_id: string | null
  actor_id: string | null
  actor_name: string | null
  is_read: boolean
  dismissed: boolean
  scheduled_at: string | null
  created_at: string
  read_at: string | null
}

export interface NotificationsResponse {
  data: Notification[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    unread_count: number
    unread_by_type: {
      feed: number
      reminder: number
      system: number
    }
  }
}

/**
 * Fetch user notifications with optional type filter
 */
export function useNotifications(params: { limit?: number; type?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const queryString = buildQueryString(params)
      const response = await api.get<NotificationsResponse>(`/notifications${queryString ? `?${queryString}` : ""}`)
      return (response as unknown as NotificationsResponse)
    },
    staleTime: 15 * 1000, // 15 seconds
  })
}

/**
 * Fetch just the unread count (lightweight)
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await api.get<NotificationsResponse>(`/notifications?limit=1`)
      const data = response as unknown as NotificationsResponse
      return data.meta
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30s as fallback
  })
}

/**
 * Mark specific notifications as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications`, { ids: [notificationId], is_read: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

/**
 * Dismiss a notification (e.g., reminders)
 */
export function useDismissNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications`, { ids: [notificationId], dismissed: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

/**
 * Mark all notifications as read, optionally by type
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (type?: string) => {
      await api.post("/notifications/mark-all-read", type ? { type } : {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

// ============================================
// INTEGRATION STATUS
// ============================================

export interface IntegrationStatus {
  email: { configured: boolean; active: boolean }
  sms: { configured: boolean; active: boolean }
  whatsapp: { configured: boolean; active: boolean }
}

/**
 * Get integration status for the current tenant
 * Useful for checking if email/SMS/WhatsApp are configured before attempting to send
 */
export function useIntegrationStatus() {
  return useQuery<IntegrationStatus>({
    queryKey: ["integrationStatus"],
    queryFn: async () => {
      const response = await api.get<IntegrationStatus>("/integrations/status")
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

// ============================================
// UNIFIED COMMUNICATIONS HUB (Session 111)
// ============================================

import {
  CustomerCommunicationSummary,
  CustomerConversationResponse,
} from './types'

/**
 * Get customers with communication activity
 */
export function useCustomerCommunications(params?: {
  channel?: string
  unread_only?: boolean
  search?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ["communications", "customers", params],
    queryFn: async () => {
      const response = await api.get<{
        data: CustomerCommunicationSummary[]
        meta: { pagination: { total: number; limit: number; offset: number; has_more: boolean } }
      }>(`/communications/customers${buildQueryString(params || {})}`)
      return response.data
    },
  })
}

/**
 * Get unified conversation for a customer
 * @param customerId - Customer ID to fetch conversation for
 * @param params - Query parameters (channel filter, limit)
 * @param options - Additional options including polling interval
 */
export function useCustomerConversation(
  customerId: string,
  params?: {
    channel?: string
    limit?: number
  },
  options?: {
    pollingInterval?: number | false
  }
) {
  return useQuery({
    queryKey: ["communications", "customers", customerId, "conversation", params],
    queryFn: async () => {
      // The conversation API returns { customer, items, pagination } directly
      // (not wrapped in { data: ... } like paginated list endpoints)
      const response = await api.get<CustomerConversationResponse>(
        `/communications/customers/${customerId}/conversation${buildQueryString(params || {})}`
      )
      return response as unknown as CustomerConversationResponse
    },
    enabled: !!customerId,
    // Enable polling when interval is specified
    refetchInterval: options?.pollingInterval || false,
    refetchIntervalInBackground: false, // Only poll when tab is active
  })
}

/**
 * Send message to customer
 */
export function useSendCustomerMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      customerId: string
      channel: 'sms' | 'email' | 'whatsapp'
      body: string
      subject?: string
    }) => {
      const { customerId, ...data } = params
      const response = await api.post(
        `/communications/customers/${customerId}/messages`,
        data
      )
      return response.data
    },
    // Optimistic update - show message immediately
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["communications"] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["communications", "customers", variables.customerId, "conversation"])

      // Optimistically update with new message
      queryClient.setQueryData(
        ["communications", "customers", variables.customerId, "conversation"],
        (old: unknown) => {
          if (!old) return old
          const previous = old as CustomerConversationResponse
          return {
            ...previous,
            items: [
              {
                id: `temp-${Date.now()}`,
                type: variables.channel,
                direction: 'outbound',
                timestamp: new Date().toISOString(),
                body: variables.body,
                subject: variables.subject,
                status: 'sending', // Temporary status
              },
              ...(previous.items || []),
            ],
          }
        }
      )

      return { previousData }
    },
    onSuccess: () => {
      // Instant refetch - no delay!
      queryClient.invalidateQueries({ queryKey: ["communications"] })
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["communications", "customers", _variables.customerId, "conversation"],
          context.previousData
        )
      }
    },
  })
}

/**
 * Mark customer communications as read
 */
export function useMarkCustomerAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customerId: string) => {
      await api.patch(`/communications/customers/${customerId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] })
    },
  })
}

// ============================================
// Email Integration Hooks (Gmail/Outlook OAuth)
// ============================================

export function useEmailIntegrations() {
  return useQuery<EmailIntegration[]>({
    queryKey: ["email-integrations"],
    queryFn: async () => {
      const response = await api.get<EmailIntegration[]>("/email-integrations")
      return response.data || []
    },
    staleTime: 60_000,
  })
}

export function useDisconnectEmailIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (integrationId: string) => {
      return api.delete("/email-integrations", { body: JSON.stringify({ integrationId }) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-integrations"] })
    },
  })
}

export function useEmailSignatures() {
  return useQuery<EmailSignature[]>({
    queryKey: ["email-signatures"],
    queryFn: async () => {
      const response = await api.get<{ signatures: EmailSignature[] }>("/signatures")
      return (response as unknown as { signatures: EmailSignature[] }).signatures || []
    },
    staleTime: 60_000,
  })
}

export function useSyncEmails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { provider: 'gmail' | 'outlook'; integrationId?: string }) => {
      const endpoint = `/integrations/${params.provider}/sync`
      return api.post(endpoint, { integrationId: params.integrationId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] })
    },
  })
}

export function useSendEmailViaIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      provider: 'gmail' | 'outlook'
      integrationId: string
      to: string
      subject: string
      body: string
      bodyType?: 'text' | 'html'
      customerId?: string
      signatureId?: string
      cc?: string
      bcc?: string
    }) => {
      const endpoint = `/integrations/${params.provider}/send`
      return api.post(endpoint, params)
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["communications"] })
      }, 300)
    },
  })
}

export function useMarkEmailRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { emailId: string; isRead?: boolean }) => {
      return api.post("/emails/mark-read", params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] })
    },
  })
}

// ============================================
// Call Logs (Sales Pipeline)
// ============================================

export function useCallLogs(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["call-logs", jobId],
    queryFn: async () => {
      const response = await api.get<import("./types").CallLog[]>(`/call-logs?job_id=${jobId}`)
      return response.data
    },
    enabled: options?.enabled !== false && !!jobId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useTodaysCallLogs() {
  return useQuery({
    queryKey: ["call-logs", "today"],
    queryFn: async () => {
      const response = await api.get<import("./types").CallLog[]>(`/call-logs?next_action_date=today`)
      return response.data
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateCallLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: import("./types").CreateCallLogRequest) => {
      return api.post("/call-logs", params)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["call-logs", variables.job_id] })
      queryClient.invalidateQueries({ queryKey: ["call-logs", "today"] })
    },
  })
}
