"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/use-debounce"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/components/ui/command"
import {
  Search,
  Briefcase,
  Users,
  Calendar,
  FileText,
  MapPin,
  Tag,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api/client"

interface SearchResult {
  id: string
  type: "job" | "customer" | "appointment" | "quote"
  title: string
  subtitle?: string
  badges?: string[]
  href: string
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  
  const debouncedQuery = useDebounce(query, 200)

  // Keyboard shortcut to open: / or Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !e.metaKey && !e.ctrlKey)) {
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Search when query changes
  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()

    const search = async () => {
      setIsLoading(true)
      try {
        // Search jobs (includes customer data via joins)
        const jobsRes = await api.get<{
          data: Array<{
            id: string
            job_number: string
            tags: string[] | null
            notes: string | null
            site_address?: string | null
            installation_postcode?: string | null
            customer?: {
              id: string
              name: string
              email?: string | null
              phone?: string | null
              postcode?: string | null
              city?: string | null
            } | null
            current_stage?: { name: string; color: string } | null
          }>
        }>(`/jobs?search=${encodeURIComponent(debouncedQuery)}&limit=999`, {
          signal: controller.signal,
        })
        
        // Search customers
        const customersRes = await api.get<Array<{
          id: string
          name: string
          email?: string | null
          phone?: string | null
          postcode?: string | null
          city?: string | null
        }>>(`/customers?search=${encodeURIComponent(debouncedQuery)}&limit=10`, {
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        const searchResults: SearchResult[] = []
        const searchLower = debouncedQuery.toLowerCase()
        
        // Process jobs - apply additional client-side filtering for city, postcode, tags
        const jobsData = jobsRes?.data
        if (jobsData && Array.isArray(jobsData)) {
          const matchedJobs = jobsData.filter((job) => {
            // Server already filters by job_number, customer name, postcode, notes
            // But we also want to match tags and city client-side
            const matchesTags = job.tags?.some((tag: string) => 
              tag.toLowerCase().includes(searchLower)
            )
            const matchesCity = job.customer?.city?.toLowerCase().includes(searchLower)
            const matchesPostcode = job.customer?.postcode?.toLowerCase().includes(searchLower) ||
              job.installation_postcode?.toLowerCase().includes(searchLower)
            const matchesJobNumber = job.job_number?.toLowerCase().includes(searchLower)
            const matchesCustomerName = job.customer?.name?.toLowerCase().includes(searchLower)
            const matchesSiteAddress = job.site_address?.toLowerCase().includes(searchLower)
            
            return matchesJobNumber || matchesCustomerName || matchesTags || 
                   matchesCity || matchesPostcode || matchesSiteAddress
          })

          matchedJobs.slice(0, 8).forEach((job) => {
            const badges: string[] = []
            if (job.current_stage?.name) badges.push(job.current_stage.name)
            if (job.tags) {
              const matchingTags = job.tags.filter((t: string) => t.toLowerCase().includes(searchLower))
              badges.push(...matchingTags.slice(0, 2))
            }

            const subtitleParts: string[] = []
            if (job.customer?.name) subtitleParts.push(job.customer.name)
            if (job.customer?.city) subtitleParts.push(job.customer.city)
            if (job.customer?.postcode) subtitleParts.push(job.customer.postcode)
            
            searchResults.push({
              id: job.id,
              type: "job",
              title: job.job_number,
              subtitle: subtitleParts.join(" · "),
              badges,
              href: `/jobs/${job.id}`,
            })
          })
        }
        
        // Process customers
        if (Array.isArray(customersRes)) {
          customersRes.slice(0, 5).forEach((customer) => {
            const subtitleParts: string[] = []
            if (customer.email) subtitleParts.push(customer.email)
            if (customer.city) subtitleParts.push(customer.city)
            if (customer.postcode) subtitleParts.push(customer.postcode)

            searchResults.push({
              id: customer.id,
              type: "customer",
              title: customer.name || "Unnamed Customer",
              subtitle: subtitleParts.join(" · "),
              href: `/customers/${customer.id}`,
            })
          })
        }
        
        setResults(searchResults)
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.error("Search error:", error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    search()

    return () => controller.abort()
  }, [debouncedQuery])

  const iconMap: Record<string, React.ReactNode> = {
    job: <Briefcase className="h-4 w-4 text-cyan-400/70" />,
    customer: <Users className="h-4 w-4 text-teal-400/70" />,
    appointment: <Calendar className="h-4 w-4 text-blue-400/70" />,
    quote: <FileText className="h-4 w-4 text-violet-400/70" />,
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(result.href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center w-full h-8 rounded-md text-[0.8rem] font-mono tracking-wide cursor-pointer",
          "bg-white/[0.03] border border-white/[0.06]",
          "text-white/20",
          "hover:bg-white/[0.05] hover:border-cyan-500/20",
          "focus:outline-none focus:bg-white/[0.05] focus:border-cyan-500/20 focus:ring-1 focus:ring-cyan-500/10",
          "transition-all duration-300"
        )}
        data-search-input
      >
        <Search className="ml-3.5 h-4 w-4 text-white/40 shrink-0" />
        <span className="ml-2.5 flex-1 text-left">Search jobs, customers...</span>
        <kbd className="hidden sm:inline-flex items-center mr-2 px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-[0.65rem] font-mono text-white/30">
          /
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setResults([]) } }}>
        <CommandInput 
          placeholder="Search by job number, company, city, postcode, tags..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && <CommandLoading>Searching...</CommandLoading>}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
          )}
          {!isLoading && query.length < 2 && (
            <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
          )}
          {results.length > 0 && (
            <>
              {/* Group by type */}
              {["job", "customer", "appointment", "quote"].map((type) => {
                const typeResults = results.filter((r) => r.type === type)
                if (typeResults.length === 0) return null
                
                return (
                  <CommandGroup 
                    key={type} 
                    heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                  >
                    {typeResults.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={`${result.type}-${result.id}-${result.title}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        {iconMap[result.type]}
                        <div className="ml-2 flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        {result.badges && result.badges.length > 0 && (
                          <div className="flex gap-1 ml-2 shrink-0">
                            {result.badges.slice(0, 2).map((badge, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-mono bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
