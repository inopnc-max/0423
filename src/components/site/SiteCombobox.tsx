'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, ChevronDown, MapPin, Search, X } from 'lucide-react'
import { getSiteStatusConfig } from '@/lib/site-status'
import { getSelectedSiteId } from '@/lib/ui-state'
import type { SiteSummary } from '@/contexts/selected-site-context'

interface SiteComboboxProps {
  sites: SiteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  label?: string
  placeholder?: string
  className?: string
}

const SELECTION_REASON_CHIP_CLASS =
  'shrink-0 whitespace-nowrap rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-navy)] shadow-sm'

function getSelectionReason(selectedId: string | null): string {
  if (!selectedId) return '배정 현장'
  if (typeof window !== 'undefined') {
    const urlSiteId = new URLSearchParams(window.location.search).get('site')
    if (urlSiteId === selectedId) return 'URL 선택'
  }
  if (getSelectedSiteId() === selectedId) return '최근 선택'
  return '배정 현장'
}

function SimpleSiteStatusBadge({ status }: { status: string }) {
  const config = getSiteStatusConfig(status)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.badgeClass}`}>
      {config.label}
    </span>
  )
}

export function SiteCombobox({
  sites,
  selectedId,
  onSelect,
  label = '현장 선택',
  placeholder = '현장명, 원청사, 소속, 주소 검색',
  className = '',
}: SiteComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => sites.find(site => site.id === selectedId) ?? null,
    [sites, selectedId]
  )

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sites
    return sites.filter(site => {
      const fields = [
        site.name,
        site.company,
        site.affiliation,
        site.address,
      ].filter(Boolean).join(' ').toLowerCase()
      return fields.includes(q)
    })
  }, [sites, query])

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
            <span className={SELECTION_REASON_CHIP_CLASS}>
              {selectionReason}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex h-[46px] w-full items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white px-3 text-left shadow-sm transition hover:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
        {selected ? (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text)]">
            {selected.name}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text-secondary)]">{placeholder}</span>
        )}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.9}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-lg">
          <div className="sticky top-0 bg-white p-2">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--color-text)] placeholder-[var(--color-text-secondary)] outline-none"
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
                      <SimpleSiteStatusBadge status={site.status} />
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
