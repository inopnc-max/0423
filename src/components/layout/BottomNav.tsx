'use client'

import Link from 'next/link'
import { isNavigationRouteActive, type NavigationItem } from '@/lib/routes'

interface BottomNavProps {
  items: NavigationItem[]
  pathname: string
  containerClassName?: string
}

export default function BottomNav({
  items,
  pathname,
  containerClassName = '',
}: BottomNavProps) {
  return (
    <nav
      className="ui-bottom-nav"
      aria-label="주요 탐색"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isNavigationRouteActive(pathname, href)

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
