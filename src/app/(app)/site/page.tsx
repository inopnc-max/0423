'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronRight, MapPinned } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/routes'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { PageLoading } from '@/components/common/PageLoading'

interface Site {
  id: string
  name: string
  company: string
  affiliation: string
  address: string
  manager: string
  status: string
}

export default function SitePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchSites() {
      try {
        const { data } = await supabase
          .from('sites')
          .select('id, name, company, affiliation, address, manager, status')
          .order('name')
          .limit(100)

        if (data) setSites(data)
      } catch (error) {
        console.error('Failed to load sites:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchSites()
  }, [supabase, user])

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">현장</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          접근 가능한 현장을 확인하고 상세 화면으로 이동할 수 있습니다.
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
          접근 가능한 현장이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map(site => (
            <Link
              key={site.id}
              href={`${ROUTES.site}/${site.id}`}
              className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    <Building2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--color-text)]">{site.name}</div>
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {site.company}
                      {site.affiliation ? ` · ${site.affiliation}` : ''}
                    </div>
                    {site.address && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                        <MapPinned className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.9} />
                        <span className="line-clamp-2">{site.address}</span>
                      </div>
                    )}
                    {site.manager && (
                      <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">현장 소장: {site.manager}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SiteStatusBadge status={site.status} />
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
