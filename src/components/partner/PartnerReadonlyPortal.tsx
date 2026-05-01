'use client'

import Link from 'next/link'
import {
  Building2,
  ChevronRight,
  FileCheck2,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { SiteStatusBadge } from '@/components/common/SiteStatusBadge'
import { RecentViewedDocuments } from '@/components/home/RecentViewedDocuments'
import { SiteCombobox } from '@/components/site/SiteCombobox'
import { PartnerRecentReports } from '@/components/partner/PartnerRecentReports'
import type { SiteSummary } from '@/contexts/selected-site-context'

interface PartnerReadonlyPortalProps {
  userName?: string | null
  userId?: string | null
  sites: SiteSummary[]
  selectedSite: SiteSummary | null
  selectedSiteId: string | null
  error?: string | null
  onSelectSite: (siteId: string) => void
}

export function PartnerReadonlyPortal({
  userName,
  userId,
  sites,
  selectedSite,
  selectedSiteId,
  error,
  onSelectSite,
}: PartnerReadonlyPortalProps) {
  const siteHref = selectedSiteId ? `${ROUTES.site}/${selectedSiteId}` : ROUTES.site

  const actions = [
    {
      href: siteHref,
      label: '현장 정보',
      description: '주소와 기본 정보를 확인합니다.',
      icon: Building2,
    },
    {
      href: ROUTES.documents,
      label: '승인 문서함',
      description: '승인 또는 잠금 완료 문서만 열람합니다.',
      icon: FileCheck2,
    },
    {
      href: ROUTES.search,
      label: '통합 검색',
      description: '허용된 현장과 공개 문서만 검색합니다.',
      icon: Search,
    },
  ]

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-[var(--color-text-secondary)]">읽기전용 포털</div>
            <h1 className="mt-1 text-xl font-bold text-[var(--color-navy)]">
              {userName || '파트너'}님, 확인 가능한 자료만 표시됩니다
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              개인서류, 급여, 승인 전 문서, 임시 저장 자료는 이 화면에 표시하지 않습니다.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--color-navy)]">허용 현장</div>
          <span className="text-xs text-[var(--color-text-tertiary)]">{sites.length}개</span>
        </div>
        <SiteCombobox
          sites={sites}
          selectedId={selectedSiteId}
          onSelect={onSelectSite}
        />
      </section>

      {selectedSite ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              <Building2 className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[var(--color-navy)]">{selectedSite.name}</span>
                <SiteStatusBadge status={selectedSite.status} />
              </div>
              {selectedSite.company && (
                <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  요청처: {selectedSite.company}
                </div>
              )}
              {selectedSite.affiliation && (
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  소속: {selectedSite.affiliation}
                </div>
              )}
              {selectedSite.address && (
                <div className="mt-2 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" strokeWidth={1.9} />
                  <span className="line-clamp-2">{selectedSite.address}</span>
                </div>
              )}
            </div>
          </div>
          <Link
            href={siteHref}
            className="mt-4 flex items-center justify-between rounded-xl border-2 border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-navy)] transition hover:border-[var(--color-accent)]"
          >
            <span>현장 상세 보기</span>
            <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" strokeWidth={1.9} />
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          열람 가능한 현장이 없습니다.
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </div>
            <div className="font-semibold text-[var(--color-text)]">{label}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
              {description}
            </p>
          </Link>
        ))}
      </section>

      <RecentViewedDocuments
        userId={userId}
        siteId={selectedSiteId}
        partnerMode
      />

      <PartnerRecentReports siteId={selectedSiteId} />
    </div>
  )
}
