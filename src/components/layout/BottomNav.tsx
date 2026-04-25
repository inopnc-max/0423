'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { House, CalendarDays, ClipboardList, Building2, FolderOpen, Settings } from 'lucide-react'
import { ROUTES, APP_NAV_ITEMS, isNavigationRouteActive, type NavigationItem } from '@/lib/routes'

interface BottomNavProps {
  items?: NavigationItem[]
  pathname?: string
}

const DEFAULT_NAV_ICONS: Record<string, LucideIcon> = {
  [ROUTES.home]: House,
  [ROUTES.output]: CalendarDays,
  [ROUTES.worklog]: ClipboardList,
  [ROUTES.site]: Building2,
  [ROUTES.documents]: FolderOpen,
  [ROUTES.settings]: Settings,
}

const DEFAULT_BOTTOM_NAV_ITEMS: NavigationItem[] = [
  { href: ROUTES.home, label: '홈', icon: House },
  { href: ROUTES.output, label: '출력', icon: CalendarDays },
  { href: ROUTES.worklog, label: '일지', icon: ClipboardList },
  { href: ROUTES.site, label: '현장', icon: Building2 },
  { href: ROUTES.documents, label: '문서함', icon: FolderOpen },
  { href: ROUTES.settings, label: '설정', icon: Settings },
]

export default function BottomNav({ items = DEFAULT_BOTTOM_NAV_ITEMS, pathname }: BottomNavProps) {
  const currentPathname = pathname ?? usePathname()

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
        {items.map(item => {
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
