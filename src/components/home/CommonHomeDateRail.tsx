'use client'

import { useMemo } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

type CommonHomeDateRailProps = {
  selectedDate: string
  onDateSelect: (date: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function CommonHomeDateRail({ selectedDate, onDateSelect }: CommonHomeDateRailProps) {
  const today = useMemo(() => new Date(), [])

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null
    const parsed = parseISO(selectedDate)
    return isValid(parsed) ? parsed : null
  }, [selectedDate])

  const anchorDate = selectedDateObj ?? today
  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate])
  const monthEnd = useMemo(() => endOfMonth(anchorDate), [anchorDate])
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthEnd, monthStart]
  )

  function moveMonth(delta: number) {
    const nextMonth = delta < 0 ? subMonths(anchorDate, 1) : addMonths(anchorDate, 1)
    onDateSelect(format(nextMonth, 'yyyy-MM-dd'))
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--color-text-tertiary)]">작업일 선택</div>
          <div className="mt-1 text-lg font-bold text-[var(--color-navy)]">
            {format(anchorDate, 'yyyy년 M월')}
          </div>
          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {format(anchorDate, 'M월 d일')} 기준
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'date'
              input.value = selectedDate
              input.onchange = event => {
                const value = (event.target as HTMLInputElement).value
                if (value) onDateSelect(value)
              }
              input.click()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-navy)] transition hover:border-[var(--color-navy)]"
            aria-label="달력에서 날짜 선택"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="이전 월"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => onDateSelect(format(today, 'yyyy-MM-dd'))}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            오늘
          </button>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="다음 월"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max gap-2">
          {monthDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false
            const isToday = isSameDay(day, today)
            const weekday = day.getDay()
            const isSunday = weekday === 0
            const isSaturday = weekday === 6

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onDateSelect(dateKey)}
                className={`flex h-[88px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : isToday
                      ? 'border-[var(--color-navy-light)] bg-[var(--color-navy-light)]/5'
                      : 'border-transparent bg-[var(--color-bg)] hover:border-[var(--color-border)]'
                }`}
                >
                <span
                  className={`text-xs font-semibold ${
                    isSelected
                      ? 'text-[var(--color-accent)]'
                      : isSunday
                        ? 'text-red-500'
                        : isSaturday
                          ? 'text-blue-500'
                          : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {WEEKDAYS[weekday]}
                </span>
                <span
                  className={`text-lg font-bold leading-none ${
                    isSelected
                      ? 'text-[var(--color-accent)]'
                      : isToday
                        ? 'text-[var(--color-navy-light)]'
                        : 'text-[var(--color-text)]'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    isSelected
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {format(day, 'M월')}
                </span>
                {isToday && !isSelected && (
                  <span className="h-1 w-1 rounded-full bg-[var(--color-navy-light)]" />
                )}
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
