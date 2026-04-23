'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { ADMIN_NAV_ITEMS, ROUTES } from '@/lib/routes'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1">
      {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              active
                ? 'bg-white text-[var(--color-navy)] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto bg-[var(--color-navy)] p-5 text-white lg:block">
        <Link href={ROUTES.admin} className="mb-6 block">
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">INOPNC</div>
          <div className="mt-1 text-xl font-semibold">관리자콘솔</div>
        </Link>

        <AdminNavigation pathname={pathname} />

        <div className="mt-6 border-t border-white/10 pt-4">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <span>앱으로 돌아가기</span>
          </Link>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-[var(--color-navy)] px-4 text-white shadow-md lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(open => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
        >
          {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.9} /> : <Menu className="h-5 w-5" strokeWidth={1.9} />}
        </button>

        <Link href={ROUTES.admin} className="text-sm font-semibold">
          관리자콘솔
        </Link>

        <Link
          href={ROUTES.home}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="홈으로 이동"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.9} />
        </Link>
      </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[var(--color-navy)] p-5 text-white shadow-xl lg:hidden">
            <div className="mb-6">
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">INOPNC</div>
              <div className="mt-1 text-xl font-semibold">관리자콘솔</div>
            </div>
            <AdminNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <main className="px-4 pb-6 pt-16 lg:ml-72 lg:px-6 lg:pt-6">{children}</main>
    </div>
  )
}
