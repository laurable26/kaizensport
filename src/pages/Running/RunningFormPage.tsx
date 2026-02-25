import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useRunningSession,
  useCreateRunningSession,
  useUpdateRunningSession,
} from '@/hooks/useRunning'
import PageHeader from '@/components/layout/PageHeader'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { RunningIntervalBlock } from '@/types/database'

type RunType = 'free' | 'distance' | 'duration' | 'interval'

interface BlockDraft {
  id: string // local only
  label: string
  phase: 'work' | 'rest'
  duration_s: number
  target_pace_min_km: number | ''
  repetitions: number
}

function newBlock(phase: 'work' | 'rest' = 'work'): BlockDraft {
  return {
    id: Math.random().toString(36).slice(2),
    label: phase === 'work' ? 'Sprint' : 'Récupération',
    phase,
    duration_s: phase === 'work' ? 30 : 90,
    target_pace_min_km: '',
    repetitions: 1,
  }
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = secPerKm % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function BlockEditor({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  canRemove,
}: {
  block: BlockDraft
  index: number
  total: number
  onChange: (b: BlockDraft) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  canRemove: boolean
}) {
  const [rawDuration, setRawDuration] = useState(String(block.duration_s))
  return (
    <div className={`bg-[var(--color-surface-2)] rounded-xl p-3 space-y-2 border-l-4 ${
      block.phase === 'work' ? 'border-[var(--color-accent)]' : 'border-slate-500'
    }`}>
      {/* Header : Bloc N + phase toggle + actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
          Bloc {index + 1}
        </span>
        {/* Phase toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] flex-1">
          {(['work', 'rest'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onChange({ ...block, phase: p })}
              className={`flex-1 py-1 text-xs font-semibold transition-colors ${
                block.phase === p
                  ? p === 'work'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-slate-600 text-white'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {p === 'work' ? '⚡ Travail' : '😮‍💨 Repos'}
            </button>
          ))}
        </div>
        {/* Move up/down */}
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="p-1 text-[var(--color-text-muted)] disabled:opacity-20 active-scale"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="p-1 text-[var(--color-text-muted)] disabled:opacity-20 active-scale"
        >
          <ChevronDown size={14} />
        </button>
        {canRemove && (
          <button onClick={onRemove} className="text-[var(--color-danger)] active-scale p-1">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Label */}
      <input
        type="text"
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        placeholder={block.phase === 'work' ? 'Ex: Sprint' : 'Ex: Récupération'}
        className="w-full bg-[var(--color-surface)] px-3 py-1.5 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
      />

      {/* Durée — stepper +/− */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)]">Durée</label>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => {
              const newD = Math.max(5, block.duration_s - 5)
              setRawDuration(String(newD))
              onChange({ ...block, duration_s: newD })
            }}
            className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-lg font-bold text-[var(--color-text)] active-scale flex items-center justify-center flex-shrink-0"
          >
            −
          </button>
          <div className="flex-1 flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              value={rawDuration}
              onChange={(e) => setRawDuration(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                const parsed = parseInt(rawDuration, 10)
                if (!isNaN(parsed) && parsed >= 1) {
                  onChange({ ...block, duration_s: parsed })
                  setRawDuration(String(parsed))
                } else {
                  setRawDuration(String(block.duration_s))
                }
              }}
              className="w-20 text-center font-bold text-base text-[var(--color-text)] bg-transparent outline-none"
            />
            <span className="text-xs text-[var(--color-text-muted)]">sec</span>
          </div>
          <button
            onClick={() => {
              const newD = block.duration_s + 5
              setRawDuration(String(newD))
              onChange({ ...block, duration_s: newD })
            }}
            className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-lg font-bold text-[var(--color-text)] active-scale flex items-center justify-center flex-shrink-0"
          >
            +
          </button>
        </div>
      </div>

      {/* Target pace (only for work blocks) */}
      {block.phase === 'work' && (
        <div>
          <label className="text-xs text-[var(--color-text-muted)]">Allure cible (sec/km, optionnel)</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              value={block.target_pace_min_km === '' ? '' : block.target_pace_min_km}
              min={120}
              max={900}
              step={5}
              placeholder="Ex: 300 = 5:00/km"
              onChange={(e) => onChange({
                ...block,
                target_pace_min_km: e.target.value === '' ? '' : Number(e.target.value),
              })}
              className="flex-1 bg-[var(--color-surface)] px-3 py-1.5 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
            />
            {block.target_pace_min_km !== '' && (
              <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                {formatPace(Number(block.target_pace_min_km))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunningFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const { data: existing } = useRunningSession(id ?? '')
  const createSession = useCreateRunningSession()
  const updateSession = useUpdateRunningSession()

  const [name, setName] = useState('')
  const [type, setType] = useState<RunType>('free')
  const [targetDistanceKm, setTargetDistanceKm] = useState<string>('')
  const [targetDurationMin, setTargetDurationMin] = useState<string>('')
  const [warmupMin, setWarmupMin] = useState<string>('5')
  const [cooldownMin, setCooldownMin] = useState<string>('5')
  const [notes, setNotes] = useState('')
  const [blocks, setBlocks] = useState<BlockDraft[]>([newBlock('work'), newBlock('rest')])
  const [saving, setSaving] = useState(false)

  // Load existing session for edit
  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setType(existing.type as RunType)
    if (existing.target_distance_m) setTargetDistanceKm(String(existing.target_distance_m / 1000))
    if (existing.target_duration_s) setTargetDurationMin(String(Math.round(existing.target_duration_s / 60)))
    if (existing.warmup_duration_s) setWarmupMin(String(Math.round(existing.warmup_duration_s / 60)))
    if (existing.cooldown_duration_s) setCooldownMin(String(Math.round(existing.cooldown_duration_s / 60)))
    if (existing.notes) setNotes(existing.notes)
    if (existing.running_interval_blocks && existing.running_interval_blocks.length > 0) {
      setBlocks(
        existing.running_interval_blocks
          .slice()
          .sort((a: RunningIntervalBlock, b: RunningIntervalBlock) => a.order_index - b.order_index)
          .map((b: RunningIntervalBlock) => ({
            id: b.id,
            label: b.label ?? '',
            phase: b.phase as 'work' | 'rest',
            duration_s: b.duration_s,
            target_pace_min_km: b.target_pace_min_km ? Number(b.target_pace_min_km) : '',
            repetitions: b.repetitions,
          }))
      )
    }
  }, [existing])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Donne un nom à ton plan')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        target_distance_m: type === 'distance' && targetDistanceKm !== '' ? Math.round(Number(targetDistanceKm) * 1000) : null,
        target_duration_s: type === 'duration' && targetDurationMin !== '' ? Math.round(Number(targetDurationMin) * 60) : null,
        warmup_duration_s: type === 'interval' && warmupMin !== '' && Number(warmupMin) > 0 ? Math.round(Number(warmupMin) * 60) : null,
        cooldown_duration_s: type === 'interval' && cooldownMin !== '' && Number(cooldownMin) > 0 ? Math.round(Number(cooldownMin) * 60) : null,
        notes: notes.trim() || null,
      }
      const intervalBlocks = type === 'interval' ? blocks.map((b, i) => ({
        order_index: i,
        label: b.label.trim() || null,
        phase: b.phase,
        duration_s: b.duration_s,
        target_pace_min_km: b.target_pace_min_km !== '' ? Number(b.target_pace_min_km) : null,
        repetitions: 1,
      })) : []

      if (isEdit && id) {
        await updateSession.mutateAsync({ id, session: payload, blocks: intervalBlocks })
        toast.success('Plan mis à jour !')
      } else {
        const newSession = await createSession.mutateAsync({ session: payload, blocks: intervalBlocks })
        toast.success('Plan créé !')
        navigate(`/running/${newSession.id}`, { replace: true })
        return
      }
      navigate(-1)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const addBlock = () => {
    const lastBlock = blocks[blocks.length - 1]
    const nextPhase: 'work' | 'rest' = !lastBlock || lastBlock.phase === 'rest' ? 'work' : 'rest'
    setBlocks([...blocks, newBlock(nextPhase)])
  }

  const updateBlock = (index: number, updated: BlockDraft) => {
    setBlocks(blocks.map((b, i) => (i === index ? updated : b)))
  }

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = (index: number, dir: 'up' | 'down') => {
    const newBlocks = [...blocks]
    const swapIdx = dir === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= newBlocks.length) return
    ;[newBlocks[index], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[index]]
    setBlocks(newBlocks)
  }

  const TYPE_OPTIONS: { value: RunType; label: string; desc: string }[] = [
    { value: 'free', label: 'Libre', desc: 'Sans objectif' },
    { value: 'distance', label: '📍 Distance', desc: 'Objectif km' },
    { value: 'duration', label: '⏱ Durée', desc: 'Objectif temps' },
    { value: 'interval', label: '⚡ Fractionné', desc: 'Blocs intervalles' },
  ]

  return (
    <div>
      <PageHeader title={isEdit ? 'Modifier le plan' : 'Nouveau plan'} />

      <div className="px-4 py-4 space-y-5">
        {/* Name */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
            Nom du plan
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Fractionné 8×400m..."
            autoFocus
            className="w-full bg-[var(--color-surface-2)] px-4 py-3 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Type */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
            Type de course
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-colors active-scale ${
                  type === opt.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                }`}
              >
                <span>{opt.label}</span>
                <span className="font-normal opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific options */}
        {type === 'distance' && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
              Distance cible
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={targetDistanceKm}
                placeholder="Ex: 10"
                onChange={(e) => setTargetDistanceKm(e.target.value.replace(/[^0-9.,]/g, ''))}
                className="flex-1 bg-[var(--color-surface-2)] px-4 py-3 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
              />
              <span className="text-sm font-bold text-[var(--color-text-muted)]">km</span>
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 21.1, 42.2].map((d) => (
                <button
                  key={d}
                  onClick={() => setTargetDistanceKm(String(d))}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-xs font-semibold active-scale text-[var(--color-text-muted)]"
                >
                  {d}km
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'duration' && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
              Durée cible
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={targetDurationMin}
                placeholder="Ex: 30"
                onChange={(e) => setTargetDurationMin(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 bg-[var(--color-surface-2)] px-4 py-3 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
              />
              <span className="text-sm font-bold text-[var(--color-text-muted)]">min</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setTargetDurationMin(String(m))}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-xs font-semibold active-scale text-[var(--color-text-muted)]"
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'interval' && (
          <>
            {/* Warmup / Cooldown */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
              <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
                Échauffement &amp; Retour au calme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">Échauffement (min)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={warmupMin}
                    onChange={(e) => setWarmupMin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full mt-1 bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)]">Retour calme (min)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cooldownMin}
                    onChange={(e) => setCooldownMin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full mt-1 bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
                  Blocs d&apos;intervalles ({blocks.length})
                </label>
                <button
                  onClick={addBlock}
                  className="flex items-center gap-1 text-[var(--color-accent)] text-xs font-semibold active-scale"
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </div>
              {blocks.map((block, i) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={i}
                  total={blocks.length}
                  onChange={(updated) => updateBlock(i, updated)}
                  onRemove={() => removeBlock(i)}
                  onMove={(dir) => moveBlock(i, dir)}
                  canRemove={blocks.length > 1}
                />
              ))}

              {/* Summary */}
              <div className="bg-[var(--color-surface)] rounded-xl px-4 py-3 text-xs text-[var(--color-text-muted)] space-y-1">
                <p className="font-bold text-[var(--color-text)]">Résumé du fractionné</p>
                {warmupMin !== '' && Number(warmupMin) > 0 && (
                  <p>• Échauffement {warmupMin} min</p>
                )}
                {blocks.map((b, i) => (
                  <p key={i}>• {b.label || (b.phase === 'work' ? 'Travail' : 'Repos')} — {fmtDuration(b.duration_s)}{b.target_pace_min_km !== '' ? ` @ ${formatPace(Number(b.target_pace_min_km))}` : ''}</p>
                ))}
                {cooldownMin !== '' && Number(cooldownMin) > 0 && (
                  <p>• Retour au calme {cooldownMin} min</p>
                )}
                <p className="pt-1 border-t border-[var(--color-border)] font-semibold text-[var(--color-text)]">
                  Total : ~{(
                    (warmupMin !== '' ? Number(warmupMin) * 60 : 0) +
                    blocks.reduce((acc, b) => acc + b.duration_s, 0) +
                    (cooldownMin !== '' ? Number(cooldownMin) * 60 : 0)
                  ) / 60 | 0} min
                </p>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <label className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Conseils, terrain, équipement..."
            rows={3}
            className="w-full bg-[var(--color-surface-2)] px-4 py-3 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        {/* Save button — flux normal, toujours visible en bas */}
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-4 rounded-xl active-scale disabled:opacity-50 neon transition-all text-base"
        >
          {saving ? 'Sauvegarde...' : isEdit ? 'Enregistrer les modifications' : 'Créer le plan'}
        </button>
      </div>
    </div>
  )
}
