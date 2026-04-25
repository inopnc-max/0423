'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Building2, ChevronRight, MapPinned, Search, X } from 'lucide-react'
import { useMenuSearch } from '@/hooks/useMenuSearch'
import { useSelectedSite } from '@/contexts/selected-site-context'
import { ROUTES } from '@/lib/routes'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'

export default function SitePage() {
  const {
    selectedSiteId,
    selectedSite,
    accessibleSites,
    loading,
    error,
    setSelectedSiteId,
  } = useSelectedSite()

  const { query, setQuery, filteredSites } = useMenuSearch({ scope: 'site_select' })

  const sortedSites = useMemo(
    () =>
      [...filteredSites].sort((a, b) => {
        if (a.id === selectedSiteId) return -1
        if (b.id === selectedSiteId) return 1
        return a.name.localeCompare(b.name, 'ko')
      }),
    [filteredSites, selectedSiteId]
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)]">현장</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          선택 현장 기준으로 기본정보와 접근 가능한 현장을 확인합니다.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {selectedSite ? (
        <section className="rounded-2xl bg-gradient-to-r from-[var(--color-accent-light)] to-white p-5 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-[var(--color-accent)]">현재 선택 현장</div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
              <Building2 className="h-[22px] w-[22px]" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--color-navy)]">{selectedSite.name}</span>
                <SiteStatusBadge status={selectedSite.status} />
              </div>
              {selectedSite.company && (
                <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  원청사: {selectedSite.company}
                </div>
              )}
              {selectedSite.affiliation && (
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  소속: {selectedSite.affiliation}
                </div>
              )}
              {selectedSite.address && (
                <div className="mt-1 flex items-start gap-1 text-sm text-[var(--color-text-secondary)]">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
                  <span className="line-clamp-2">{selectedSite.address}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          현장 목록에서 현장을 선택해주세요.
        </section>
      )}

      {accessibleSites.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-[var(--color-text-secondary)] shadow-sm">
          접근 가능한 현장이 없습니다.
        </div>
      ) : (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-white px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <input
                type="text"
                placeholder="현장명, 원청사, 소속 검색..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
                >
                  <X className="h-4 w-4" strokeWidth={1.9} />
                </button>
              )}
            </div>
          </div>
          <div className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
            현장 목록 ({sortedSites.length}개)
          </div>
          <div className="space-y-3">
            {sortedSites.map(site => (
              <button
                key={site.id}
                type="button"
                onClick={() => {
                  void setSelectedSiteId(site.id)
                }}
                className={`flex w-full items-start justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                  site.id === selectedSiteId
                    ? 'ring-2 ring-[var(--color-accent)]'
                    : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                      <Building2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-[var(--color-text)]">{site.name}</span>
                        {site.id === selectedSiteId && (
                          <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-white">
                            선택됨
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {site.company}
                        {site.affiliation ? ` · ${site.affiliation}` : ''}
                      </div>
                      {site.address && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                          <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
                          <span className="line-clamp-2">{site.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <SiteStatusBadge status={site.status} />
                  <Link
                    href={`${ROUTES.site}/${site.id}`}
                    onClick={e => e.stopPropagation()}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
                  >
                    상세
                  </Link>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
