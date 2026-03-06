"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronsUpDown,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Loader2,
  User,
} from "lucide-react"
import { useCustomers, useSendCustomerMessage } from "@/lib/api/hooks"
import type { Customer } from "@/lib/api/types"
import type { IntegrationStatus } from "@/lib/api/hooks"
import { toast } from "sonner"

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integrationStatus?: IntegrationStatus
  onSuccess?: (customerId: string) => void
}

type Channel = "sms" | "email" | "whatsapp"

export function NewMessageDialog({
  open,
  onOpenChange,
  integrationStatus,
  onSuccess,
}: NewMessageDialogProps) {
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [customerPopoverOpen, setCustomerPopoverOpen] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [channel, setChannel] = React.useState<Channel>("sms")
  const [message, setMessage] = React.useState("")
  const [subject, setSubject] = React.useState("")

  // Fetch customers for dropdown
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    search: customerSearch || undefined,
    limit: 20,
  })

  const sendMessageMutation = useSendCustomerMessage()

  const customers = customersData?.data || []

  // Determine available channels based on integration status
  const smsConfigured = integrationStatus?.sms?.configured ?? false
  const emailConfigured = integrationStatus?.email?.configured ?? false
  const whatsappConfigured = integrationStatus?.whatsapp?.configured ?? false

  // Auto-select first available channel
  React.useEffect(() => {
    if (open) {
      if (smsConfigured) {
        setChannel("sms")
      } else if (whatsappConfigured) {
        setChannel("whatsapp")
      } else if (emailConfigured) {
        setChannel("email")
      }
    }
  }, [open, smsConfigured, emailConfigured, whatsappConfigured])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedCustomer(null)
      setMessage("")
      setSubject("")
      setCustomerSearch("")
    }
  }, [open])

  // Check if selected customer has the contact info for selected channel
  const customerHasPhone = !!selectedCustomer?.phone
  const customerHasEmail = !!selectedCustomer?.email

  const canSend = React.useMemo(() => {
    if (!selectedCustomer || !message.trim()) return false
    if (channel === "sms" && (!customerHasPhone || !smsConfigured)) return false
    if (channel === "email" && (!customerHasEmail || !emailConfigured)) return false
    if (channel === "whatsapp" && (!customerHasPhone || !whatsappConfigured)) return false
    return true
  }, [selectedCustomer, message, channel, customerHasPhone, customerHasEmail, smsConfigured, emailConfigured, whatsappConfigured])

  const handleSend = () => {
    if (!canSend || !selectedCustomer) return

    sendMessageMutation.mutate(
      {
        customerId: selectedCustomer.id,
        channel,
        body: message.trim(),
        subject: channel === "email" ? subject.trim() || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Message sent to ${selectedCustomer.name}`)
          onOpenChange(false)
          onSuccess?.(selectedCustomer.id)
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to send message"
          )
        },
      }
    )
  }

  const formatCustomerDisplay = (customer: Customer) => {
    const parts = [customer.name]
    if (customer.phone) parts.push(customer.phone)
    if (customer.email) parts.push(customer.email)
    return parts.join(" • ")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send a message to a customer via SMS, WhatsApp, or Email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer selector */}
          <div className="space-y-2">
            <Label>To</Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerPopoverOpen}
                  className="w-full justify-between font-normal"
                  data-testid="customer-select-trigger"
                >
                  {selectedCustomer ? (
                    <span className="truncate">{formatCustomerDisplay(selectedCustomer)}</span>
                  ) : (
                    <span className="text-muted-foreground">Select a customer...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search customers..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    {customersLoading && (
                      <CommandLoading>Loading customers...</CommandLoading>
                    )}
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.id}
                          onSelect={() => {
                            setSelectedCustomer(customer)
                            setCustomerPopoverOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedCustomer?.id === customer.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{customer.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                              )}
                              {customer.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Channel selector */}
          <div className="space-y-2">
            <Label>Channel</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant={channel === "sms" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setChannel("sms")}
                disabled={!smsConfigured}
                data-testid="channel-sms"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                SMS
              </Button>
              <Button
                type="button"
                variant={channel === "whatsapp" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setChannel("whatsapp")}
                disabled={!whatsappConfigured}
                data-testid="channel-whatsapp"
              >
                <Phone className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setChannel("email")}
                disabled={!emailConfigured}
                data-testid="channel-email"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>

              {!smsConfigured && !emailConfigured && !whatsappConfigured && (
                <span className="text-xs text-amber-600 ml-2">
                  Configure channels in Settings
                </span>
              )}
            </div>

            {/* Warning if customer missing contact info for selected channel */}
            {selectedCustomer && (channel === "sms" || channel === "whatsapp") && !customerHasPhone && (
              <p className="text-xs text-amber-600">
                This customer doesn&apos;t have a phone number
              </p>
            )}
            {selectedCustomer && channel === "email" && !customerHasEmail && (
              <p className="text-xs text-amber-600">
                This customer doesn&apos;t have an email address
              </p>
            )}
          </div>

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder={
                channel === "email"
                  ? "Type your email message..."
                  : channel === "whatsapp"
                  ? "Type your WhatsApp message..."
                  : "Type your SMS message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              data-testid="message-textarea"
            />
            {(channel === "sms" || channel === "whatsapp") && (
              <div className="text-[10px] text-muted-foreground">
                {message.length} chars
                {channel === "sms" && message.length > 160 && (
                  <span className="text-amber-600 ml-1">
                    ({Math.ceil(message.length / 160)} segments)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || sendMessageMutation.isPending}
            className="gap-1.5"
            data-testid="send-message-button"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
