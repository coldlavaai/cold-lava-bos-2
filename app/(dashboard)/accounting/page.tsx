"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MetricCard } from "@/components/ui/metric-card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Settings,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  CreditCard,
  Receipt,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import Link from "next/link"

import { useJobs } from "@/lib/api/hooks"

interface AccountingIntegration {
  provider: 'xero' | 'quickbooks' | 'sage'
  provider_organization_name: string | null
  sync_enabled: boolean
  last_sync_at: string | null
  last_sync_status: 'success' | 'failed' | null
}

interface QuoteSummary {
  id: string
  quote_number: string
  job_id: string
  job_number: string
  customer_name: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  total_amount: number
  created_at: string
}

function useAccountingIntegration() {
  return useQuery({
    queryKey: ["accounting-integration"],
    queryFn: async () => {
      try {
        const response = await api.get<AccountingIntegration>("/integrations/accounting")
        return response.data
      } catch {
        return null
      }
    },
    retry: false,
  })
}

export default function AccountingPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  
  const { data: integration, isLoading: integrationLoading } = useAccountingIntegration()
  const { data: jobsResponse, isLoading: jobsLoading } = useJobs({ limit: 100 })
  
  const jobs = jobsResponse?.data || []
  
  // Calculate financial metrics from jobs
  // Jobs are considered "completed" if they're in the final stage (highest position) or have "complete" in name
  const totalPipelineValue = jobs.reduce((sum, j) => sum + (j.estimated_value || 0), 0)
  const completedJobs = jobs.filter(j => 
    j.current_stage?.name?.toLowerCase().includes('complete') || 
    j.current_stage?.name?.toLowerCase().includes('finished')
  )
  const completedValue = completedJobs.reduce((sum, j) => sum + (j.estimated_value || 0), 0)
  const pendingValue = totalPipelineValue - completedValue
  
  // TODO: Fetch real quotes from API when implemented
  // For now, use empty array - no fake data
  const quotes: QuoteSummary[] = []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-500/15 text-green-300 border-green-500/20">Accepted</Badge>
      case "sent":
        return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/20">Sent</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "rejected":
        return <Badge className="bg-red-500/15 text-red-300 border-red-500/20">Rejected</Badge>
      case "expired":
        return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/20">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredQuotes = quotes.filter(q => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        q.customer_name.toLowerCase().includes(query) ||
        q.quote_number.toLowerCase().includes(query) ||
        q.job_number.toLowerCase().includes(query)
      )
    }
    return true
  })

  const isLoading = integrationLoading || jobsLoading

  return (
    
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h1 className="text-xl font-display font-bold gradient-text-solar">
            Accounting
          </h1>
          <div className="flex items-center gap-2">
            {integration ? (
              <Badge variant="outline" className="gap-1.5 bg-green-500/15 text-green-300 border-green-500/20">
                <CheckCircle2 className="h-3 w-3" />
                {integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Connected
              </Badge>
            ) : (
              <Link href="/settings/integrations">
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Connect Xero
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard
            title="Pipeline Value"
            value={formatCurrency(totalPipelineValue)}
            subtitle={`${jobs.length} active jobs`}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="primary"
            loading={isLoading}
          />
          <MetricCard
            title="Completed Value"
            value={formatCurrency(completedValue)}
            subtitle={`${completedJobs.length} jobs completed`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="Pending Value"
            value={formatCurrency(pendingValue)}
            icon={<Clock className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="Quotes Sent"
            value={quotes.filter(q => q.status !== "draft").length}
            subtitle={`${quotes.filter(q => q.status === "accepted").length} accepted`}
            icon={<FileText className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
        </div>

        {/* Integration Status Card */}
        {integration && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Accounting Sync</CardTitle>
                <Button variant="outline" size="sm" className="h-7 gap-1.5">
                  <RefreshCw className="h-3 w-3" />
                  Sync Now
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Provider:</span>{" "}
                  <span className="font-medium">{integration.provider_organization_name || integration.provider}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>{" "}
                  <span className="font-medium">
                    {integration.last_sync_at 
                      ? new Date(integration.last_sync_at).toLocaleString("en-GB")
                      : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {integration.last_sync_status === "success" ? (
                    <Badge variant="outline" className="bg-green-500/15 text-green-300 border-green-500/20">
                      Success
                    </Badge>
                  ) : integration.last_sync_status === "failed" ? (
                    <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/20">
                      Failed
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quotes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Quotes</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search quotes..."
                    className="pl-8 h-8 w-[200px] text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <LoadingSkeleton className="h-12" />
                <LoadingSkeleton className="h-12" />
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No quotes found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Quotes will appear here when created from jobs"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{quote.quote_number}</span>
                          {getStatusBadge(quote.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quote.customer_name} • {quote.job_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(quote.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(quote.created_at)}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {!integration && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">Connect Your Accounting Software</CardTitle>
              <CardDescription>
                Sync invoices and payments with Xero, QuickBooks, or Sage to keep your finances in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/settings/integrations">
                <Button className="gap-2">
                  <Settings className="h-4 w-4" />
                  Set Up Integration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    
  )
}
