"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCustomers } from "@/lib/api/hooks"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"

interface ComposeModalProps {
  open: boolean
  onClose: () => void
  onSent?: (threadId: string) => void
}

export function ComposeModal({ open, onClose, onSent }: ComposeModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("")
  const [channel, setChannel] = React.useState<"email" | "sms">("email")
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [customerSearch, setCustomerSearch] = React.useState("")

  const { data: customers, isLoading: customersLoading } = useCustomers({
    search: customerSearch,
    limit: 50,
  })

  const queryClient = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: async (data: {
      customer_id: string
      channel: "email" | "sms"
      recipient: string
      body: string
      subject?: string
    }) => {
      // API returns { data: message } which matches ApiResponse<message>
      const response = await api.post<{ id: string; thread_id: string }>(
        "/messages/send",
        data
      )
      // response.data is the message object
      return response.data
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] })
      toast.success("Message sent successfully")
      if (message?.thread_id) {
        onSent?.(message.thread_id)
      }
      handleClose()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      )
    },
  })

  const handleClose = () => {
    setSelectedCustomerId("")
    setChannel("email")
    setSubject("")
    setBody("")
    setCustomerSearch("")
    onClose()
  }

  const handleSend = () => {
    if (!selectedCustomerId || !body.trim()) {
      toast.error("Please select a customer and enter a message")
      return
    }

    const selectedCustomer = customers?.data?.find((c) => c.id === selectedCustomerId)
    if (!selectedCustomer) {
      toast.error("Selected customer not found")
      return
    }

    // Get recipient based on channel
    const recipient =
      channel === "email" ? selectedCustomer.email : selectedCustomer.phone

    if (!recipient) {
      toast.error(
        `Customer does not have ${channel === "email" ? "an email address" : "a phone number"}`
      )
      return
    }

    sendMutation.mutate({
      customer_id: selectedCustomerId,
      channel,
      recipient,
      body,
      ...(channel === "email" && subject ? { subject } : {}),
    })
  }

  const selectedCustomer = customers?.data?.find((c) => c.id === selectedCustomerId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="compose-modal">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send a new email or SMS message to a customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <div className="space-y-2">
              <Input
                id="customer-search"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Loading customers...
                    </div>
                  ) : customers?.data && customers.data.length > 0 ? (
                    customers.data.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.email && ` (${customer.email})`}
                        {customer.phone && ` (${customer.phone})`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No customers found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <Label htmlFor="channel">Channel *</Label>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as "email" | "sms")}
            >
              <SelectTrigger id="channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <p className="text-xs text-muted-foreground">
                {channel === "email"
                  ? selectedCustomer.email
                    ? `Will send to: ${selectedCustomer.email}`
                    : "⚠️ Customer has no email address"
                  : selectedCustomer.phone
                    ? `Will send to: ${selectedCustomer.phone}`
                    : "⚠️ Customer has no phone number"}
              </p>
            )}
          </div>

          {/* Subject (Email only) */}
          {channel === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              placeholder="Type your message..."
              className="min-h-[150px] resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {channel === "sms" && (
              <p className="text-xs text-muted-foreground">
                {body.length} characters
                {body.length > 160 && ` (~${Math.ceil(body.length / 160)} segments)`}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              !selectedCustomerId ||
              !body.trim() ||
              sendMutation.isPending ||
              (channel === "email" && !selectedCustomer?.email) ||
              (channel === "sms" && !selectedCustomer?.phone)
            }
            data-testid="compose-send-button"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
