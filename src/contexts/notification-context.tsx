'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Toaster, toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

interface Notification {
  id: string
  type: 'rejection' | 'approval' | 'message' | 'site_update' | 'system'
  title: string
  body: string | null
  href: string | null
  is_read: boolean
  created_at: string
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(item => !item.is_read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [supabase, user])

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
        setNotifications(previous =>
          previous.map(notification =>
            notification.id === id ? { ...notification, is_read: true } : notification
          )
        )
        setUnreadCount(previous => Math.max(0, previous - 1))
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    },
    [supabase]
  )

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.userId)
        .eq('is_read', false)

      setNotifications(previous => previous.map(notification => ({ ...notification, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) return

    void fetchNotifications()

    const channel = supabase
      .channel(`notifications:${user.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.userId}`,
        },
        payload => {
          const newNotification = payload.new as Notification

          setNotifications(previous => [newNotification, ...previous])
          if (!newNotification.is_read) {
            setUnreadCount(previous => previous + 1)
          }

          toast(newNotification.title, {
            description: newNotification.body || undefined,
            action: newNotification.href
              ? {
                  label: '열기',
                  onClick: () => {
                    window.location.href = newNotification.href as string
                  },
                }
              : undefined,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase, user])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refresh: fetchNotifications,
    }),
    [fetchNotifications, markAllAsRead, markAsRead, notifications, unreadCount]
  )

  return (
    <NotificationContext.Provider value={value}>
      <Toaster
        position="top-center"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          },
        }}
      />
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
