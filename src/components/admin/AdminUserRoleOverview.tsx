import Link from 'next/link'
import { ROLE_LABELS, type Role } from '@/lib/roles'
import { ADMIN_ROUTES } from '@/lib/routes'
import type { AdminRoleCount } from '@/lib/admin/adminDashboardRecords'

const ROLE_TONES: Record<string, string> = {
  worker: 'bg-blue-50 text-blue-700',
  partner: 'bg-green-50 text-green-700',
  site_manager: 'bg-amber-50 text-amber-700',
  production_manager: 'bg-violet-50 text-violet-700',
  admin: 'bg-fuchsia-50 text-fuchsia-700',
}

function getRoleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role
}

export function AdminUserRoleOverview({
  roles,
}: {
  roles: AdminRoleCount[]
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">역할 가시성</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            계정 역할 분포와 관리자 접근 범위를 점검합니다.
          </p>
        </div>
        <Link href={ADMIN_ROUTES.users} className="text-sm font-semibold text-[var(--color-accent)]">
          사용자 관리
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            역할 데이터가 없습니다.
          </div>
        ) : (
          roles.map(({ role, count }) => (
            <div key={role} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_TONES[role] ?? 'bg-gray-100 text-gray-700'}`}>
                {getRoleLabel(role)}
              </span>
              <span className="text-sm font-bold text-[var(--color-text)]">{count}명</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
