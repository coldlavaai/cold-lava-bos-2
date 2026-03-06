"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
  MapPin,
  ChevronRight,
  ChevronLeft,
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

interface Installation {
  id: string
  job_number: string
  customer_id: string
  customer_name: string
  status: 'in_progress' | 'completed'
  current_stage_name: string
  installation_address: string | null
  installation_postcode: string | null
  installation_scheduled_date: string | null
  installation_completed_date: string | null
  assigned_to_name: string | null
}

interface InstallationsResponse {
  data: Installation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function useInstallations(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) {
  return useQuery({
    queryKey: ["installations", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set("page", String(params.page))
      if (params.limit) searchParams.set("limit", String(params.limit))
      if (params.search) searchParams.set("search", params.search)
      if (params.status && params.status !== "all") searchParams.set("status", params.status)
      
      const response = await api.get<Installation[]>(`/installations?${searchParams.toString()}`)
      return response as unknown as InstallationsResponse
    },
  })
}

export default function InstallationsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const limit = 999 // Load all records — no pagination

  const { data: response, isLoading, error } = useInstallations({
    page: 1,
    limit,
    search: searchQuery,
  })

  const installations = response?.data || []
  const totalCount = response?.pagination?.total || installations.length

  // Calculate stats
  const completedCount = installations.filter(i => i.status === "completed").length
  const inProgressCount = installations.filter(i => i.status === "in_progress").length

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return <Badge variant="default" className="bg-green-500/15 text-green-300 border-green-500/20">Completed</Badge>
    }
    return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/20">In Progress</Badge>
  }

  // SOLAR-SPECIFIC: compliance badge removed for Cold Lava

  return (
    
      <div className="space-y-4">
        {/* Compact header with search */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <h1 className="text-lg md:text-xl font-display font-bold gradient-text-solar">
            Clients
          </h1>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by job, customer, postcode..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {totalCount} total
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            title="Total Clients"
            value={totalCount}
            icon={<Wrench className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="Completed"
            value={completedCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="primary"
            loading={isLoading}
          />
          <MetricCard
            title="In Progress"
            value={inProgressCount}
            icon={<Clock className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
        </div>

        {/* Installations list */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
              <LoadingSkeleton className="h-16" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p className="text-sm text-destructive">Failed to load installations</p>
            </div>
          ) : installations.length === 0 ? (
            <div className="p-8 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">No clients found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Clients will appear here when jobs reach the active stage"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {installations.map((installation) => (
                <div
                  key={installation.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/installations/${installation.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{installation.job_number}</span>
                        {getStatusBadge(installation.status)}
                      </div>
                      <p className="text-sm text-foreground mb-1">{installation.customer_name}</p>
                      {installation.installation_address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{installation.installation_address}</span>
                          {installation.installation_postcode && (
                            <span className="font-medium">{installation.installation_postcode}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {installation.status === "completed"
                            ? `Completed ${formatDate(installation.installation_completed_date)}`
                            : `Scheduled ${formatDate(installation.installation_scheduled_date)}`}
                        </span>
                      </div>
                      {installation.assigned_to_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {installation.assigned_to_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination removed — show all results */}
        </Card>
      </div>
    
  )
}
