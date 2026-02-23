import { FEELING_EMOJIS, FEELING_LABELS } from '@/lib/constants'

interface Props {
  value: number | null
  onChange: (value: number) => void
  compact?: boolean
}

export default function FeelingRater({ value, onChange, compact = false }: Props) {
  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-2 justify-center'}`}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          title={FEELING_LABELS[n]}
          className={`
            ${compact ? 'w-9 h-9 text-lg' : 'w-12 h-12 text-2xl'}
            rounded-xl border-2 transition-all active-scale flex items-center justify-center
            ${value === n
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 scale-110'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }
          `}
        >
          {FEELING_EMOJIS[n]}
        </button>
      ))}
    </div>
  )
}
