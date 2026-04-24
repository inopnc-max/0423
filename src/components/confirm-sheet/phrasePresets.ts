/**
 * 작업내용 자주 쓰는 문구 프리셋
 * 선택 후 수정 가능
 */

export interface WorkContentPreset {
  id: string
  label: string
  content: string
  category: 'installation' | 'inspection' | 'maintenance' | 'repair' | 'other'
}

export const WORK_CONTENT_PRESETS: WorkContentPreset[] = [
  {
    id: 'pc_repair_crack',
    label: 'PC부재 균열보수',
    category: 'repair',
    content: '지하주차장 PC부재 균열보수',
  },
  {
    id: 'pc_repair_finish',
    label: 'PC부재 마감보수',
    category: 'repair',
    content: '지하주차장 PC부재 마감보수',
  },
  {
    id: 'pc_repair_work',
    label: 'PC부재 보수작업',
    category: 'repair',
    content: 'PC부재 보수작업',
  },
]

/**
 * 카테고리별 그룹핑
 */
export const PRESET_CATEGORIES = [
  { id: 'installation', label: '설치' },
  { id: 'inspection', label: '점검' },
  { id: 'maintenance', label: '유지보수' },
  { id: 'repair', label: '수리' },
  { id: 'other', label: '기타' },
] as const

/**
 * 특기사항 프리셋
 */
export const SPECIAL_NOTES_PRESETS = [
  '특이사항 없음.',
  '안전 점검 완료 후 작업을 진행하였습니다.',
  '고객 요청사항이 있어 추후 재방문 예정입니다.',
]
