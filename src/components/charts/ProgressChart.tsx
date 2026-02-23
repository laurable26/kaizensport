import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useProgress } from '@/hooks/useProgress'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

type Metric = 'maxWeight' | 'totalVolume' | 'estimatedOneRepMax'
type Range = '1M' | '3M' | '6M' | 'all'

interface Props {
  exerciseId: string
}

const METRICS: { key: Metric; label: string }[] = [
  { key: 'maxWeight', label: 'Poids max' },
  { key: 'totalVolume', label: 'Volume' },
  { key: 'estimatedOneRepMax', label: '1RM estimé' },
]

const RANGES: Range[] = ['1M', '3M', '6M', 'all']

export default function ProgressChart({ exerciseId }: Props) {
  const [metric, setMetric] = useState<Metric>('maxWeight')
  const [range, setRange] = useState<Range>('3M')
  const { data, isLoading } = useProgress(exerciseId, range)

  const unit = metric === 'totalVolume' ? 'kg·r' : 'kg'
  const label = METRICS.find((m) => m.key === metric)?.label ?? ''

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        Aucune donnée pour cette période
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Metric toggle */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              metric === m.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(d) => format(parseISO(d), 'dd/MM', { locale: fr })}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(d) => format(parseISO(d as string), 'dd MMM yyyy', { locale: fr })}
            formatter={(value) => [`${value} ${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-accent)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Range filter */}
      <div className="flex gap-1 justify-end">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              range === r
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {r === 'all' ? 'Tout' : r}
          </button>
        ))}
      </div>
    </div>
  )
}
