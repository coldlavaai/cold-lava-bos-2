import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/api/hooks'

/**
 * Real-time communications hook
 * Subscribes to messages and message_threads changes via Supabase Realtime
 * Automatically invalidates React Query cache to show new messages instantly
 */
export function useRealtimeCommunications() {
  const queryClient = useQueryClient()
  const { data: tenant } = useTenant()
  const tenantId = tenant?.id
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()

    // Debounced invalidation to prevent excessive refetches
    const invalidateQueries = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['communications'] })
      }, 300) // 300ms debounce
    }

    // Subscribe to messages table changes
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[Realtime] Message change:', payload.eventType, payload.new)
          invalidateQueries()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Messages channel status:', status)
      })

    // Subscribe to message_threads table changes
    const threadsChannel = supabase
      .channel('threads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('[Realtime] Thread change:', payload.eventType, payload.new)
          invalidateQueries()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Threads channel status:', status)
      })

    // Cleanup subscriptions on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(threadsChannel)
      console.log('[Realtime] Unsubscribed from communications channels')
    }
  }, [tenantId, queryClient])
}
