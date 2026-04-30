'use client'

import { Check, Circle, Clock, RotateCcw } from 'lucide-react'

export type WorklogTimelineStep = {
  id: string
  label: string
  status: 'done' | 'active' | 'rejected' | 'idle'
  timestamp?: string | null
}

const STATUS_CLASS: Record<WorklogTimelineStep['status'], string> = {
  done: 'border-green-500 bg-green-500 text-white',
  active: 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white',
  rejected: 'border-red-500 bg-red-500 text-white',
  idle: 'border-slate-300 bg-white text-slate-400',
}

function StepIcon({ status }: { status: WorklogTimelineStep['status'] }) {
  if (status === 'done') return <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
  if (status === 'rejected') return <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
  if (status === 'active') return <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
  return <Circle className="h-3.5 w-3.5" strokeWidth={2.2} />
}

export function WorklogTimeline({
  steps,
  onStepClick,
}: {
  steps: WorklogTimelineStep[]
  onStepClick?: (id: string) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-navy)]">일지 진행 타임라인</h2>
        <span className="text-xs font-semibold text-[var(--color-text-tertiary)]">
          {steps.filter(step => step.status === 'done').length}/{steps.length}
        </span>
      </div>
      <div className="space-y-1">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick?.(step.id)}
            className="group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--color-bg)]"
          >
            <span className="flex flex-col items-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${STATUS_CLASS[step.status]}`}>
                <StepIcon status={step.status} />
              </span>
              {index < steps.length - 1 && <span className="mt-1 h-5 w-px bg-slate-200" />}
            </span>
            <span className="min-w-0 flex-1 pt-1">
              <span className="block text-sm font-semibold text-[var(--color-text)]">{step.label}</span>
              {step.timestamp && (
                <span className="mt-0.5 block text-xs text-[var(--color-text-tertiary)]">{step.timestamp}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

