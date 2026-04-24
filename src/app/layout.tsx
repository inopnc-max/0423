import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { NotificationProvider } from '@/contexts/notification-context'
import { SyncProvider } from '@/contexts/sync-context'

export const metadata: Metadata = {
  title: 'INOPNC',
  description: 'INOPNC 통합앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <SyncProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
