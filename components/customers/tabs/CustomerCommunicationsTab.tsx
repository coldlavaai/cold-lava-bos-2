'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Mail,
  MessageSquare,
  Phone,
  ExternalLink,
  Check,
  CheckCheck,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useCustomerConversation } from '@/lib/api/hooks'
import { UnifiedCommunicationItem } from '@/lib/api/types'

interface CustomerCommunicationsTabProps {
  customerId: string
}

export function CustomerCommunicationsTab({ customerId }: CustomerCommunicationsTabProps) {
  const router = useRouter()
  const supabase = createClient()
  const realtimeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filter, setFilter] = useState<'all' | 'sms' | 'email' | 'call'>('all')

  // Fetch conversation data via the existing API hook
  const {
    data: conversationData,
    isLoading,
    refetch,
  } = useCustomerConversation(customerId, { limit: 100 })

  // Supabase Realtime subscriptions for instant updates
  useEffect(() => {
    if (!customerId) return

    const channel = supabase
      .channel(`customer-comms-tab:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Debounce refresh
          if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current)
          realtimeRefreshTimer.current = setTimeout(() => refetch(), 200)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current)
          realtimeRefreshTimer.current = setTimeout(() => refetch(), 200)
        }
      )
      .subscribe()

    return () => {
      if (realtimeRefreshTimer.current) {
        clearTimeout(realtimeRefreshTimer.current)
        realtimeRefreshTimer.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [supabase, customerId, refetch])

  const items = useMemo(() => conversationData?.items || [], [conversationData?.items])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(item => item.type === filter)
  }, [items, filter])

  const smsCt = items.filter(i => i.type === 'sms').length
  const emailCt = items.filter(i => i.type === 'email').length
  const callCt = items.filter(i => i.type === 'call').length
  const totalCt = items.length

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading communications...</div>
  }

  if (totalCt === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">No communications yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Send an email or SMS to start a conversation
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push(`/communications?customer=${customerId}`)}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Open Communications
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and link */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({totalCt})
          </Button>
          {smsCt > 0 && (
            <Button
              size="sm"
              variant={filter === 'sms' ? 'default' : 'outline'}
              onClick={() => setFilter('sms')}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              SMS ({smsCt})
            </Button>
          )}
          {emailCt > 0 && (
            <Button
              size="sm"
              variant={filter === 'email' ? 'default' : 'outline'}
              onClick={() => setFilter('email')}
            >
              <Mail className="h-4 w-4 mr-1" />
              Email ({emailCt})
            </Button>
          )}
          {callCt > 0 && (
            <Button
              size="sm"
              variant={filter === 'call' ? 'default' : 'outline'}
              onClick={() => setFilter('call')}
            >
              <Phone className="h-4 w-4 mr-1" />
              Calls ({callCt})
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/communications?customer=${customerId}`)}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View in Communications
        </Button>
      </div>

      {/* Messages list */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <CommunicationItem
            key={item.id}
            item={item}
            onClick={() => router.push(`/communications?customer=${customerId}`)}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No {filter} messages found
          </div>
        )}
      </div>
    </div>
  )
}

function CommunicationItem({
  item,
  onClick,
}: {
  item: UnifiedCommunicationItem
  onClick: () => void
}) {
  const isOutbound = item.direction === 'outbound'

  const getChannelIcon = () => {
    switch (item.type) {
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'email':
        return <Mail className="h-4 w-4 text-purple-500" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'call':
        return <Phone className="h-4 w-4 text-teal-500" />
    }
  }

  const getStatusIcon = () => {
    if (!isOutbound || !item.status) return null
    switch (item.status) {
      case 'queued':
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-green-600" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  const formatTimestamp = (ts: string) => {
    try {
      return format(new Date(ts), 'MMM d, yyyy h:mm a')
    } catch {
      return ts
    }
  }

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">{getChannelIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {isOutbound ? 'You' : 'Customer'}
              </span>
              {isOutbound ? (
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />
              )}
              <Badge
                variant={isOutbound ? 'default' : 'secondary'}
                className="text-[10px] py-0 px-1.5"
              >
                {isOutbound ? 'Sent' : 'Received'}
              </Badge>
              {item.type !== 'call' && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {item.type.toUpperCase()}
                </Badge>
              )}
            </div>

            {item.subject && (
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {item.subject}
              </p>
            )}

            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.body}
            </p>

            {item.call_recording && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(item.call_recording.duration_seconds / 60)}m{' '}
                  {item.call_recording.duration_seconds % 60}s
                </span>
                <span>via {item.call_recording.provider}</span>
                {item.call_recording.has_transcript && (
                  <Badge variant="outline" className="text-[10px]">
                    Transcript
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          {getStatusIcon()}
          <span>{formatTimestamp(item.timestamp)}</span>
        </div>
      </div>
    </Card>
  )
}
