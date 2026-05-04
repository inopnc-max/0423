'use client'

import { useMemo, useState, useRef } from 'react'
import { format, addDays, startOfWeek, isSameDay, parseISO, isValid } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'

type CommonHomeDateRailProps = {
  selectedDate: string
  onDateSelect: (date: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function CommonHomeDateRail({ selectedDate, onDateSelect }: CommonHomeDateRailProps) {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState<Date>(today)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  function handleDaySelect(date: Date | undefined) {
    if (date) {
      onDateSelect(format(date, 'yyyy-MM-dd'))
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                ref={buttonRef}
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--color-navy)] transition hover:border-[var(--color-navy)]"
              >
                <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
                <span>{format(selectedDateObj ?? today, 'M월 d일')}</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="z-50 max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-[var(--color-border)] bg-white p-3 shadow-lg"
                sideOffset={4}
                align="start"
              >
                <DayPicker
                  mode="single"
                  required={false}
                  selected={selectedDateObj ?? undefined}
                  onSelect={handleDaySelect}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={{ after: today }}
                  classNames={{
                    months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                    month: 'space-y-4',
                    caption: 'flex justify-center pt-1 relative items-center',
                    caption_label: 'text-sm font-semibold text-[var(--color-navy)]',
                    nav: 'space-x-1 flex items-center',
                    button_previous: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                    button_next: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                    month_grid: 'w-full border-collapse space-y-1',
                    weekdays: 'space-y-1',
                    weekday: 'text-[var(--color-text-tertiary)] rounded-md w-9 font-normal text-[0.8rem]',
                    week_number: 'text-[var(--color-text-tertiary)] text-[0.8rem]',
                    row: 'flex w-full mt-2',
                    cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                    day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-[var(--color-accent-light)]',
                    selected: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)] hover:text-white rounded-md',
                    today: 'text-[var(--color-navy-light)] font-semibold border border-[var(--color-navy-light)] rounded-md',
                    outside: 'text-[var(--color-text-tertiary)] opacity-50',
                    disabled: 'text-[var(--color-text-tertiary)] opacity-30',
                    range_middle: 'aria-selected:bg-[var(--color-accent-light)] aria-selected:text-[var(--color-accent)] rounded-none',
                    range_start: 'aria-selected:bg-[var(--color-accent)] aria-selected:text-white rounded-r-none',
                    range_end: 'aria-selected:bg-[var(--color-accent)] aria-selected:text-white rounded-l-none',
                    hidden: 'invisible',
                  }}
                />
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
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
