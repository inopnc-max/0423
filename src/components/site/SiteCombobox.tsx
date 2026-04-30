'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, ChevronDown, MapPin, Search, X } from 'lucide-react'
import { useMenuSearch } from '@/hooks/useMenuSearch'
import { getSelectedSiteId } from '@/lib/ui-state'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import type { SiteSummary } from '@/contexts/selected-site-context'

interface SiteComboboxProps {
  sites: SiteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  label?: string
  placeholder?: string
  className?: string
}

function getSelectionReason(selectedId: string | null): string {
  if (!selectedId) return '배정 현장'
  if (typeof window !== 'undefined') {
    const urlSiteId = new URLSearchParams(window.location.search).get('site')
    if (urlSiteId === selectedId) return 'URL 선택'
  }
  if (getSelectedSiteId() === selectedId) return '최근 선택'
  return '배정 현장'
}

export function SiteCombobox({
  sites,
  selectedId,
  onSelect,
  label = '현장 선택',
  placeholder = '현장명, 원청사, 소속, 주소 검색',
  className = '',
}: SiteComboboxProps) {
  const { query, setQuery, filteredSites } = useMenuSearch({ scope: 'site_select' })
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => sites.find(site => site.id === selectedId) ?? null,
    [sites, selectedId]
  )
  const selectionReason = useMemo(() => getSelectionReason(selectedId), [selectedId])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open, setQuery])

  if (sites.length === 0) {
    return (
      <div className={`rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white p-4 text-center text-sm text-[var(--color-text-secondary)] ${className}`}>
        접근 가능한 현장이 없습니다.
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[var(--color-navy)]">{label}</span>
          {selected && (
            <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)]">
              {selectionReason}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-[var(--color-border)] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <Building2 className="h-5 w-5 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-[var(--color-text)]">{selected.name}</span>
              <SiteStatusBadge status={selected.status} />
            </span>
            <span className="mt-0.5 block truncate text-sm text-[var(--color-text-secondary)]">
              {[selected.company, selected.affiliation].filter(Boolean).join(' · ')}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-[var(--color-text-tertiary)]">{placeholder}</span>
        )}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.9}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-white shadow-lg">
          <div className="sticky top-0 bg-white p-2">
            <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]"
                  aria-label="검색어 지우기"
                >
                  <X className="h-4 w-4" strokeWidth={1.9} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredSites.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredSites.map(site => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onSelect(site.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-accent-light)]"
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[var(--color-text)]">{site.name}</span>
                      <SiteStatusBadge status={site.status} />
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
                      {[site.company, site.affiliation].filter(Boolean).join(' · ')}
                    </span>
                    {site.address && (
                      <span className="mt-1 flex items-start gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.9} />
                        <span className="line-clamp-1">{site.address}</span>
                      </span>
                    )}
                  </span>
                  {site.id === selectedId && (
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" strokeWidth={2.2} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false)
            setQuery('')
          }}
        />
      )}
    </div>
  )
}

