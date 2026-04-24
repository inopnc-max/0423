'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import AppHeader, {
  type AppHeaderAction,
  type AppHeaderLeading,
} from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/contexts/notification-context'
import { isAdmin, isPartner } from '@/lib/roles'
import {
  ADMIN_ROUTES,
  APP_NAV_ITEMS,
  ROUTES,
  SECONDARY_APP_ACTIONS,
  getHeaderActionItems,
  getHeaderBehavior,
  getRouteLabel,
  isNavigationRouteActive,
  type HeaderActionId,
} from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import { loadUserUiState } from '@/lib/user-ui-state'

function getParentRoute(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) {
    return ROUTES.home
  }

  return `/${segments[0]}`
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const { user, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function resolveSiteId() {
      if (!user) return

      const urlSiteId =
        typeof window === 'undefined'
          ? null
          : new URLSearchParams(window.location.search).get('site')

      if (pathname.startsWith(`${ROUTES.site}/`)) {
        const id = pathname.slice(`${ROUTES.site}/`.length).split('/')[0] || null
        if (!ignore) setCurrentSiteId(id)
        return
      }

      if (pathname === ROUTES.worklog && urlSiteId) {
        if (!ignore) setCurrentSiteId(urlSiteId)
        return
      }

      if (
        pathname === ROUTES.home ||
        pathname === ROUTES.worklog ||
        pathname === ROUTES.confirmSheet
      ) {
        const uiState = await loadUserUiState(supabase, user.userId)
        if (!ignore) setCurrentSiteId(uiState?.last_site_id ?? null)
        return
      }

      if (!ignore) setCurrentSiteId(null)
    }

    void resolveSiteId()

    return () => {
      ignore = true
    }
  }, [pathname, supabase, user])

  if (!user) return null

  const shellMaxWidth = 'max-w-[960px]'
  const shellPadding = 'px-4 sm:px-6'
  const isPartnerUser = isPartner(user.role)
  const isAdminUser = isAdmin(user.role)
  const headerBehavior = getHeaderBehavior(pathname)

  const bottomNavItems = isPartnerUser
    ? APP_NAV_ITEMS.filter(item => item.href !== ROUTES.worklog)
    : APP_NAV_ITEMS
  const bottomNavHeight = 'calc(var(--bottom-nav-height) + var(--safe-bottom))'

  const handleBack = () => {
    const parent = getParentRoute(pathname)
    if (parent === pathname) {
      void router.push(ROUTES.home)
    } else {
      void router.push(parent)
    }
  }

  const leading: AppHeaderLeading =
    headerBehavior.leading === 'back'
      ? {
          kind: 'back',
          label: '뒤로 가기',
          title: '이전 화면으로 이동',
          onClick: handleBack,
        }
      : {
          kind: 'logo',
          src: '/images/logo_g.png',
          alt: 'INOPNC',
          href: ROUTES.home,
        }

  const actionHandlers: Partial<Record<HeaderActionId, () => void>> = {}

  const headerActions: AppHeaderAction[] = getHeaderActionItems({
    pathname,
    role: user.role,
  }).map(item => ({
    id: item.id,
    label: item.label,
    title: item.title ?? item.label,
    icon: item.icon,
    kind: item.kind,
    href: item.href,
    onSelect: item.kind === 'action' ? actionHandlers[item.id] : undefined,
    active:
      item.kind === 'link' && item.href
        ? isNavigationRouteActive(pathname, item.href)
        : false,
    badgeContent:
      item.badge === 'notifications' && unreadCount > 0
        ? unreadCount > 9
          ? '9+'
          : unreadCount
        : null,
    mobilePriority: item.mobilePriority,
  }))

  const utilityActions: AppHeaderAction[] = isAdminUser
    ? [
        {
          id: 'admin-dashboard',
          label: '관리자 콘솔',
          title: '관리자 콘솔',
          icon: ShieldCheck,
          kind: 'link',
          href: ADMIN_ROUTES.dashboard,
        },
        {
          id: 'logout',
          label: '로그아웃',
          title: '로그아웃',
          icon: LogOut,
          kind: 'action',
          onSelect: () => {
            void signOut()
          },
        },
      ]
    : [
        {
          id: 'logout',
          label: '로그아웃',
          title: '로그아웃',
          icon: LogOut,
          kind: 'action',
          onSelect: () => {
            void signOut()
          },
        },
      ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <AppHeader
        title={getRouteLabel(pathname)}
        leading={leading}
        actions={headerActions}
        utilityActions={utilityActions}
      />

      <main
        className="min-h-screen"
        style={{
          paddingBottom: `calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)`,
        }}
      >
        <div className={`mx-auto w-full ${shellMaxWidth} ${shellPadding}`}>
          {children}
        </div>
      </main>

      {!isPartnerUser &&
        SECONDARY_APP_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--color-navy-hover)]"
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        ))}

      <BottomNav items={bottomNavItems} pathname={pathname} />
    </div>
  )
}
