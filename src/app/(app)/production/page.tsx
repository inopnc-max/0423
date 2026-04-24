'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Boxes, Package, Wallet, Boxes as BoxesIcon, TrendingUp, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { PRODUCTION_ROUTES } from '@/lib/navigation.config'

export default function ProductionPage() {
  const { user } = useAuth()
  const [todaySummary] = useState({
    npc1000: 0,
    npc3000q: 0,
    other: 0,
    transport: 0,
    selfUse: 0,
    sales: 0,
  })

  const productCards = [
    { key: 'npc1000', label: 'NPC-1000', value: todaySummary.npc1000, href: PRODUCTION_ROUTES.npc1000, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'npc3000q', label: 'NPC-3000Q', value: todaySummary.npc3000q, href: PRODUCTION_ROUTES.npc3000q, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'other', label: '기타', value: todaySummary.other, href: PRODUCTION_ROUTES.other, icon: Boxes, color: 'text-slate-600', bg: 'bg-slate-50' },
  ]

  const expenseCards = [
    { key: 'transport', label: '운송비', value: todaySummary.transport, href: PRODUCTION_ROUTES.transport, icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'selfUse', label: '자체사용', value: todaySummary.selfUse, href: PRODUCTION_ROUTES.selfUse, icon: BoxesIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'sales', label: '판매', value: todaySummary.sales, href: PRODUCTION_ROUTES.sales, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  return (
    <div className="space-y-4 p-4 pb-[calc(16px+var(--safe-bottom)+80px)]">
      {/* 오늘 요약 */}
      <section className="ui-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold">
          <Clock className="h-4 w-4" />
          <h3>오늘 요약</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {productCards.map(({ key, label, value, color }) => (
            <div key={key} className="bg-[var(--color-bg-soft)] rounded-xl p-3 text-center">
              <div className="text-xs text-[var(--color-text-sub)] mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value} <span className="text-xs font-normal text-[var(--color-text-sub)]">ea</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* 생산 입력 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-navy)] mb-3">생산 입력</h3>
        <div className="grid grid-cols-3 gap-3">
          {productCards.map(({ key, label, href, icon: Icon, color, bg }) => (
            <Link
              key={key}
              href={href}
              className="ui-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition"
            >
              <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 비용/출하 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-navy)] mb-3">비용/출하</h3>
        <div className="grid grid-cols-3 gap-3">
          {expenseCards.map(({ key, label, href, icon: Icon, color, bg }) => (
            <Link
              key={key}
              href={href}
              className="ui-card p-4 flex flex-col items-center gap-2 hover:shadow-md transition"
            >
              <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 최근 입력 */}
      <section className="ui-card p-4">
        <div className="flex items-center gap-2 text-[var(--color-primary-strong)] font-semibold mb-3">
          <Boxes className="h-4 w-4" />
          <h3>최근 입력</h3>
        </div>
        <div className="text-center py-8 text-[var(--color-text-sub)] text-sm">
          최근 입력 데이터가 없습니다
        </div>
      </section>
    </div>
  )
}
