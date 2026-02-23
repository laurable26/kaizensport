import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useThemeStore } from '@/store/themeStore'
import { useAppModeStore } from '@/store/appModeStore'
import PageHeader from '@/components/layout/PageHeader'
import { Bell, BellOff, LogOut, User, ChevronRight, Sun, Moon, Pencil, Check, X, Shield, Camera, Mail, Dumbbell, Footprints } from 'lucide-react'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { AppMode } from '@/types/app'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { isSupported, registerPush, getPermissionStatus } = useNotifications()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { mode, setMode, syncToSupabase } = useAppModeStore()
  const navigate = useNavigate()
  const [registering, setRegistering] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)

  // Nom
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
  )
  const [savingName, setSavingName] = useState(false)

  // Email
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState(user?.email ?? '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Photo
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null
  )
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const permission = getPermissionStatus()
  const currentName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''

  const handleEnableNotifications = async () => {
    setRegistering(true)
    try {
      const success = await registerPush()
      if (success) toast.success('Notifications activées !')
      else toast.error("Impossible d'activer les notifications")
    } catch {
      toast.error("Erreur lors de l'activation")
    } finally {
      setRegistering(false)
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) return
    setSavingName(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
      if (error) throw error
      await supabase.from('profiles').update({ full_name: trimmed }).eq('id', user!.id)
      toast.success('Nom mis à jour !')
      setEditingName(false)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveEmail = async () => {
    const trimmed = emailValue.trim().toLowerCase()
    if (!trimmed || trimmed === user?.email) {
      setEditingEmail(false)
      return
    }
    setSavingEmail(true)
    try {
      // Supabase envoie un lien de confirmation au NOUVEL email
      const { error } = await supabase.auth.updateUser({ email: trimmed })
      if (error) throw error
      setEmailSent(true)
      toast.success('Lien de confirmation envoyé !')
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors du changement d'email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo trop lourde (max 5 MB)')
      return
    }
    setUploadingPhoto(true)
    try {
      const compressed = await compressImage(file, 400)
      const path = `${user.id}/avatar.webp`
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' })
      if (uploadError) throw uploadError

      const { data: signedData } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(path, 60 * 60 * 24)
      const url = signedData?.signedUrl ?? null

      await supabase.auth.updateUser({ data: { avatar_url: path } })
      await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id)
      setAvatarUrl(url)
      toast.success('Photo mise à jour !')
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleModeSwitch = async (newMode: AppMode) => {
    if (newMode === mode) return
    setSwitchingMode(true)
    setMode(newMode)
    if (user) {
      syncToSupabase(user.id, newMode).catch(() => {})
    }
    toast.success(newMode === 'running' ? 'Mode Course activé' : '💪 Mode Musculation activé')
    setSwitchingMode(false)
  }

  return (
    <div>
      <PageHeader title="Profil" />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* User info + photo */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 space-y-4">
          {/* Avatar + infos */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center overflow-hidden cursor-pointer active-scale"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={30} className="text-[var(--color-accent)]" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-lg active-scale disabled:opacity-60"
              >
                {uploadingPhoto
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={13} className="text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.email}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Membre Kaizen Sport</p>
            </div>
          </div>

          {/* Modifier le nom */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Nom affiché</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  placeholder="Ton prénom..."
                  className="flex-1 bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-accent)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') { setEditingName(false); setNameValue(currentName) }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !nameValue.trim()}
                  className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center active-scale disabled:opacity-50"
                >
                  {savingName
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={16} className="text-white" />
                  }
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(currentName) }}
                  className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center active-scale"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="w-full flex items-center justify-between bg-[var(--color-surface-2)] px-3 py-2.5 rounded-lg active-scale"
              >
                <span className="text-sm text-[var(--color-text)]">
                  {currentName || <span className="text-[var(--color-text-muted)]">Ajouter un nom...</span>}
                </span>
                <Pencil size={14} className="text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {/* Modifier l'email */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Adresse e-mail</p>
            {emailSent ? (
              <div className="bg-[var(--color-surface-2)] rounded-lg px-3 py-3 text-sm text-[var(--color-text-muted)] space-y-1">
                <p className="font-medium text-[var(--color-text)]">📧 Confirme le changement</p>
                <p className="text-xs">Un lien a été envoyé à <strong>{emailValue}</strong>. Clique dessus pour finaliser.</p>
                <button
                  onClick={() => { setEmailSent(false); setEditingEmail(false); setEmailValue(user?.email ?? '') }}
                  className="text-xs text-[var(--color-accent)] underline mt-1"
                >
                  Annuler
                </button>
              </div>
            ) : editingEmail ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  autoFocus
                  placeholder="nouvel@email.com"
                  className="flex-1 bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-sm text-[var(--color-text)] outline-none border border-[var(--color-accent)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEmail()
                    if (e.key === 'Escape') { setEditingEmail(false); setEmailValue(user?.email ?? '') }
                  }}
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail || !emailValue.trim() || emailValue.trim() === user?.email}
                  className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center active-scale disabled:opacity-50"
                >
                  {savingEmail
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={16} className="text-white" />
                  }
                </button>
                <button
                  onClick={() => { setEditingEmail(false); setEmailValue(user?.email ?? '') }}
                  className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center active-scale"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingEmail(true)}
                className="w-full flex items-center justify-between bg-[var(--color-surface-2)] px-3 py-2.5 rounded-lg active-scale"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-text)] truncate">{user?.email}</span>
                </div>
                <Pencil size={14} className="text-[var(--color-text-muted)] flex-shrink-0 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Notifications</p>
          </div>
          {isSupported ? (
            <button
              onClick={permission !== 'granted' ? handleEnableNotifications : undefined}
              disabled={registering || permission === 'denied'}
              className="w-full flex items-center gap-4 px-4 py-4 active-scale disabled:opacity-50"
            >
              {permission === 'granted' ? (
                <Bell size={20} className="text-[var(--color-success)]" />
              ) : (
                <BellOff size={20} className="text-[var(--color-text-muted)]" />
              )}
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">
                  {permission === 'granted' ? 'Notifications activées'
                    : permission === 'denied' ? 'Notifications bloquées'
                    : 'Activer les notifications'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {permission === 'granted' ? 'Vous recevrez des rappels de séances'
                    : permission === 'denied' ? 'Autorisez dans les paramètres du navigateur'
                    : 'Recevoir des rappels pour vos séances planifiées'}
                </p>
              </div>
              {permission === 'default' && !registering && <ChevronRight size={16} className="text-[var(--color-text-muted)]" />}
              {registering && <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />}
            </button>
          ) : (
            <div className="px-4 py-4 text-sm text-[var(--color-text-muted)]">
              Notifications non supportées sur ce navigateur
            </div>
          )}
        </div>

        {/* Apparence */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Apparence</p>
          </div>
          <button onClick={toggleTheme} className="w-full flex items-center gap-4 px-4 py-4 active-scale">
            {theme === 'dark'
              ? <Moon size={20} className="text-[var(--color-accent)]" />
              : <Sun size={20} className="text-yellow-500" />
            }
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Appuyer pour changer</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-[var(--color-accent)]' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </button>
        </div>

        {/* Mode sport */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Mode sport</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleModeSwitch('musculation')}
              disabled={switchingMode}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all active-scale ${
                mode === 'musculation'
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
              }`}
            >
              <Dumbbell size={24} className={mode === 'musculation' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
              <span className={`text-sm font-semibold ${mode === 'musculation' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
                Musculation
              </span>
              {mode === 'musculation' && (
                <span className="text-xs text-[var(--color-accent)]">● Actif</span>
              )}
            </button>
            <button
              onClick={() => handleModeSwitch('running')}
              disabled={switchingMode}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all active-scale ${
                mode === 'running'
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
              }`}
            >
              <Footprints size={24} className={mode === 'running' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
              <span className={`text-sm font-semibold ${mode === 'running' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
                Course
              </span>
              {mode === 'running' && (
                <span className="text-xs text-[var(--color-accent)]">● Actif</span>
              )}
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Application</p>
          </div>
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center neon">
              <img src="/icons/logo.svg" alt="Kaizen Sport" className="w-6 h-6 invert" />
            </div>
            <div>
              <p className="font-semibold">Kaizen Sport</p>
              <p className="text-xs text-[var(--color-text-muted)]">Version 1.0.0</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center gap-4 px-4 py-4 border-t border-[var(--color-border)] active-scale"
          >
            <Shield size={18} className="text-[var(--color-text-muted)]" />
            <span className="flex-1 text-left text-sm font-medium">Politique de confidentialité</span>
            <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Se déconnecter */}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-4 bg-[var(--color-surface)] rounded-2xl active-scale text-[var(--color-danger)]"
        >
          <LogOut size={20} />
          <span className="font-semibold">Se déconnecter</span>
        </button>
      </div>
    </div>
  )
}

// Compression d'image via Canvas → WebP
async function compressImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/webp',
        0.82
      )
    }
    img.onerror = reject
    img.src = url
  })
}
