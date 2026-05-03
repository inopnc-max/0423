'use client'

import { useMemo } from 'react'
import { format, addDays, startOfWeek, isSameDay, parseISO, isValid } from 'date-fns'
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

  const weekStart = useMemo(
    () => startOfWeek(anchorDate, { weekStartsOn: 1 }),
    [anchorDate]
  )

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])


  function moveWeek(delta: number) {
    const newDate = addDays(weekStart, delta * 7)
    onDateSelect(format(newDate, 'yyyy-MM-dd'))
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--color-navy)] transition hover:border-[var(--color-navy)]"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
            <span>{format(selectedDateObj ?? today, 'M월 d일')}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="이전 주"
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
            onClick={() => moveWeek(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            aria-label="다음 주"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="-mx-2 overflow-x-auto px-2">
        <div className="flex min-w-[420px] gap-1">
          {weekDays.map(day => {
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
                className={`flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 transition ${
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
