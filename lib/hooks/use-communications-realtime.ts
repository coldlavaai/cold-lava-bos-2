'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Supabase Realtime subscription for communications.
 * Listens for INSERT/UPDATE/DELETE on messages and message_threads tables,
 * then invalidates the relevant react-query caches for instant UI updates.
 * 
 * Based on CL-BOS-DEC25 pattern: debounced refresh on any change.
 */
export function useCommunicationsRealtime(tenantId?: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      // Invalidate all communications queries
      queryClient.invalidateQueries({ queryKey: ['communications'] })
      queryClient.invalidateQueries({ queryKey: ['call-recordings'] })
    }, 100) // 100ms debounce - fast updates for snappy UX
  }, [queryClient])

  useEffect(() => {
    // We subscribe without tenant filter since Supabase Realtime + RLS
    // will handle filtering. The filter param is just for optimization.
    const channelName = tenantId
      ? `comms-realtime:${tenantId}`
      : 'comms-realtime:global'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          console.log('[Realtime] Message change:', payload.eventType)
          triggerRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          console.log('[Realtime] Thread change:', payload.eventType)
          triggerRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_recordings',
          ...(tenantId ? { filter: `tenant_id=eq.${tenantId}` } : {}),
        },
        (payload) => {
          console.log('[Realtime] Call recording change:', payload.eventType)
          triggerRefresh()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Communications subscription status:', status)
      })

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [supabase, tenantId, triggerRefresh])
}

/**
 * Realtime subscription for a specific customer's conversation.
 * More targeted — only listens for messages in threads belonging to the customer.
 */
export function useConversationRealtime(customerId: string | null, threadIds: string[]) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: ['communications', 'customers', customerId],
        })
      }
      // Also refresh the customer list (for unread counts, previews)
      queryClient.invalidateQueries({
        queryKey: ['communications', 'customers'],
        exact: false,
      })
    }, 200) // Faster debounce for conversation view
  }, [queryClient, customerId])

  useEffect(() => {
    if (!customerId || threadIds.length === 0) return

    // Subscribe to messages in these specific threads
    // Note: Supabase Realtime filter only supports a single eq filter per subscription,
    // so for multiple threads we subscribe without filter and check client-side
    const channel = supabase
      .channel(`conversation:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Check if this message belongs to one of our threads
          const threadId = (payload.new as Record<string, unknown>)?.thread_id ||
                           (payload.old as Record<string, unknown>)?.thread_id
          if (threadId && threadIds.includes(threadId as string)) {
            console.log('[Realtime] Conversation message change:', payload.eventType)
            triggerRefresh()
          }
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
        (payload) => {
          console.log('[Realtime] Customer thread change:', payload.eventType)
          triggerRefresh()
        }
      )
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [supabase, customerId, threadIds, triggerRefresh])
}
