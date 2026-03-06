"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MetricCard } from "@/components/ui/metric-card"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import {
  Search,
  Pencil,
  Sun,
  ExternalLink,
  Download,
  AlertCircle,
  Settings,
  Zap,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import Link from "next/link"
import { toast } from "sonner"

interface OpenSolarProject {
  opensolar_project_id: string
  customer_name: string
  address?: string
  system_size_kwp: number
  estimated_value: number
  status?: string
  created_at: string
  already_imported: boolean
  job_id?: string
}

interface DesignsResponse {
  data: OpenSolarProject[]
  integration_configured: boolean
}

interface ProjectsApiResponse {
  data: OpenSolarProject[]
  pagination?: {
    page: number
    limit: number
    total: number
  }
}

function useOpenSolarProjects() {
  return useQuery({
    queryKey: ["opensolar-projects"],
    queryFn: async () => {
      try {
        const response = await api.get<ProjectsApiResponse>("/integrations/opensolar/projects")
        console.log('[Designs] API response:', response)
        // response is { data: [...projects], pagination: {...} }
        const projects = response?.data || []
        return {
          data: Array.isArray(projects) ? projects : [],
          integration_configured: true,
        } as DesignsResponse
      } catch (error: unknown) {
        console.error('[Designs] API error:', error)
        // Check if it's a configuration error
        const err = error as { message?: string; status?: number }
        if (err?.message?.includes("not configured") || err?.status === 400) {
          return {
            data: [],
            integration_configured: false,
          } as DesignsResponse
        }
        throw error
      }
    },
    retry: false,
  })
}

export default function DesignsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [importingIds, setImportingIds] = React.useState<Set<string>>(new Set())
  
  const { data: response, isLoading, error } = useOpenSolarProjects()

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      const response = await api.post<{
        imported: number
        failed: number
        skipped: number
        jobs: Array<{ id: string; opensolar_id: string; title: string }>
        errors?: Array<{ projectId: string; error: string }>
      }>("/integrations/opensolar/import", { projectIds })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opensolar-projects"] })
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} project${data.imported > 1 ? 's' : ''}`)
      }
      if (data.failed > 0) {
        toast.error(`Failed to import ${data.failed} project${data.failed > 1 ? 's' : ''}`)
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} already imported`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Import failed")
    },
  })

  // Import single project
  const handleImportSingle = async (projectId: string) => {
    setImportingIds(prev => new Set([...prev, projectId]))
    try {
      const result = await importMutation.mutateAsync([projectId])
      if (result.jobs?.length > 0) {
        // Navigate to the newly created job
        router.push(`/jobs/${result.jobs[0].id}`)
      }
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  // Import all pending projects
  const handleImportAll = async () => {
    const pendingProjects = projects.filter(p => !p.already_imported)
    if (pendingProjects.length === 0) {
      toast.info("No projects to import")
      return
    }
    const ids = pendingProjects.map(p => p.opensolar_project_id)
    setImportingIds(new Set(ids))
    try {
      await importMutation.mutateAsync(ids)
    } finally {
      setImportingIds(new Set())
    }
  }
  
  const projects = React.useMemo(() => response?.data || [], [response?.data])
  const isConfigured = response?.integration_configured ?? false

  // Filter projects
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(p => 
      p.customer_name?.toLowerCase().includes(query) ||
      p.address?.toLowerCase().includes(query)
    )
  }, [projects, searchQuery])

  // Stats
  const totalProjects = projects.length
  const importedCount = projects.filter(p => p.already_imported).length
  const pendingCount = totalProjects - importedCount
  const totalKwp = projects.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0)

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
      year: "numeric",
    })
  }

  // Not configured state
  if (!isLoading && !isConfigured) {
    return (
      
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h1 className="text-xl font-display font-bold gradient-text-solar">
              Designs
            </h1>
          </div>

          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sun className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Connect OpenSolar</CardTitle>
              <CardDescription>
                Link your OpenSolar account to import solar designs directly into Cold Lava.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-sm">What you'll get:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Import projects from OpenSolar with one click
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Auto-create customers and jobs from designs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Sync system specs and pricing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Generate quotes from OpenSolar proposals
                  </li>
                </ul>
              </div>
              <div className="flex justify-center">
                <Link href="/settings/integrations">
                  <Button className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configure OpenSolar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      
    )
  }

  return (
    
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <h1 className="text-xl font-display font-bold gradient-text-solar">
            Designs
          </h1>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search designs..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {totalProjects} designs
          </Badge>
          {pendingCount > 0 && (
            <Button 
              size="sm" 
              className="h-8 gap-1.5"
              disabled={importMutation.isPending}
              onClick={handleImportAll}
            >
              {importMutation.isPending ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Import All ({pendingCount})
                </>
              )}
            </Button>
          )}
          <Link href="/settings/integrations">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard
            title="Total Designs"
            value={totalProjects}
            icon={<Pencil className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="Imported"
            value={importedCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="primary"
            loading={isLoading}
          />
          <MetricCard
            title="Pending Import"
            value={pendingCount}
            icon={<Clock className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="Total Capacity"
            value={`${totalKwp.toFixed(1)} kWp`}
            icon={<Zap className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
        </div>

        {/* Projects list */}
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
              <p className="text-sm text-destructive">Failed to load OpenSolar projects</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(error as Error)?.message || "Check your OpenSolar credentials in Settings → Integrations"}
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center">
              <Pencil className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">No designs found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create designs in OpenSolar and they'll appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <div
                  key={project.opensolar_project_id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{project.customer_name}</span>
                        {project.already_imported ? (
                          <Badge variant="default" className="bg-green-500/15 text-green-300 border-green-500/20">
                            Imported
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/20">
                            Ready to Import
                          </Badge>
                        )}
                      </div>
                      {project.address && (
                        <p className="text-xs text-muted-foreground mb-2">{project.address}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {project.system_size_kwp} kWp
                        </span>
                        <span>{formatCurrency(project.estimated_value)}</span>
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.already_imported && project.job_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => router.push(`/jobs/${project.job_id}`)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Job
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5"
                          disabled={importingIds.has(project.opensolar_project_id)}
                          onClick={() => handleImportSingle(project.opensolar_project_id)}
                        >
                          {importingIds.has(project.opensolar_project_id) ? (
                            <>
                              <Clock className="h-3.5 w-3.5 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Import
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a
                          href={`https://app.opensolar.com/project/${project.opensolar_project_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    
  )
}
