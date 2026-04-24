'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('last_sync_timestamp')
    if (stored) {
      setLastSync(new Date(parseInt(stored, 10)).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }))
    }
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-[var(--color-navy)] mb-6">설정</h1>

      {/* 계정 정보 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
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

      {/* 동기화 상태 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">데이터 동기화</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">마지막 동기화</span>
          <span className="font-medium text-[var(--color-text)]">
            {lastSync || '동기화 기록 없음'}
          </span>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">앱 정보</h2>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">앱 버전</span>
          <span className="font-medium text-[var(--color-text)]">1.0.0</span>
        </div>
      </div>

      {/* 로그아웃 */}
      <button
        onClick={() => signOut()}
        className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition"
      >
        로그아웃
      </button>
    </div>
  )
}
