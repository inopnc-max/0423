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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{
        paddingBottom: 'var(--safe-bottom, 0px)',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      <div
        className="flex h-[var(--bottom-nav-height,64px)] items-center"
        style={{ height: 'var(--bottom-nav-height, 64px)' }}
      >
        {navItems.map(item => {
          const isActive = isNavigationRouteActive(currentPathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            >
              <Icon
                className={`h-[22px] w-[22px] transition-colors ${
                  isActive
                    ? 'text-[var(--color-navy)]'
                    : 'text-[var(--color-text-tertiary)]'
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--color-navy)]'
                    : 'text-[var(--color-text-tertiary)]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
