'use client'

import { useNotifications } from '@/contexts/notification-context'
import { useEffect } from 'react'
import Link from 'next/link'

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const typeColors: Record<string, string> = {
    rejection: 'bg-red-50 text-red-600',
    approval: 'bg-green-50 text-green-600',
    message: 'bg-blue-50 text-blue-600',
    site_update: 'bg-orange-50 text-orange-600',
    system: 'bg-gray-50 text-gray-600',
  }

  const typeLabels: Record<string, string> = {
    rejection: '반려',
    approval: '승인',
    message: '메시지',
    site_update: '현장',
    system: '시스템',
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--color-navy)]">알림</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            모두 읽음
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">
          <p>알림이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <Link
              key={notif.id}
              href={notif.href || '#'}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`block bg-white rounded-xl p-4 shadow-sm transition ${
                notif.is_read ? 'opacity-70' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  typeColors[notif.type] || 'bg-gray-50 text-gray-600'
                }`}>
                  {notif.type === 'rejection' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {notif.type === 'approval' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {notif.type === 'message' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  {(notif.type === 'site_update' || notif.type === 'system') && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{notif.title}</h3>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-[var(--color-accent)] rounded-full" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
