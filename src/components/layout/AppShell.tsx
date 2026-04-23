'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cloud, CloudOff, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/contexts/notification-context'
import { useSync } from '@/contexts/sync-context'
import { isAdmin, isPartner } from '@/lib/roles'
import {
  ADMIN_ROUTES,
  APP_NAV_ITEMS,
  HEADER_ACTION_ITEMS,
  ROUTES,
  SECONDARY_APP_ACTIONS,
  getRouteLabel,
} from '@/lib/routes'

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const { isOnline, queueCount, syncing } = useSync()

  if (!user) return null

  const isPartnerUser = isPartner(user.role)
  const isAdminUser = isAdmin(user.role)
  const pageTitle = getRouteLabel(pathname)
  const bottomNavItems = isPartnerUser
    ? APP_NAV_ITEMS.filter(item => item.href !== ROUTES.worklog)
    : APP_NAV_ITEMS
  const SyncIcon = !isOnline ? CloudOff : syncing ? RefreshCw : Cloud
  const syncLabel = !isOnline
    ? '오프라인'
    : syncing
      ? '동기화 중'
      : queueCount > 0
        ? `대기 ${queueCount}`
        : '온라인'

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--color-navy)] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">INOPNC</div>
            <div className="truncate text-sm font-semibold">{pageTitle}</div>
          </div>

          <div className="flex items-center gap-1">
            <div className="mr-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/90">
              <SyncIcon
                className={`h-[15px] w-[15px] ${syncing ? 'animate-spin' : ''}`}
                strokeWidth={1.9}
              />
              <span>{syncLabel}</span>
            </div>

            {HEADER_ACTION_ITEMS.map(({ href, label, icon: Icon }) => {
              const isBell = href === ROUTES.notifications
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={label}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isActiveRoute(pathname, href) ? 'bg-white/16 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  {isBell && unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}

            {isAdminUser && (
              <Link
                href={ADMIN_ROUTES.dashboard}
                aria-label="관리자콘솔"
                title="관리자콘솔"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  pathname.startsWith(ROUTES.admin) ? 'bg-white/16 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </Link>
            )}

            <button
              type="button"
              onClick={() => signOut()}
              aria-label="로그아웃"
              title="로그아웃"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-screen px-0 pb-24 pt-14">{children}</main>

      {!isPartnerUser &&
        SECONDARY_APP_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--color-navy-hover)]"
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        ))}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div
          className="mx-auto grid h-16 max-w-3xl"
          style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}
        >
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const active = isActiveRoute(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-navy)]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
