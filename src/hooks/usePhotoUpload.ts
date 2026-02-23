import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'

export function usePhotoUpload() {
  const uploadPhoto = async (exerciseId: string, file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/webp',
    })

    const path = `${user.id}/${exerciseId}.webp`

    const { error } = await supabase.storage
      .from('exercise-photos')
      .upload(path, compressed, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) throw error
    return path
  }

  const getPhotoUrl = async (path: string | null): Promise<string | null> => {
    if (!path) return null
    const { data } = await supabase.storage
      .from('exercise-photos')
      .createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }

  return { uploadPhoto, getPhotoUrl }
}
