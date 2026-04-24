'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Building2, Calendar, ClipboardList, PenTool, User, Briefcase, MapPin, StickyNote } from 'lucide-react'
import type { ConfirmSheetDraft } from './types'
import { WORK_CONTENT_PRESETS, SPECIAL_NOTES_PRESETS, PRESET_CATEGORIES } from './phrasePresets'

interface ConfirmSheetFormProps {
  draft: ConfirmSheetDraft
  sites: { id: string; name: string; company: string; address: string; manager: string }[]
  onDraftChange: (updates: Partial<ConfirmSheetDraft>) => void
  onSiteSelect: (siteId: string) => void
}

/**
 * 작업완료확인서 입력 폼
 * - 섹션별 구분: 기본정보 / 작업내용 / 특기사항 / 확인자
 * - 자주 쓰는 문구 quick insert
 * - 모바일 최적화
 */
export function ConfirmSheetForm({ draft, sites, onDraftChange, onSiteSelect }: ConfirmSheetFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

  // 작업내용 프리셋 선택
  const handlePresetSelect = (content: string) => {
    onDraftChange({ workContent: draft.workContent ? `${draft.workContent}\n${content}` : content })
  }

  // 특기사항 프리셋 선택
  const handleNotePresetSelect = (note: string) => {
    onDraftChange({ specialNotes: note })
  }

  // 현장 선택 시 자동 정보 채움
  const handleSiteChange = (siteId: string) => {
    onSiteSelect(siteId)
    const site = sites.find(s => s.id === siteId)
    if (site) {
      onDraftChange({
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        siteManager: site.manager,
        companyName: site.company,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* 기본정보 섹션 */}
      <section className="ui-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold">
          <Building2 className="h-4 w-4" />
          <h3>기본정보</h3>
        </div>

        {/* 현장 선택 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            현장명 <span className="text-red-500">*</span>
          </label>
          <select
            value={draft.siteId}
            onChange={e => handleSiteChange(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
            style={{ borderColor: 'rgba(219, 227, 236, 1)' }}
          >
            <option value="">현장을 선택하세요</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {/* 업체 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">업체</label>
          <input
            type="text"
            value={draft.companyName}
            onChange={e => onDraftChange({ companyName: e.target.value })}
            placeholder="업체명을 입력하세요"
            className="w-full px-3 py-2.5 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
          />
        </div>

        {/* 공사명 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            공사명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={draft.projectName}
            onChange={e => onDraftChange({ projectName: e.target.value })}
            placeholder="공사명을 입력하세요"
            className="w-full px-3 py-2.5 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
          />
        </div>

        {/* 공사기간 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              공사기간
            </span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={draft.periodStart}
              onChange={e => onDraftChange({ periodStart: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-white text-sm"
            />
            <span className="text-sm text-[var(--color-text-secondary)] px-1">~</span>
            <input
              type="date"
              value={draft.periodEnd}
              onChange={e => onDraftChange({ periodEnd: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-white text-sm"
            />
          </div>
        </div>

        {/* 작업일 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">
            작업일 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={draft.workDate}
            onChange={e => onDraftChange({ workDate: e.target.value })}
            className="w-full px-3 py-2.5 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
          />
        </div>
      </section>

      {/* 작업내용 섹션 */}
      <section className="ui-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold">
          <ClipboardList className="h-4 w-4" />
          <h3>작업내용</h3>
        </div>

        {/* 자주 쓰는 문구 */}
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-secondary)]">자주 쓰는 문구 (선택 후 수정 가능)</p>
          <div className="flex flex-wrap gap-1.5">
            {WORK_CONTENT_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.content)}
                className="px-2.5 py-1.5 text-xs bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-highlight)] border border-[var(--color-border)] rounded-full transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 작업내용 입력 */}
        <textarea
          value={draft.workContent}
          onChange={e => onDraftChange({ workContent: e.target.value })}
          placeholder="작업내용을 입력하세요"
          rows={4}
          className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-white text-sm resize-none"
        />
      </section>

      {/* 특기사항 섹션 */}
      <section className="ui-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold">
          <StickyNote className="h-4 w-4" />
          <h3>특기사항</h3>
        </div>

        {/* 특기사항 프리셋 */}
        <div className="flex flex-wrap gap-1.5">
          {SPECIAL_NOTES_PRESETS.map((note, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleNotePresetSelect(note)}
              className="px-2.5 py-1.5 text-xs bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-highlight)] border border-[var(--color-border)] rounded-full transition"
            >
              {note}
            </button>
          ))}
        </div>

        <textarea
          value={draft.specialNotes}
          onChange={e => onDraftChange({ specialNotes: e.target.value })}
          placeholder="특기사항을 입력하세요 (없으면 비워두세요)"
          rows={3}
          className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm resize-none"
          style={{ borderColor: 'rgba(219, 227, 236, 1)' }}
        />
      </section>

      {/* 확인자 정보 섹션 */}
      <section className="ui-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold">
          <User className="h-4 w-4" />
          <h3>확인자 정보</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">소속</label>
            <input
              type="text"
              value={draft.affiliation}
              onChange={e => onDraftChange({ affiliation: e.target.value })}
              placeholder="소속"
              className="w-full px-3 py-2.5 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1.5">성명</label>
            <input
              type="text"
              value={draft.signerName}
              onChange={e => onDraftChange({ signerName: e.target.value })}
              placeholder="성명"
              className="w-full px-3 py-2.5 border border-[var(--form-border)] rounded-lg bg-[var(--form-surface)] text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-ring)]"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
