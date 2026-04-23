'use client'

import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/lib/roles'

export default function SettingsPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-[var(--color-navy)] mb-6">설정</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
        <h2 className="text-lg font-semibold mb-4">계정 정보</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-[var(--color-text-secondary)]">이름</span>
            <p className="font-medium">{user?.profile?.name || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-[var(--color-text-secondary)]">이메일</span>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <span className="text-sm text-[var(--color-text-secondary)]">역할</span>
            <p className="font-medium">
              <span className={`role-badge role-badge--${user?.role}`}>
                {ROLE_LABELS[user?.role || 'worker']}
              </span>
            </p>
          </div>
          <div>
            <span className="text-sm text-[var(--color-text-secondary)]">회사</span>
            <p className="font-medium">{user?.company || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-[var(--color-text-secondary)]">연락처</span>
            <p className="font-medium">{user?.profile?.phone || '-'}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut()}
        className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition"
      >
        로그아웃
      </button>
    </div>
  )
}
