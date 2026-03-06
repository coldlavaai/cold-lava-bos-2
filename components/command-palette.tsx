"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  Mail,
  Settings,
  FileText,
  BarChart2,
  Shield,
  Wrench,
  Plus,
  Building2,
  Star,
  Package,
} from "lucide-react"

interface CommandPaletteProps {
  onNewJob?: () => void
  onNewCustomer?: () => void
  onNewAppointment?: () => void
}

export function CommandPalette({ onNewJob, onNewCustomer, onNewAppointment }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {onNewJob && (
            <CommandItem onSelect={() => runCommand(onNewJob)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Job</span>
            </CommandItem>
          )}
          {onNewCustomer && (
            <CommandItem onSelect={() => runCommand(onNewCustomer)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Customer</span>
            </CommandItem>
          )}
          {onNewAppointment && (
            <CommandItem onSelect={() => runCommand(onNewAppointment)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Appointment</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/jobs"))}>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>Jobs</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/customers"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Customers</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/communications"))}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Communications</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/quotes"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Quotes</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Features">
          <CommandItem onSelect={() => runCommand(() => router.push("/analytics"))}>
            <BarChart2 className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
          {/* <CommandItem onSelect={() => runCommand(() => router.push("/compliance"))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Compliance</span>
          </CommandItem> */}
          <CommandItem onSelect={() => runCommand(() => router.push("/installations"))}>
            <Wrench className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          {/* <CommandItem onSelect={() => runCommand(() => router.push("/equipment"))}>
            <Package className="mr-2 h-4 w-4" />
            <span>Equipment</span>
          </CommandItem> */}
          <CommandItem onSelect={() => runCommand(() => router.push("/reviews"))}>
            <Star className="mr-2 h-4 w-4" />
            <span>Reviews</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>General Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings/users"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team Members</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings/integrations"))}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Integrations</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
