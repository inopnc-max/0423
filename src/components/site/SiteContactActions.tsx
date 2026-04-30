'use client'

import { Copy, MapPinned, Phone } from 'lucide-react'

type SiteContactSource = {
  name?: string | null
  address?: string | null
  accommodation_address?: string | null
  lodging_address?: string | null
  dormitory_address?: string | null
  site_manager_phone?: string | null
  manager_phone?: string | null
  director_phone?: string | null
  safety_manager_phone?: string | null
  safety_phone?: string | null
}

function firstValue(...values: Array<string | null | undefined>) {
  return values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

function openMap(address: string) {
  window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer')
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: typeof MapPinned
  label: string
  onClick?: () => void
  href?: string
}) {
  const className =
    'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'

  if (href) {
    return (
      <a href={href} className={className}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
        {label}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
      {label}
    </button>
  )
}

function ContactRow({
  title,
  value,
  kind,
}: {
  title: string
  value: string | null
  kind: 'address' | 'phone'
}) {
  if (!value) return null

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <div className="text-xs font-semibold text-[var(--color-text-tertiary)]">{title}</div>
      <div className="mt-1 break-words text-sm font-semibold text-[var(--color-text)]">{value}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {kind === 'address' ? (
          <>
            <ActionButton icon={MapPinned} label="지도 보기" onClick={() => openMap(value)} />
            <ActionButton icon={Copy} label="주소 복사" onClick={() => void copyToClipboard(value)} />
          </>
        ) : (
          <>
            <ActionButton icon={Phone} label="전화" href={`tel:${value.replace(/[^0-9+]/g, '')}`} />
            <ActionButton icon={Copy} label="번호 복사" onClick={() => void copyToClipboard(value)} />
          </>
        )}
      </div>
    </div>
  )
}

export function SiteContactActions({ site }: { site: SiteContactSource | null | undefined }) {
  const siteAddress = firstValue(site?.address)
  const lodgingAddress = firstValue(site?.accommodation_address, site?.lodging_address, site?.dormitory_address)
  const managerPhone = firstValue(site?.site_manager_phone, site?.manager_phone, site?.director_phone)
  const safetyPhone = firstValue(site?.safety_manager_phone, site?.safety_phone)
  const hasAny = Boolean(siteAddress || lodgingAddress || managerPhone || safetyPhone)

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-navy)]">현장 연락/위치</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">주소와 담당자 연락처를 바로 확인합니다.</p>
        </div>
      </div>

      {hasAny ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ContactRow title="현장 주소" value={siteAddress} kind="address" />
          <ContactRow title="숙소 주소" value={lodgingAddress} kind="address" />
          <ContactRow title="현장소장 전화" value={managerPhone} kind="phone" />
          <ContactRow title="안전소장 전화" value={safetyPhone} kind="phone" />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          등록된 연락처 또는 주소 정보가 없습니다.
        </div>
      )}
    </section>
  )
}

