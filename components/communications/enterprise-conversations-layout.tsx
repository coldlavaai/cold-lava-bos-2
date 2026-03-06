"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useCustomerCommunications,
  useCustomerConversation,
  useSendCustomerMessage,
  useMarkCustomerAsRead,
  useIntegrationStatus,
  useTenant,
  useEmailIntegrations,
  useEmailSignatures,
  useSyncEmails,
  useSendEmailViaIntegration,
} from "@/lib/api/hooks"
import { useCall } from "@/lib/contexts/call-context"
import { useCommunicationsRealtime } from "@/lib/hooks/use-communications-realtime"
import { useSearchParams } from "next/navigation"
import { CustomerListPanel } from "./customer-list-panel"
import { ConversationThreadPanel } from "./conversation-thread-panel"
import { CustomerDetailPanel } from "./customer-detail-panel"
import { NewConversationForm } from "./new-conversation-form"

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "comms-selected-customer-id"

// ============================================================================
// Main Layout Component
// ============================================================================

export function EnterpriseConversationsLayout() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || null
    }
    return null
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedChannel, setSelectedChannel] = React.useState("all")
  const [newConversationMode, setNewConversationMode] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)

  // ---------------------------------------------------------------------------
  // Realtime + Data Hooks
  // ---------------------------------------------------------------------------

  // Get tenant for Realtime subscription
  const { data: tenant } = useTenant()

  // Subscribe to Realtime updates (replaces polling)
  useCommunicationsRealtime(tenant?.id)

  // Email integrations (Gmail/Outlook OAuth)
  const { data: emailIntegrations } = useEmailIntegrations()
  const { data: emailSignatures } = useEmailSignatures()
  const syncEmailsMutation = useSyncEmails()
  const sendEmailViaMutation = useSendEmailViaIntegration()
  const searchParams = useSearchParams()
  const { activeCall } = useCall()

  // Handle OAuth callback success messages
  React.useEffect(() => {
    const success = searchParams?.get('success')
    if (success === 'gmail_connected') {
      toast.success('Gmail connected successfully! Syncing emails...')
      syncEmailsMutation.mutate({ provider: 'gmail' })
      // Clean URL
      window.history.replaceState({}, '', '/communications')
    } else if (success === 'outlook_connected') {
      toast.success('Outlook connected successfully! Syncing emails...')
      syncEmailsMutation.mutate({ provider: 'outlook' })
      window.history.replaceState({}, '', '/communications')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle ?customer_id=xxx (from customer profile "Message" button)
  // and ?callActive=true (from the active-call pill — auto-select the calling customer)
  React.useEffect(() => {
    const customerId = searchParams?.get('customer_id') || searchParams?.get('customer')
    const callActive = searchParams?.get('callActive')

    if (customerId) {
      setSelectedCustomerId(customerId)
      window.history.replaceState({}, '', '/communications')
    } else if (callActive && activeCall?.customerId) {
      setSelectedCustomerId(activeCall.customerId)
      window.history.replaceState({}, '', '/communications')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Background email sync every 60 seconds (if integrations connected)
  React.useEffect(() => {
    if (!emailIntegrations?.length) return

    const syncInterval = setInterval(() => {
      for (const integration of emailIntegrations) {
        const provider = integration.provider as 'gmail' | 'outlook'
        syncEmailsMutation.mutate({ provider, integrationId: integration.id })
      }
    }, 60_000)

    return () => clearInterval(syncInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailIntegrations?.length])

  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomerCommunications({
    channel: selectedChannel !== "all" ? selectedChannel : undefined,
    search: searchQuery || undefined,
  })

  const {
    data: conversationData,
    isLoading: conversationLoading,
    refetch: refetchConversation,
  } = useCustomerConversation(
    selectedCustomerId || "",
    { limit: 50 },
    // No polling — Realtime handles instant updates
  )

  const sendMessageMutation = useSendCustomerMessage()
  const markAsReadMutation = useMarkCustomerAsRead()
  // Integration status available for future use (Phase 2+ integration banner)
  useIntegrationStatus()

  // customersData from useCustomerCommunications is already the unwrapped array
  const customers = React.useMemo(
    () => (Array.isArray(customersData) ? customersData : []),
    [customersData]
  )
  const selectedCustomer = conversationData?.customer || null
  const conversationItems = conversationData?.items || []

  // ---------------------------------------------------------------------------
  // Persist selected customer ID
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (selectedCustomerId) {
      localStorage.setItem(STORAGE_KEY, selectedCustomerId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedCustomerId])

  // Auto-select first customer if none selected
  React.useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId && !newConversationMode) {
      setSelectedCustomerId(customers[0].customer_id)
    }
  }, [customers, selectedCustomerId, newConversationMode])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId)
    setNewConversationMode(false)
    markAsReadMutation.mutate(customerId)
  }

  const handleRefresh = async () => {
    setIsSyncing(true)
    try {
      await Promise.all([refetchCustomers(), refetchConversation()])
    } finally {
      setIsSyncing(false)
    }
  }

  const handleNewConversation = () => {
    setNewConversationMode(true)
    setSelectedCustomerId(null)
  }

  const handleSend = (params: {
    channel: "sms" | "email" | "whatsapp"
    body: string
    subject?: string
    integrationId?: string
    provider?: "gmail" | "outlook"
    signatureId?: string
  }) => {
    if (!selectedCustomerId) return

    // Route email via Gmail/Outlook if integration selected
    if (params.channel === "email" && params.integrationId && params.provider && selectedCustomer?.email) {
      sendEmailViaMutation.mutate(
        {
          provider: params.provider,
          integrationId: params.integrationId,
          to: selectedCustomer.email,
          subject: params.subject || "(no subject)",
          body: params.body,
          customerId: selectedCustomerId,
          signatureId: params.signatureId,
        },
        {
          onSuccess: async () => {
            toast.success("Email sent via " + params.provider)
            await Promise.all([refetchConversation(), refetchCustomers()])
          },
          onError: (error) => {
            toast.error(
              error instanceof Error ? error.message : "Failed to send email"
            )
          },
        }
      )
      return
    }

    // Default: send via existing SendGrid/Twilio
    sendMessageMutation.mutate(
      {
        customerId: selectedCustomerId,
        channel: params.channel,
        body: params.body,
        subject: params.subject,
      },
      {
        onSuccess: async () => {
          toast.success("Message sent")
          await Promise.all([refetchConversation(), refetchCustomers()])
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to send message"
          )
        },
      }
    )
  }

  const handleNewConversationSend = (params: {
    customerId: string
    channel: "sms" | "email" | "whatsapp"
    body: string
    subject?: string
  }) => {
    sendMessageMutation.mutate(
      params,
      {
        onSuccess: async () => {
          toast.success("Message sent")
          setSelectedCustomerId(params.customerId)
          setNewConversationMode(false)
          // Refetch to show the new thread in the customer list
          await refetchCustomers()
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to send message"
          )
        },
      }
    )
  }

  const handleBack = () => {
    setSelectedCustomerId(null)
    setNewConversationMode(false)
  }

  // ---------------------------------------------------------------------------
  // Mobile panel visibility logic
  // ---------------------------------------------------------------------------

  const showLeftPanel = !selectedCustomerId && !newConversationMode
  const showCenterPanel = !!selectedCustomerId || newConversationMode

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="comms-dark-bg h-[calc(100vh-5.5rem)] -m-3 md:-m-6 p-2 lg:p-3">
      {/* Main glass container */}
      <div
        className={cn(
          "h-full rounded-2xl lg:rounded-3xl overflow-hidden",
          "border border-white/[0.08]",
          "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
          "bg-white/[0.03] backdrop-blur-3xl",
          "flex"
        )}
      >
        {/* ================================================================= */}
        {/* LEFT PANEL - Customer List */}
        {/* ================================================================= */}
        <div
          className={cn(
            "w-full lg:w-60 xl:w-64 shrink-0",
            "border-r border-white/[0.08]",
            "bg-white/[0.03] backdrop-blur-3xl",
            // Mobile: show only when no customer selected
            showLeftPanel ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          )}
        >
          <CustomerListPanel
            customers={customers}
            isLoading={customersLoading}
            error={customersError as Error | null}
            selectedCustomerId={selectedCustomerId}
            searchQuery={searchQuery}
            selectedChannel={selectedChannel}
            onSearchChange={setSearchQuery}
            onChannelChange={setSelectedChannel}
            onCustomerClick={handleCustomerClick}
            onRefresh={handleRefresh}
            onNewConversation={handleNewConversation}
            isSyncing={isSyncing}
          />
        </div>

        {/* ================================================================= */}
        {/* CENTER PANEL - Conversation Thread / New Conversation */}
        {/* ================================================================= */}
        <div
          className={cn(
            "flex-1 min-w-0",
            // Mobile: show only when customer selected or new conversation
            showCenterPanel ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          )}
        >
          {newConversationMode ? (
            <NewConversationForm
              onSend={handleNewConversationSend}
              onClose={() => {
                setNewConversationMode(false)
              }}
              isSending={sendMessageMutation.isPending}
            />
          ) : (
            <ConversationThreadPanel
              customer={selectedCustomer}
              items={conversationItems}
              isLoading={conversationLoading}
              isSending={sendMessageMutation.isPending || sendEmailViaMutation.isPending}
              onSend={handleSend}
              onBack={handleBack}
              showBackButton={true}
              emailIntegrations={emailIntegrations}
              emailSignatures={emailSignatures}
            />
          )}
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL - Customer Details */}
        {/* ================================================================= */}
        {selectedCustomer && !newConversationMode && (
          <div
            className={cn(
              "hidden lg:flex lg:flex-col",
              "w-80 shrink-0",
              "border-l border-white/10",
              "bg-slate-950/35 backdrop-blur-2xl"
            )}
          >
            <CustomerDetailPanel customer={selectedCustomer} />
          </div>
        )}
      </div>
    </div>
  )
}
