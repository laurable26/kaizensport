import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateExercise, useUpdateExercise, useExercise, useDeleteExercise } from '@/hooks/useExercises'
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, MUSCLE_GROUP_COLORS } from '@/lib/constants'
import PageHeader from '@/components/layout/PageHeader'
import toast from 'react-hot-toast'
import { Trash2, Camera, Upload, X, Check } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  muscle_groups: z.array(z.string()).min(1, 'Sélectionner au moins un groupe'),
  equipment: z.string().optional(),
  notes: z.string().optional(),
  external_link: z.string().url('URL invalide').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function ExerciseFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const { data: existing } = useExercise(id)
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const deleteExercise = useDeleteExercise()

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: existing ? {
      name: existing.name,
      // Stocker plusieurs groupes séparés par virgule dans muscle_group
      muscle_groups: existing.muscle_group ? existing.muscle_group.split(',').filter(Boolean) : [],
      equipment: existing.equipment ?? '',
      notes: existing.notes ?? '',
      external_link: existing.external_link ?? '',
    } : { name: '', muscle_groups: [], equipment: '', notes: '', external_link: '' },
  })

  const handlePhotoFile = async (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setPhotoFile(file)
  }

  const uploadPhoto = async (exerciseId: string): Promise<string | null> => {
    if (!photoFile) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    setUploading(true)
    try {
      const compressed = await imageCompression(photoFile, {
        maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true,
      })
      const path = `${user.id}/${exerciseId}.webp`
      const { error } = await supabase.storage
        .from('exercise-photos')
        .upload(path, compressed, { contentType: 'image/webp', upsert: true })
      if (error) throw error
      return path
    } finally {
      setUploading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: FormData): Promise<any> => {
    try {
      // Jointure des groupes musculaires en string séparée par virgule
      const muscleGroupStr = data.muscle_groups.join(',')

      const basePayload = {
        name: data.name,
        muscle_group: muscleGroupStr || null,
        equipment: data.equipment || null,
        notes: data.notes || null,
        external_link: data.external_link || null,
      }

      if (isEditing && id) {
        const photoPath = await uploadPhoto(id)
        await updateExercise.mutateAsync({
          id,
          ...basePayload,
          ...(photoPath ? { photo_url: photoPath } : {}),
        })
        toast.success('Exercice mis à jour')
        navigate(-1)
      } else {
        // Créer d'abord, puis uploader la photo avec le vrai ID
        const newEx = await createExercise.mutateAsync({
          ...basePayload,
          photo_url: null,
        })
        const photoPath = await uploadPhoto(newEx.id)
        if (photoPath) {
          await updateExercise.mutateAsync({ id: newEx.id, photo_url: photoPath })
        }
        toast.success('Exercice créé')
        navigate(`/exercises/${newEx.id}`, { replace: true })
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Supprimer cet exercice ?')) return
    try {
      await deleteExercise.mutateAsync(id)
      toast.success('Exercice supprimé')
      navigate('/exercises', { replace: true })
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? "Modifier l'exercice" : 'Nouvel exercice'}
        back
        action={isEditing ? (
          <button onClick={handleDelete} className="p-2 text-[var(--color-danger)] active-scale">
            <Trash2 size={20} />
          </button>
        ) : undefined}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5 pb-32">

        {/* Photo — disponible dès la création */}
        <div className="space-y-2">
          <label className="text-sm text-[var(--color-text-muted)]">Photo de l'exercice</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f) }}
          />

          {photoPreview || existing?.photo_url ? (
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-[var(--color-surface)]">
              <img
                src={photoPreview ?? (existing?.photo_url ?? '')}
                alt="Aperçu"
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)] active-scale hover:border-[var(--color-accent)] transition-colors"
            >
              <div className="flex gap-4">
                <Camera size={28} />
                <Upload size={28} />
              </div>
              <span className="text-sm">Prendre ou choisir une photo</span>
            </button>
          )}
        </div>

        {/* Nom */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Nom *</label>
          <input
            {...register('name')}
            placeholder="ex : Développé couché"
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:neon-border transition-all"
          />
          {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>}
        </div>

        {/* Groupes musculaires — sélection multiple */}
        <div className="space-y-2">
          <label className="text-sm text-[var(--color-text-muted)]">
            Groupes musculaires * <span className="text-xs">(plusieurs possibles)</span>
          </label>
          <Controller
            name="muscle_groups"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((g) => {
                  const selected = field.value.includes(g.value)
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          field.onChange(field.value.filter((v) => v !== g.value))
                        } else {
                          field.onChange([...field.value, g.value])
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active-scale border ${
                        selected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent-glow)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {selected && <Check size={12} />}
                      {g.label}
                    </button>
                  )
                })}
              </div>
            )}
          />
          {errors.muscle_groups && (
            <p className="text-xs text-[var(--color-danger)]">{errors.muscle_groups.message}</p>
          )}
        </div>

        {/* Équipement */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Équipement</label>
          <select
            {...register('equipment')}
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] appearance-none"
          >
            <option value="">Sélectionner...</option>
            {EQUIPMENT_TYPES.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Technique, conseils..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        {/* Lien externe */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Lien externe (tutoriel...)</label>
          <input
            {...register('external_link')}
            type="url"
            placeholder="https://..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
          {errors.external_link && (
            <p className="text-xs text-[var(--color-danger)]">{errors.external_link.message}</p>
          )}
        </div>
      </form>

      {/* Bouton au-dessus de la barre de navigation */}
      <div className="footer-btn-container">
        <button
          type="submit"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || uploading}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale disabled:opacity-50 neon transition-all"
        >
          {isSubmitting || uploading
            ? 'Enregistrement...'
            : isEditing ? 'Mettre à jour' : "Créer l'exercice"}
        </button>
      </div>
    </div>
  )
}
