import { useState, useRef } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { usePhotoUpload } from '@/hooks/usePhotoUpload'

interface Props {
  exerciseId: string
  currentPhotoPath?: string | null
  onUploaded: (path: string) => void
}

export default function PhotoUpload({ exerciseId, currentPhotoPath, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { uploadPhoto } = usePhotoUpload()

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const path = await uploadPhoto(exerciseId, file)
      onUploaded(path)
    } catch (err) {
      console.error('Upload failed:', err)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-[var(--color-text-muted)]">Photo de l'exercice</label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {(preview || currentPhotoPath) ? (
        <div className="relative rounded-xl overflow-hidden aspect-video bg-[var(--color-surface)]">
          <img
            src={preview ?? ''}
            alt="Aperçu"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <button
            onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = '' }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] active-scale"
        >
          <div className="flex gap-3">
            <Camera size={24} />
            <Upload size={24} />
          </div>
          <span className="text-sm">Prendre ou choisir une photo</span>
        </button>
      )}
    </div>
  )
}
