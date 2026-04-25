'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getBottomNavItems, isNavigationRouteActive, type NavigationItem } from '@/lib/routes'

interface BottomNavProps {
  items?: NavigationItem[]
  pathname?: string
}

export default function BottomNav({ items, pathname }: BottomNavProps) {
  const currentPathname = pathname ?? usePathname()
  const { user } = useAuth()

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

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            title={label}
            className={`ui-bottom-nav__item${active ? ' is-active' : ''}`}
          >
            <span className="ui-nav-icon">
              <Icon />
            </span>
            <span className="ui-bottom-nav__item-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
