"use client"

import * as React from "react"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Building2,
  AlertCircle,
  Link as LinkIcon,
  Settings,
  Send,
  Unplug,
  AlertTriangle,
} from "lucide-react"
import {
  TwilioLogo,
  SendGridLogo,
  StripeLogo,
  XeroLogo,
  QuickBooksLogo,
  GoogleCalendarLogo,
  OtterLogo,
  GmailLogo,
  OutlookLogo,
  OpenSolarLogo,
} from "@/components/ui/brand-logos"
import {
  useIntegrations,
  useConfigureEmailIntegration,
  useConfigureSmsIntegration,
  useTwilioConfig,
  useTestEmailIntegration,
  useTestSmsIntegration,
  useConfigureOpenSolar,
  useTestOpenSolar,
  useConfigureStripe,
  useTestStripe,
  useTestGoogleCalendar,
  useDisconnectIntegration,
  useConfigureOtter,
  useTestOtter,
  useDisconnectOtter,
  useTestXero,
  useDisconnectXero,
  useTestQuickBooks,
  useDisconnectQuickBooks,
  useEmailIntegrations,
  useDisconnectEmailIntegration,
} from "@/lib/api/hooks"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"

function IntegrationsPageContent() {
  const { data: integrations, isLoading, error, refetch: refetchIntegrations } = useIntegrations()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Email configuration state
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [emailFormData, setEmailFormData] = React.useState({
    fromEmail: "",
    fromName: "",
    apiKey: "",
  })
  const [testEmailOpen, setTestEmailOpen] = React.useState(false)
  const [testEmailAddress, setTestEmailAddress] = React.useState("")

  // SMS configuration state
  const [smsDialogOpen, setSmsDialogOpen] = React.useState(false)
  const [smsFormData, setSmsFormData] = React.useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    whatsappNumber: "",
  })
  const [testSmsOpen, setTestSmsOpen] = React.useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = React.useState("")

  // OpenSolar configuration state
  const [openSolarDialogOpen, setOpenSolarDialogOpen] = React.useState(false)
  const [openSolarFormData, setOpenSolarFormData] = React.useState({
    username: "",
    password: "",
    organizationId: "",
  })
  const [testOpenSolarOpen, setTestOpenSolarOpen] = React.useState(false)

  // Stripe configuration state
  const [stripeDialogOpen, setStripeDialogOpen] = React.useState(false)
  const [stripeFormData, setStripeFormData] = React.useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
  })
  const [testStripeOpen, setTestStripeOpen] = React.useState(false)

  // Google Calendar test state
  const [testGoogleCalendarOpen, setTestGoogleCalendarOpen] = React.useState(false)

  // Otter.ai configuration state
  const [otterDialogOpen, setOtterDialogOpen] = React.useState(false)
  const [otterFormData, setOtterFormData] = React.useState({
    webhookSecret: "",
  })
  const [testOtterOpen, setTestOtterOpen] = React.useState(false)
  const [otterDisconnectDialogOpen, setOtterDisconnectDialogOpen] = React.useState(false)

  // Xero state
  const [testXeroOpen, setTestXeroOpen] = React.useState(false)
  const [xeroDisconnectDialogOpen, setXeroDisconnectDialogOpen] = React.useState(false)

  // QuickBooks state
  const [testQuickBooksOpen, setTestQuickBooksOpen] = React.useState(false)
  const [quickBooksDisconnectDialogOpen, setQuickBooksDisconnectDialogOpen] = React.useState(false)

  // Gmail/Outlook email integration state
  const [gmailDisconnectDialogOpen, setGmailDisconnectDialogOpen] = React.useState(false)
  const [outlookDisconnectDialogOpen, setOutlookDisconnectDialogOpen] = React.useState(false)

  // Email integrations data
  const { data: emailIntegrations, refetch: refetchEmailIntegrations } = useEmailIntegrations()
  const disconnectEmailMutation = useDisconnectEmailIntegration()

  // Disconnect confirmation state
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false)
  const [disconnectIntegrationType, setDisconnectIntegrationType] = React.useState<string | null>(null)

  // Fetch existing Twilio config for form prefill
  const { data: twilioConfig, refetch: refetchTwilioConfig } = useTwilioConfig()

  // Load existing Twilio config into form when dialog opens
  React.useEffect(() => {
    if (smsDialogOpen && twilioConfig && twilioConfig.configured) {
      setSmsFormData({
        accountSid: twilioConfig.accountSid || "",
        authToken: "", // Auth token never returned from API for security
        phoneNumber: twilioConfig.phoneNumber || "",
        whatsappNumber: twilioConfig.whatsappNumber || "",
      })
    }
  }, [smsDialogOpen, twilioConfig])

  // Mutations
  const configureEmailMutation = useConfigureEmailIntegration()
  const configureSMSMutation = useConfigureSmsIntegration()
  const testEmailMutation = useTestEmailIntegration()
  const testSmsMutation = useTestSmsIntegration()
  const configureOpenSolarMutation = useConfigureOpenSolar()
  const testOpenSolarMutation = useTestOpenSolar()
  const configureStripeMutation = useConfigureStripe()
  const testStripeMutation = useTestStripe()
  const testGoogleCalendarMutation = useTestGoogleCalendar()
  const configureOtterMutation = useConfigureOtter()
  const testOtterMutation = useTestOtter()
  const disconnectOtterMutation = useDisconnectOtter()
  const testXeroMutation = useTestXero()
  const disconnectXeroMutation = useDisconnectXero()
  const testQuickBooksMutation = useTestQuickBooks()
  const disconnectQuickBooksMutation = useDisconnectQuickBooks()
  const disconnectMutation = useDisconnectIntegration()

  // Handle OAuth callback messages from URL
  React.useEffect(() => {
    const success = searchParams?.get('success')
    const otterSuccess = searchParams?.get('otter_success')
    const error = searchParams?.get('error')
    const otterError = searchParams?.get('otter_error')

    if (success === 'google_calendar_connected') {
      toast.success('Google Calendar connected successfully!')
      // Remove query params
      router.replace('/settings/integrations')
    } else if (success === 'xero_connected') {
      toast.success('Xero connected successfully!')
      // Remove query params
      router.replace('/settings/integrations')
    } else if (success === 'quickbooks_connected') {
      toast.success('QuickBooks connected successfully!')
      // Remove query params
      router.replace('/settings/integrations')
    } else if (success === 'gmail_connected') {
      toast.success('Gmail connected successfully!')
      router.replace('/settings/integrations')
    } else if (success === 'outlook_connected') {
      toast.success('Outlook connected successfully!')
      router.replace('/settings/integrations')
    } else if (otterSuccess === 'true') {
      toast.success('Otter.ai connected successfully!')
      // Remove query params
      router.replace('/settings/integrations')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'OAuth authorization was denied',
        oauth_invalid: 'Invalid OAuth request',
        oauth_invalid_state: 'Invalid OAuth state',
        oauth_config: 'OAuth is not configured. Contact administrator.',
        oauth_token_exchange: 'Failed to exchange authorization code',
        oauth_storage: 'Failed to store integration',
        oauth_error: 'OAuth error occurred',
      }
      toast.error(errorMessages[error] || 'An error occurred during OAuth')
      // Remove query params
      router.replace('/settings/integrations')
    } else if (otterError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Otter.ai authorization was denied',
        oauth_invalid: 'Invalid Otter.ai OAuth request',
        oauth_invalid_state: 'Invalid Otter.ai OAuth state',
        oauth_config: 'Otter.ai OAuth is not configured. Contact administrator.',
        oauth_token_exchange: 'Failed to exchange Otter.ai authorization code',
        oauth_storage: 'Failed to store Otter.ai integration',
        oauth_error: 'Otter.ai OAuth error occurred',
      }
      toast.error(errorMessages[otterError] || 'An error occurred during Otter.ai OAuth')
      // Remove query params
      router.replace('/settings/integrations')
    }
  }, [searchParams, router])

  // Pre-fill email form when opening (if already configured)
  React.useEffect(() => {
    if (emailDialogOpen && integrations?.categories.communications.email) {
      const emailIntegration = integrations.categories.communications.email
      setEmailFormData({
        fromEmail: (emailIntegration.details.fromEmail as string) || "",
        fromName: (emailIntegration.details.fromName as string) || "",
        apiKey: "", // Never pre-fill API key for security
      })
    }
  }, [emailDialogOpen, integrations])

  // Pre-fill SMS form when opening (if already configured)
  React.useEffect(() => {
    if (smsDialogOpen && twilioConfig?.configured) {
      setSmsFormData({
        accountSid: twilioConfig.accountSid || "",
        authToken: "", // Never pre-fill auth token for security
        phoneNumber: twilioConfig.phoneNumber || "",
        whatsappNumber: twilioConfig.whatsappNumber || "",
      })
    }
  }, [smsDialogOpen, twilioConfig])

  // Handler: Configure Email
  const handleConfigureEmail = async () => {
    if (!emailFormData.fromEmail || !emailFormData.apiKey) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      await configureEmailMutation.mutateAsync({
        provider: "sendgrid",
        apiKey: emailFormData.apiKey,
        fromEmail: emailFormData.fromEmail,
        fromName: emailFormData.fromName || undefined,
      })
      toast.success("SendGrid integration configured successfully")
      setEmailDialogOpen(false)
      setEmailFormData({ fromEmail: "", fromName: "", apiKey: "" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure SendGrid integration")
    }
  }

  // Handler: Configure SMS
  const handleConfigureSms = async () => {
    if (!smsFormData.accountSid || !smsFormData.authToken || !smsFormData.phoneNumber) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      await configureSMSMutation.mutateAsync({
        provider: "twilio",
        accountSid: smsFormData.accountSid,
        authToken: smsFormData.authToken,
        phoneNumber: smsFormData.phoneNumber,
        whatsappNumber: smsFormData.whatsappNumber || undefined,
      })

      // Refetch config and integrations list
      await Promise.all([
        refetchTwilioConfig(),
        refetchIntegrations()
      ])

      toast.success("Twilio integration configured successfully")
      setSmsDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure Twilio integration")
    }
  }

  // Handler: Test Email
  const handleTestEmail = async () => {
    try {
      const result = await testEmailMutation.mutateAsync({
        toEmail: testEmailAddress || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        setTestEmailOpen(false)
        setTestEmailAddress("")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send test email")
    }
  }

  // Handler: Test SMS
  const handleTestSms = async () => {
    if (!testPhoneNumber) {
      toast.error("Please enter a phone number")
      return
    }

    try {
      const result = await testSmsMutation.mutateAsync({
        toPhone: testPhoneNumber,
      })
      if (result.success) {
        toast.success(result.message)
        setTestSmsOpen(false)
        setTestPhoneNumber("")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send test SMS")
    }
  }

  // Handler: Configure OpenSolar
  const handleConfigureOpenSolar = async () => {
    if (!openSolarFormData.username || !openSolarFormData.password) {
      toast.error("Email and password are required")
      return
    }
    if (!openSolarFormData.organizationId) {
      toast.error("Organization ID is required")
      return
    }

    try {
      await configureOpenSolarMutation.mutateAsync({
        username: openSolarFormData.username,
        password: openSolarFormData.password,
        organizationId: openSolarFormData.organizationId,
      })
      toast.success("OpenSolar integration configured successfully")
      setOpenSolarDialogOpen(false)
      setOpenSolarFormData({ username: "", password: "", organizationId: "" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure OpenSolar integration")
    }
  }

  // Handler: Test OpenSolar
  const handleTestOpenSolar = async () => {
    try {
      const result = await testOpenSolarMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestOpenSolarOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test OpenSolar integration")
    }
  }

  // Handler: Configure Stripe
  const handleConfigureStripe = async () => {
    if (!stripeFormData.publishableKey || !stripeFormData.secretKey) {
      toast.error("Publishable Key and Secret Key are required")
      return
    }

    try {
      await configureStripeMutation.mutateAsync({
        publishableKey: stripeFormData.publishableKey,
        secretKey: stripeFormData.secretKey,
        webhookSecret: stripeFormData.webhookSecret || undefined,
      })
      toast.success("Stripe integration configured successfully")
      setStripeDialogOpen(false)
      setStripeFormData({ publishableKey: "", secretKey: "", webhookSecret: "" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure Stripe integration")
    }
  }

  // Handler: Test Stripe
  const handleTestStripe = async () => {
    try {
      const result = await testStripeMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestStripeOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test Stripe integration")
    }
  }

  // Handler: Test Google Calendar
  const handleTestGoogleCalendar = async () => {
    try {
      const result = await testGoogleCalendarMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestGoogleCalendarOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test Google Calendar integration")
    }
  }

  // Handler: Connect Google Calendar (OAuth)
  const handleConnectGoogleCalendar = () => {
    // Redirect to OAuth start endpoint
    window.location.href = '/api/integrations/google-calendar/oauth/start'
  }

  // Handler: Configure Otter
  const handleConfigureOtter = async () => {
    if (!otterFormData.webhookSecret) {
      toast.error("Webhook Secret is required")
      return
    }

    try {
      await configureOtterMutation.mutateAsync({
        webhookSecret: otterFormData.webhookSecret,
      })
      toast.success("Otter.ai integration configured successfully")
      setOtterDialogOpen(false)
      setOtterFormData({ webhookSecret: "" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure Otter.ai integration")
    }
  }

  // Handler: Test Otter
  const handleTestOtter = async () => {
    try {
      const result = await testOtterMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestOtterOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test Otter.ai integration")
    }
  }

  // Handler: Connect Otter (OAuth)
  const handleConnectOtter = () => {
    // Redirect to OAuth start endpoint
    window.location.href = '/api/integrations/otter/oauth/start'
  }

  // Handler: Disconnect Otter
  const handleDisconnectOtter = async () => {
    try {
      await disconnectOtterMutation.mutateAsync()
      toast.success("Otter.ai disconnected successfully")
      setOtterDisconnectDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Otter.ai integration")
    }
  }

  // Handler: Test Xero
  const handleTestXero = async () => {
    try {
      const result = await testXeroMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestXeroOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test Xero integration")
    }
  }

  // Handler: Connect Xero (OAuth)
  const handleConnectXero = () => {
    window.location.href = '/api/integrations/xero/oauth/start'
  }

  // Handler: Disconnect Xero
  const handleDisconnectXero = async () => {
    try {
      await disconnectXeroMutation.mutateAsync()
      toast.success("Xero disconnected successfully")
      setXeroDisconnectDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Xero integration")
    }
  }

  // Handler: Test QuickBooks
  const handleTestQuickBooks = async () => {
    try {
      const result = await testQuickBooksMutation.mutateAsync()
      if (result.success) {
        toast.success(result.message)
        setTestQuickBooksOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to test QuickBooks integration")
    }
  }

  // Handler: Connect QuickBooks (OAuth)
  const handleConnectQuickBooks = () => {
    window.location.href = '/api/integrations/quickbooks/oauth/start'
  }

  // Handler: Disconnect QuickBooks
  const handleDisconnectQuickBooks = async () => {
    try {
      await disconnectQuickBooksMutation.mutateAsync()
      toast.success("QuickBooks disconnected successfully")
      setQuickBooksDisconnectDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect QuickBooks integration")
    }
  }

  // Handler: Connect Gmail (OAuth popup)
  const handleConnectGmail = () => {
    const width = 600
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const popup = window.open(
      '/api/integrations/gmail/auth',
      'gmail-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    // Poll for popup close and check for success
    const pollTimer = window.setInterval(() => {
      if (popup?.closed) {
        window.clearInterval(pollTimer)
        // Refetch integrations after popup closes
        refetchIntegrations()
        refetchEmailIntegrations()
      }
    }, 500)
  }

  // Handler: Connect Outlook (OAuth popup)
  const handleConnectOutlook = () => {
    const width = 600
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const popup = window.open(
      '/api/integrations/outlook/auth',
      'outlook-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )

    // Poll for popup close and check for success
    const pollTimer = window.setInterval(() => {
      if (popup?.closed) {
        window.clearInterval(pollTimer)
        // Refetch integrations after popup closes
        refetchIntegrations()
        refetchEmailIntegrations()
      }
    }, 500)
  }

  // Handler: Disconnect Gmail
  const handleDisconnectGmail = async () => {
    const gmail = emailIntegrations?.find(e => e.provider === 'gmail')
    if (!gmail) return
    try {
      await disconnectEmailMutation.mutateAsync(gmail.id)
      toast.success("Gmail disconnected successfully")
      setGmailDisconnectDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Gmail")
    }
  }

  // Handler: Disconnect Outlook
  const handleDisconnectOutlook = async () => {
    const outlook = emailIntegrations?.find(e => e.provider === 'outlook')
    if (!outlook) return
    try {
      await disconnectEmailMutation.mutateAsync(outlook.id)
      toast.success("Outlook disconnected successfully")
      setOutlookDisconnectDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Outlook")
    }
  }

  // Handler: Disconnect Integration
  const handleDisconnect = async () => {
    if (!disconnectIntegrationType) return

    try {
      await disconnectMutation.mutateAsync(disconnectIntegrationType)
      toast.success("Integration disconnected successfully")
      setDisconnectDialogOpen(false)
      setDisconnectIntegrationType(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect integration")
    }
  }

  // Render integration card
  const renderIntegrationCard = (
    integration: {
      integration_type: string
      name: string
      description: string
      configured: boolean
      is_active: boolean
      details: Record<string, unknown>
    } | undefined,
    icon: React.ReactNode,
    onConfigure: () => void,
    onTest?: () => void,
    badges?: { label: string; variant: "default" | "secondary" | "outline" | "destructive" }[]
  ) => {
    if (!integration) return null

    const statusBadge = integration.configured
      ? { label: "Connected", variant: "default" as const }
      : { label: "Not configured", variant: "secondary" as const }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  {badges?.map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                  ))}
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant} className="shrink-0">
                {statusBadge.label}
              </Badge>
              {integration.configured && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setDisconnectIntegrationType(integration.integration_type)
                    setDisconnectDialogOpen(true)
                  }}
                >
                  <Unplug className="h-4 w-4 mr-1" />
                  <span className="text-xs">Disconnect</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integration.configured && (
            <div className="space-y-2">
              {Object.entries(integration.details).map(([key, value]) => {
                // Skip sensitive fields
                if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
                  return (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium text-muted-foreground">••••••••</span>
                    </div>
                  )
                }
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{value as string || "Not set"}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="pt-3 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigure}
                className="gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                {integration.configured ? "Edit" : "Configure"}
              </Button>
              {integration.configured && onTest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTest}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render Coming Soon card - kept for future integrations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderComingSoonCard = (
    name: string,
    description: string,
    icon: React.ReactNode
  ) => {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{name}</CardTitle>
                  <Badge variant="outline" className="shrink-0 bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-xl font-display font-bold gradient-text-solar">
              Integrations
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your third-party integrations and connections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                General
              </a>
              <a
                href="/settings/organisation"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                Organisation
              </a>
              <a
                href="/settings/users"
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                Users
              </a>
              <a
                href="/settings/integrations"
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm font-medium"
              >
                <LinkIcon className="h-4 w-4" />
                Integrations
              </a>
            </CardContent>
          </Card>

          {/* Integrations Content */}
          <div className="lg:col-span-3 space-y-6">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Loading integrations...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LoadingSkeleton className="h-20" />
                  </CardContent>
                </Card>
              </>
            ) : error ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
                  <p className="text-sm text-destructive">Failed to load integrations</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Communications Category */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Communications
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Email and messaging integrations
                    </p>
                  </div>
                  <div className="space-y-3">
                    {renderIntegrationCard(
                      integrations?.categories.communications.email,
                      <SendGridLogo className="h-7 w-7 object-contain" />,
                      () => setEmailDialogOpen(true),
                      () => setTestEmailOpen(true)
                    )}
                    {renderIntegrationCard(
                      integrations?.categories.communications.sms,
                      <TwilioLogo className="h-7 w-7 object-contain" />,
                      () => setSmsDialogOpen(true),
                      () => setTestSmsOpen(true)
                    )}

                    {/* Gmail OAuth Integration */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                              <GmailLogo className="h-7 w-7 object-contain" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">Gmail</CardTitle>
                                <Badge variant="outline" className="shrink-0 bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                                  OAuth
                                </Badge>
                              </div>
                              <CardDescription>
                                Send and receive emails via your Gmail account
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={emailIntegrations?.some(e => e.provider === 'gmail') ? "default" : "secondary"}>
                              {emailIntegrations?.some(e => e.provider === 'gmail') ? "Connected" : "Not connected"}
                            </Badge>
                            {emailIntegrations?.some(e => e.provider === 'gmail') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setGmailDisconnectDialogOpen(true)}
                              >
                                <Unplug className="h-4 w-4 mr-1" />
                                <span className="text-xs">Disconnect</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {emailIntegrations?.some(e => e.provider === 'gmail') ? (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Connected Account:</span>
                                <span className="font-medium">
                                  {emailIntegrations.find(e => e.provider === 'gmail')?.email_address}
                                </span>
                              </div>
                              {emailIntegrations.find(e => e.provider === 'gmail')?.last_sync_at && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Last Synced:</span>
                                  <span className="font-medium text-xs">
                                    {new Date(emailIntegrations.find(e => e.provider === 'gmail')!.last_sync_at!).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConnectGmail}
                                  className="gap-1.5"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Reconnect
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={handleConnectGmail}
                            className="w-full"
                          >
                            Connect Gmail
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Outlook OAuth Integration */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                              <OutlookLogo className="h-7 w-7 object-contain" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">Outlook</CardTitle>
                                <Badge variant="outline" className="shrink-0 bg-blue-500/10 text-blue-300 border-blue-500/20">
                                  OAuth
                                </Badge>
                              </div>
                              <CardDescription>
                                Send and receive emails via your Outlook/Microsoft 365 account
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={emailIntegrations?.some(e => e.provider === 'outlook') ? "default" : "secondary"}>
                              {emailIntegrations?.some(e => e.provider === 'outlook') ? "Connected" : "Not connected"}
                            </Badge>
                            {emailIntegrations?.some(e => e.provider === 'outlook') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setOutlookDisconnectDialogOpen(true)}
                              >
                                <Unplug className="h-4 w-4 mr-1" />
                                <span className="text-xs">Disconnect</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {emailIntegrations?.some(e => e.provider === 'outlook') ? (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Connected Account:</span>
                                <span className="font-medium">
                                  {emailIntegrations.find(e => e.provider === 'outlook')?.email_address}
                                </span>
                              </div>
                              {emailIntegrations.find(e => e.provider === 'outlook')?.last_sync_at && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Last Synced:</span>
                                  <span className="font-medium text-xs">
                                    {new Date(emailIntegrations.find(e => e.provider === 'outlook')!.last_sync_at!).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConnectOutlook}
                                  className="gap-1.5"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Reconnect
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={handleConnectOutlook}
                            className="w-full"
                          >
                            Connect Outlook
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Solar & Design Category — hidden per Jacob's review Feb 2026 */}

                {/* Payments Category */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Payments
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Payment processing integrations
                    </p>
                  </div>
                  <div className="space-y-3">
                    {renderIntegrationCard(
                      integrations?.categories.payments.stripe,
                      <StripeLogo className="h-7 w-7 object-contain" />,
                      () => setStripeDialogOpen(true),
                      () => setTestStripeOpen(true),
                      [{ label: "Beta", variant: "outline" }]
                    )}
                  </div>
                </div>

                {/* Accounting Category */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Accounting
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sync invoices and payments with your accounting software
                    </p>
                  </div>
                  <div className="space-y-3">
                    {/* Xero Integration */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                              <XeroLogo className="h-7 w-7 object-contain" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">Xero</CardTitle>
                                <Badge variant="outline">Pro</Badge>
                              </div>
                              <CardDescription>
                                Sync invoices and contacts with Xero accounting
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={integrations?.categories.accounting?.xero?.configured ? "default" : "secondary"}>
                              {integrations?.categories.accounting?.xero?.configured ? "Connected" : "Not connected"}
                            </Badge>
                            {integrations?.categories.accounting?.xero?.configured && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setXeroDisconnectDialogOpen(true)}
                              >
                                <Unplug className="h-4 w-4 mr-1" />
                                <span className="text-xs">Disconnect</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {integrations?.categories.accounting?.xero?.configured ? (
                          <>
                            <div className="space-y-2">
                              {typeof integrations.categories.accounting.xero.details.xeroTenantName === 'string' && 
                               integrations.categories.accounting.xero.details.xeroTenantName && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Organization:</span>
                                  <span className="font-medium">
                                    {integrations.categories.accounting.xero.details.xeroTenantName}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTestXeroOpen(true)}
                                  className="gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Test
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConnectXero}
                                  className="gap-1.5"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Reconnect
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={handleConnectXero}
                            className="w-full"
                          >
                            Connect Xero
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* QuickBooks Integration */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden">
                              <QuickBooksLogo className="h-7 w-7 object-contain" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">QuickBooks</CardTitle>
                                <Badge variant="outline">Pro</Badge>
                              </div>
                              <CardDescription>
                                Sync invoices and contacts with QuickBooks accounting
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={integrations?.categories.accounting?.quickbooks?.configured ? "default" : "secondary"}>
                              {integrations?.categories.accounting?.quickbooks?.configured ? "Connected" : "Not connected"}
                            </Badge>
                            {integrations?.categories.accounting?.quickbooks?.configured && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setQuickBooksDisconnectDialogOpen(true)}
                              >
                                <Unplug className="h-4 w-4 mr-1" />
                                <span className="text-xs">Disconnect</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {integrations?.categories.accounting?.quickbooks?.configured ? (
                          <>
                            <div className="space-y-2">
                              {typeof integrations.categories.accounting.quickbooks.details.companyName === 'string' && 
                               integrations.categories.accounting.quickbooks.details.companyName && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Company:</span>
                                  <span className="font-medium">
                                    {integrations.categories.accounting.quickbooks.details.companyName}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTestQuickBooksOpen(true)}
                                  className="gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Test
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConnectQuickBooks}
                                  className="gap-1.5"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Reconnect
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={handleConnectQuickBooks}
                            className="w-full"
                          >
                            Connect QuickBooks
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Calendar Category */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Calendar
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calendar and scheduling integrations
                    </p>
                  </div>
                  <div className="space-y-3">
                    {renderIntegrationCard(
                      integrations?.categories.calendar.google_calendar,
                      <GoogleCalendarLogo className="h-7 w-7 object-contain" />,
                      handleConnectGoogleCalendar,
                      () => setTestGoogleCalendarOpen(true)
                    )}
                  </div>
                </div>

                {/* Call Recordings & Transcription Category */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Call Recordings & Transcription
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Call recording and transcription services
                    </p>
                  </div>
                  <div className="space-y-3">
                    {/* Custom Otter.ai card with OAuth support */}
                    {integrations?.categories.transcription.otter && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <OtterLogo className="h-7 w-7 object-contain" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">
                                    {integrations.categories.transcription.otter.name}
                                  </CardTitle>
                                </div>
                                <CardDescription>
                                  {integrations.categories.transcription.otter.description}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  integrations.categories.transcription.otter.details.otter_email
                                    ? "default"
                                    : "secondary"
                                }
                                className="shrink-0"
                              >
                                {integrations.categories.transcription.otter.details.otter_email
                                  ? "Connected"
                                  : "Not configured"}
                              </Badge>
                              {!!integrations.categories.transcription.otter.details.otter_email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setOtterDisconnectDialogOpen(true)}
                                >
                                  <Unplug className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Disconnect</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {integrations.categories.transcription.otter.details.otter_email ? (
                            // Connected state - show OAuth details
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Connected Account:</span>
                                <span className="font-medium">
                                  {integrations.categories.transcription.otter.details.otter_email as string}
                                </span>
                              </div>
                              {!!integrations.categories.transcription.otter.details.webhookUrl && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Webhook URL:</span>
                                  <span className="font-mono text-xs">
                                    {integrations.categories.transcription.otter.details.webhookUrl as string}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Not connected state
                            <div className="text-sm text-muted-foreground">
                              Connect your Otter.ai account to enable automatic call transcription in job timelines.
                            </div>
                          )}
                          <div className="pt-3 border-t">
                            {integrations.categories.transcription.otter.details.otter_email ? (
                              // Connected: Show Test and Reconfigure
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTestOtterOpen(true)}
                                  className="gap-1.5"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Test
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOtterDialogOpen(true)}
                                  className="gap-1.5"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Configure Webhook
                                </Button>
                              </div>
                            ) : (
                              // Not connected: Show OAuth button and manual option
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={handleConnectOtter}
                                  className="gap-1.5 w-full"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" />
                                  Connect with Otter
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOtterDialogOpen(true)}
                                  className="gap-1.5 w-full"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Or configure webhook secret manually
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email Configuration Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure SendGrid</DialogTitle>
            <DialogDescription>
              Enter your SendGrid credentials to enable email sending from the Communications inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-from">From Email *</Label>
              <Input
                id="email-from"
                type="email"
                placeholder="hello@yourcompany.com"
                value={emailFormData.fromEmail}
                onChange={(e) => setEmailFormData({ ...emailFormData, fromEmail: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This email address must be verified in your SendGrid account
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-name">From Name</Label>
              <Input
                id="email-name"
                placeholder="Your Company"
                value={emailFormData.fromName}
                onChange={(e) => setEmailFormData({ ...emailFormData, fromName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-api-key">API Key *</Label>
              <Input
                id="email-api-key"
                type="password"
                placeholder="SG.xxxxxxxxxxxx"
                value={emailFormData.apiKey}
                onChange={(e) => setEmailFormData({ ...emailFormData, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your SendGrid API key (never shared or displayed)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigureEmail}
              disabled={configureEmailMutation.isPending}
              loading={configureEmailMutation.isPending}
            >
              {configureEmailMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Configuration Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Twilio</DialogTitle>
            <DialogDescription>
              Enter your Twilio credentials to enable SMS and WhatsApp sending from the Communications inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sms-account-sid">Account SID *</Label>
              <Input
                id="sms-account-sid"
                placeholder="ACxxxxxxxxxxxx"
                value={smsFormData.accountSid}
                onChange={(e) => setSmsFormData({ ...smsFormData, accountSid: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-auth-token">Auth Token *</Label>
              <Input
                id="sms-auth-token"
                type="password"
                placeholder={twilioConfig?.configured ? "••••••••••••••••" : "Enter auth token"}
                value={smsFormData.authToken}
                onChange={(e) => setSmsFormData({ ...smsFormData, authToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {twilioConfig?.configured
                  ? "Already configured. Leave blank to keep existing, or enter new token to update."
                  : "Your Twilio Auth Token (never shared or displayed)"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-phone">SMS Phone Number *</Label>
              <Input
                id="sms-phone"
                type="tel"
                placeholder="+441234567890"
                value={smsFormData.phoneNumber}
                onChange={(e) => setSmsFormData({ ...smsFormData, phoneNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Twilio phone number in E.164 format (e.g., +441234567890)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-whatsapp">WhatsApp Number (optional)</Label>
              <Input
                id="sms-whatsapp"
                type="tel"
                placeholder="+441234567890"
                value={smsFormData.whatsappNumber}
                onChange={(e) => setSmsFormData({ ...smsFormData, whatsappNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Twilio WhatsApp number in E.164 format (e.g., +447480486658). Do not include "whatsapp:" prefix.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigureSms}
              disabled={configureSMSMutation.isPending}
              loading={configureSMSMutation.isPending}
            >
              {configureSMSMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify your SendGrid integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">To Email (optional)</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com (or leave blank for your email)"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to send to your account email
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestEmail}
              disabled={testEmailMutation.isPending}
              loading={testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test SMS Dialog */}
      <Dialog open={testSmsOpen} onOpenChange={setTestSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test SMS</DialogTitle>
            <DialogDescription>
              Send a test SMS to verify your Twilio integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">To Phone Number *</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+441234567890"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter phone number in E.164 format (e.g., +441234567890)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSmsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestSms}
              disabled={testSmsMutation.isPending}
              loading={testSmsMutation.isPending}
            >
              {testSmsMutation.isPending ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OpenSolar Configuration Dialog */}
      <Dialog open={openSolarDialogOpen} onOpenChange={setOpenSolarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure OpenSolar</DialogTitle>
            <DialogDescription>
              Enter your OpenSolar login credentials to enable solar design integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opensolar-username">Email *</Label>
              <Input
                id="opensolar-username"
                type="email"
                placeholder="your@email.com"
                value={openSolarFormData.username}
                onChange={(e) => setOpenSolarFormData({ ...openSolarFormData, username: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your OpenSolar login email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opensolar-password">Password *</Label>
              <Input
                id="opensolar-password"
                type="password"
                placeholder="••••••••"
                value={openSolarFormData.password}
                onChange={(e) => setOpenSolarFormData({ ...openSolarFormData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your OpenSolar password (stored securely)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opensolar-org">Organization ID *</Label>
              <Input
                id="opensolar-org"
                type="text"
                placeholder="e.g. 12345"
                value={openSolarFormData.organizationId}
                onChange={(e) => setOpenSolarFormData({ ...openSolarFormData, organizationId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your OpenSolar URL (e.g. /orgs/12345/)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSolarDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigureOpenSolar}
              disabled={configureOpenSolarMutation.isPending}
              loading={configureOpenSolarMutation.isPending}
            >
              {configureOpenSolarMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test OpenSolar Dialog */}
      <Dialog open={testOpenSolarOpen} onOpenChange={setTestOpenSolarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test OpenSolar Connection</DialogTitle>
            <DialogDescription>
              Verify your OpenSolar integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the connection to OpenSolar and verify your credentials.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpenSolarOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestOpenSolar}
              disabled={testOpenSolarMutation.isPending}
              loading={testOpenSolarMutation.isPending}
            >
              {testOpenSolarMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Configuration Dialog */}
      <Dialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Stripe</DialogTitle>
            <DialogDescription>
              Enter your Stripe credentials to enable payment processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-300 mt-0.5" />
              <div className="text-xs text-yellow-300">
                <strong>Beta:</strong> Make sure to use test mode keys for testing. Switch to live mode keys only when ready for production.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-publishable">Publishable Key *</Label>
              <Input
                id="stripe-publishable"
                placeholder="pk_test_xxxxxxxxxxxx or pk_live_xxxxxxxxxxxx"
                value={stripeFormData.publishableKey}
                onChange={(e) => setStripeFormData({ ...stripeFormData, publishableKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe publishable key (starts with pk_test_ or pk_live_)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-secret">Secret Key *</Label>
              <Input
                id="stripe-secret"
                type="password"
                placeholder="sk_test_xxxxxxxxxxxx or sk_live_xxxxxxxxxxxx"
                value={stripeFormData.secretKey}
                onChange={(e) => setStripeFormData({ ...stripeFormData, secretKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe secret key (never shared or displayed)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-webhook">Webhook Secret (optional)</Label>
              <Input
                id="stripe-webhook"
                type="password"
                placeholder="whsec_xxxxxxxxxxxx"
                value={stripeFormData.webhookSecret}
                onChange={(e) => setStripeFormData({ ...stripeFormData, webhookSecret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe webhook secret for event verification
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStripeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigureStripe}
              disabled={configureStripeMutation.isPending}
              loading={configureStripeMutation.isPending}
            >
              {configureStripeMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Stripe Dialog */}
      <Dialog open={testStripeOpen} onOpenChange={setTestStripeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Stripe Connection</DialogTitle>
            <DialogDescription>
              Verify your Stripe integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the connection to Stripe and verify your credentials.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestStripeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestStripe}
              disabled={testStripeMutation.isPending}
              loading={testStripeMutation.isPending}
            >
              {testStripeMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Google Calendar Dialog */}
      <Dialog open={testGoogleCalendarOpen} onOpenChange={setTestGoogleCalendarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Google Calendar Connection</DialogTitle>
            <DialogDescription>
              Verify your Google Calendar integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the connection to Google Calendar and verify your OAuth credentials.
              If your token has expired, it will be automatically refreshed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestGoogleCalendarOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestGoogleCalendar}
              disabled={testGoogleCalendarMutation.isPending}
              loading={testGoogleCalendarMutation.isPending}
            >
              {testGoogleCalendarMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Otter.ai Configuration Dialog */}
      <Dialog open={otterDialogOpen} onOpenChange={setOtterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Otter.ai</DialogTitle>
            <DialogDescription>
              Configure Otter webhook secret so call recordings and transcripts can appear in BOS timelines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="otter-webhook-secret">Webhook Secret *</Label>
              <Input
                id="otter-webhook-secret"
                type="password"
                placeholder="Enter your Otter.ai webhook secret"
                value={otterFormData.webhookSecret}
                onChange={(e) => setOtterFormData({ ...otterFormData, webhookSecret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This secret will be used to validate incoming webhooks from Otter.ai
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtterDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfigureOtter}
              disabled={configureOtterMutation.isPending}
              loading={configureOtterMutation.isPending}
            >
              {configureOtterMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Otter Dialog */}
      <Dialog open={testOtterOpen} onOpenChange={setTestOtterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Otter.ai Connection</DialogTitle>
            <DialogDescription>
              Verify your Otter.ai integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the Otter.ai webhook configuration and verify your credentials.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOtterOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestOtter}
              disabled={testOtterMutation.isPending}
              loading={testOtterMutation.isPending}
            >
              {testOtterMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this integration? This will remove all stored credentials and configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Otter Disconnect Confirmation Dialog */}
      <Dialog open={otterDisconnectDialogOpen} onOpenChange={setOtterDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Otter.ai</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Otter.ai? This will remove OAuth access and webhook configuration.
              You will need to reconnect to receive new transcriptions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOtterDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectOtter}
              disabled={disconnectOtterMutation.isPending}
            >
              {disconnectOtterMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Xero Dialog */}
      <Dialog open={testXeroOpen} onOpenChange={setTestXeroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Xero Connection</DialogTitle>
            <DialogDescription>
              Verify your Xero integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the connection to Xero and verify your OAuth credentials.
              If your token has expired, it will be automatically refreshed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestXeroOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestXero}
              disabled={testXeroMutation.isPending}
            >
              {testXeroMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xero Disconnect Confirmation Dialog */}
      <Dialog open={xeroDisconnectDialogOpen} onOpenChange={setXeroDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Xero</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Xero? This will remove OAuth access.
              You will need to reconnect to sync invoices and contacts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setXeroDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectXero}
              disabled={disconnectXeroMutation.isPending}
            >
              {disconnectXeroMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test QuickBooks Dialog */}
      <Dialog open={testQuickBooksOpen} onOpenChange={setTestQuickBooksOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test QuickBooks Connection</DialogTitle>
            <DialogDescription>
              Verify your QuickBooks integration is working correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will test the connection to QuickBooks and verify your OAuth credentials.
              If your token has expired, it will be automatically refreshed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestQuickBooksOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTestQuickBooks}
              disabled={testQuickBooksMutation.isPending}
            >
              {testQuickBooksMutation.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QuickBooks Disconnect Confirmation Dialog */}
      <Dialog open={quickBooksDisconnectDialogOpen} onOpenChange={setQuickBooksDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect QuickBooks</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect QuickBooks? This will remove OAuth access.
              You will need to reconnect to sync invoices and contacts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickBooksDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectQuickBooks}
              disabled={disconnectQuickBooksMutation.isPending}
            >
              {disconnectQuickBooksMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gmail Disconnect Confirmation Dialog */}
      <Dialog open={gmailDisconnectDialogOpen} onOpenChange={setGmailDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Gmail</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Gmail? This will remove OAuth access and stop email syncing.
              You will need to reconnect to send/receive emails via Gmail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGmailDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectGmail}
              disabled={disconnectEmailMutation.isPending}
            >
              {disconnectEmailMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outlook Disconnect Confirmation Dialog */}
      <Dialog open={outlookDisconnectDialogOpen} onOpenChange={setOutlookDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Outlook</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect Outlook? This will remove OAuth access and stop email syncing.
              You will need to reconnect to send/receive emails via Outlook.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOutlookDisconnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectOutlook}
              disabled={disconnectEmailMutation.isPending}
            >
              {disconnectEmailMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  )
}
