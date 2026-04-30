'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/lib/roles'
import type { Role } from '@/lib/roles'
import { useAuth } from '@/contexts/auth-context'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { useSiteManagerDashboard } from '@/hooks/site-manager/useSiteManagerDashboard'
import { WorkerList, WorkerStatusSummary } from '@/components/site-manager/SiteManagerWorkerPanel'

interface Worker {
  id: string
  email: string
  name: string
  role: string
  company: string
  phone: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const { selectedSiteId } = useSelectedSite()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const isSiteManagerUser = user?.role === 'site_manager'
  const siteManagerDashboard = useSiteManagerDashboard({
    managerId: isSiteManagerUser ? user?.userId : null,
    managerName: user?.profile?.name,
    siteId: isSiteManagerUser ? selectedSiteId : null,
    workDate: today,
  })

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('id, email, name, role, company, phone, created_at')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setWorkers(data)
        }
      } catch (err) {
        console.error('Failed to fetch workers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkers()
  }, [supabase])

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = search === '' ||
      w.name.includes(search) ||
      w.email.includes(search) ||
      w.company.includes(search)
    const matchesRole = roleFilter === 'all' || w.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roleColors: Record<string, string> = {
    worker: 'bg-blue-100 text-blue-700',
    partner: 'bg-green-100 text-green-700',
    site_manager: 'bg-yellow-100 text-yellow-700',
    admin: 'bg-purple-100 text-purple-700',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">사용자 관리</h1>

      {isSiteManagerUser && (
        <>
          <WorkerStatusSummary
            workers={siteManagerDashboard.workers}
            loading={siteManagerDashboard.loading}
          />
          <div className="mb-6">
            <WorkerList
              workers={siteManagerDashboard.workers}
              loading={siteManagerDashboard.loading}
            />
          </div>
        </>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="이름, 이메일, 회사 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="all">전체 역할</option>
          <option value="worker">작업자</option>
          <option value="partner">파트너</option>
          <option value="site_manager">현장관리자</option>
          <option value="admin">관리자</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">로딩 중...</td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">사용자가 없습니다.</td>
                </tr>
              ) : (
                filteredWorkers.map(worker => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{worker.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{worker.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[worker.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[worker.role as Role] || worker.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{worker.company || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{worker.phone || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
