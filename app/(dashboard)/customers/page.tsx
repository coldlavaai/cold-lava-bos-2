"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MetricCard } from "@/components/ui/metric-card"
import {
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Users,
  UserCheck,
} from "lucide-react"
import { useCustomers } from "@/lib/api/hooks"
import type { Customer } from "@/lib/api/types"
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog"

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false)
  const limit = 999 // Load all records — no pagination

  const { data: customersResponse, isLoading, error } = useCustomers({ search: searchQuery, page: 1, limit })

  const customers = customersResponse?.data || []
  const totalCount = customersResponse?.meta?.pagination?.total || customers.length

  return (
    
      <div className="space-y-4">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-2 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-xl font-display font-bold gradient-text-solar">
              Customers
            </h1>
            <Badge variant="outline" className="text-xs">
              {totalCount}
            </Badge>
            <div className="flex-1" />
            <Button 
              className="gap-1.5 h-9 md:h-8 shrink-0" 
              onClick={() => setCustomerDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Customer</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 h-9 md:h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 md:h-8 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>

        <CustomerFormDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} />

        {/* Stats with MetricCard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Total Customers"
            value={customers.length}
            icon={<Users className="h-4 w-4" />}
            variant="default"
            loading={isLoading}
          />
          <MetricCard
            title="With Contact"
            value={customers.filter((c) => c.email || c.phone).length}
            icon={<UserCheck className="h-4 w-4" />}
            variant="primary"
            loading={isLoading}
          />
          <MetricCard
            title="With Address"
            value={customers.filter((c) => c.postcode).length}
            icon={<MapPin className="h-4 w-4" />}
            variant="secondary"
            loading={isLoading}
          />
          <MetricCard
            title="Recent (7d)"
            value={customers.filter((c) => {
              const created = new Date(c.created_at)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return created > weekAgo
            }).length}
            icon={<Plus className="h-4 w-4" />}
            variant="success"
            loading={isLoading}
          />
        </div>

        {/* Customer List */}
        <Card>
          {isLoading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-12 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : customers.length > 0 ? (
            <>
              {/* Mobile: Card layout */}
              <div className="md:hidden divide-y divide-border">
                {customers.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
              {/* Desktop: Table layout */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-xs">Customer</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Contact</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Location</th>
                    <th className="text-left px-3 py-2 font-medium text-xs">Created</th>
                    <th className="text-right px-3 py-2 font-medium text-xs"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No customers found{searchQuery && ` matching "${searchQuery}"`}
            </div>
          )}
        </Card>

        {/* Pagination removed — show all results */}
      </div>
    
  )
}

function CustomerCard({ customer }: { customer: Customer }) {
  const router = useRouter()

  const getInitials = () => {
    return customer.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  return (
    <div
      className="flex items-center gap-3 p-3 active:bg-muted/30 transition-colors cursor-pointer touch-manipulation"
      onClick={() => router.push(`/customers/${customer.id}`)}
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs shrink-0">
        {getInitials()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{customer.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {customer.phone && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 shrink-0" />
              {customer.phone}
            </span>
          )}
          {customer.postcode && (
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="h-3 w-3" />
              {customer.postcode}
            </span>
          )}
        </div>
        {customer.email && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {customer.email}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground">{formatDate(customer.created_at)}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

function CustomerRow({ customer }: { customer: Customer }) {
  const router = useRouter()

  const getInitials = () => {
    return customer.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  const getLocation = () => {
    if (customer.postcode) return customer.postcode
    if (customer.city) return customer.city
    return "No location"
  }

  return (
    <tr
      data-testid="customer-row-link"
      data-customer-id={customer.id}
      className="hover:bg-muted/30 transition-colors group cursor-pointer"
      onClick={() => router.push(`/customers/${customer.id}`)}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
            {getInitials()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
              {customer.name}
            </div>
            <div className="text-xs text-muted-foreground">#{customer.id.substring(0, 6)}</div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 text-xs">
        {customer.email ? (
          <div className="flex items-center gap-1 text-muted-foreground truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No email</div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" />
            {customer.phone}
          </div>
        )}
      </td>

      <td className="px-3 py-2.5 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {getLocation()}
        </div>
      </td>

      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {formatDate(customer.created_at)}
      </td>

      <td className="px-3 py-2.5 text-right">
        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
