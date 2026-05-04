'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getBottomNavItems, isNavigationRouteActive, type NavigationItem } from '@/lib/routes'
import { useBottomNavNotices } from '@/hooks/useBottomNavNotices'

interface BottomNavProps {
  items?: NavigationItem[]
  pathname?: string
}

export default function BottomNav({ items, pathname }: BottomNavProps) {
  const currentPathname = pathname ?? usePathname()
  const { user } = useAuth()
  const { totalUnread, loading: noticesLoading } = useBottomNavNotices()

  const navItems = items ?? getBottomNavItems(user?.role ?? 'worker')

  return (
    <nav
      className="ui-bottom-nav"
      aria-label="주요 탐색"
      style={{
        gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
      }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isNavigationRouteActive(currentPathname, href)
        const isNotifications = href === '/notifications'
        const showBadge = isNotifications && totalUnread > 0 && !noticesLoading

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            title={label}
            className={`ui-bottom-nav__item${active ? ' is-active' : ''}`}
          >
            <span className="ui-nav-icon relative">
              <Icon />
              {showBadge && (
                <span
                  className="ui-bottom-nav__notice-dot absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
                  aria-hidden="true"
                >
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </span>
            <span className="ui-bottom-nav__item-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
