'use client'

import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/lib/roles'
import { useSyncQueueStatus } from '@/hooks/useSyncQueueStatus'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { summary, loading, refresh } = useSyncQueueStatus({ intervalMs: 30000 })

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

      {/* Sync Status */}
      <section className="rounded-2xl bg-white p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">동기화 상태</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              오프라인 저장 또는 서버 저장 실패로 대기 중인 항목을 표시합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border px-3 py-1 text-xs font-semibold shrink-0"
          >
            새로고침
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          {loading
            ? '동기화 상태를 확인하는 중입니다.'
            : summary.totalOpenCount > 0
              ? `동기화 대기 ${summary.totalOpenCount}건${summary.failedCount > 0 ? ` · 실패 ${summary.failedCount}건 포함` : ''}`
              : '동기화 대기 항목 없음'}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
            <span className="text-[var(--color-text-secondary)]">대기</span>
            <span className="font-semibold text-amber-600">{summary.pendingCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
            <span className="text-[var(--color-text-secondary)]">실패</span>
            <span className="font-semibold text-red-600">{summary.failedCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="text-[var(--color-text-secondary)]">동기화 중</span>
            <span className="font-semibold text-blue-600">{summary.syncingCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
            <span className="text-[var(--color-text-secondary)]">완료 기록</span>
            <span className="font-semibold text-green-600">{summary.doneCount}</span>
          </div>
        </div>
      </section>

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
