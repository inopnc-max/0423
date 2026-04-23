'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'

interface Site {
  id: string
  name: string
  company: string
  affiliation: string
  address: string
  manager: string
  status: string
  allowed_companies: string[]
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchSites() {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, company, affiliation, address, manager, status, allowed_companies')
          .order('name')

        if (!error && data) {
          setSites(data)
        }
      } catch (err) {
        console.error('Failed to fetch sites:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSites()
  }, [supabase])

  const filteredSites = sites.filter(s =>
    search === '' ||
    s.name.includes(search) ||
    s.company.includes(search) ||
    s.address.includes(search)
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">현장 관리</h1>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="현장명, 회사, 주소 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">현장이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredSites.map(site => (
            <div key={site.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[var(--color-text)]">{site.name}</h3>
                <SiteStatusBadge status={site.status} />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">{site.company}</p>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-2">{site.address || '주소 없음'}</p>
              <div className="text-xs text-[var(--color-text-tertiary)]">
                <span>담당: {site.manager || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
