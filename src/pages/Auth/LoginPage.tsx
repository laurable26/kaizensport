import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

type Step = 'input' | 'verify'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('input')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setStep('verify')
    } catch {
      toast.error("Erreur lors de l'envoi du lien.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]"
      style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--color-accent)] flex items-center justify-center mx-auto mb-4 neon">
          <img src="/icons/logo.svg" alt="Kaizen Sport" className="w-12 h-12 invert" />
        </div>
        <h1 className="text-3xl font-black text-[var(--color-text)]">Kaizen Sport</h1>
        <p className="text-[var(--color-text-muted)] mt-1">Ton suivi d'entraînement</p>
      </div>

      {step === 'verify' ? (
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-5xl">📧</div>
          <h2 className="text-xl font-bold">Vérifie ta boîte mail</h2>
          <p className="text-[var(--color-text-muted)] text-sm">
            Un lien de connexion a été envoyé à <strong>{email}</strong>. Clique dessus pour te connecter.
          </p>
          <button
            onClick={() => setStep('input')}
            className="text-[var(--color-accent)] text-sm underline"
          >
            ← Retour
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-[var(--color-text-muted)]">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
              autoComplete="email"
              required
              className="w-full bg-[var(--color-surface)] px-4 py-3.5 rounded-xl text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors text-base"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale disabled:opacity-50 text-base neon"
          >
            {submitting ? 'Envoi en cours...' : 'Recevoir un lien magique'}
          </button>
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Pas de mot de passe. Un lien de connexion sera envoyé par email.
          </p>
        </form>
      )}
    </div>
  )
}
