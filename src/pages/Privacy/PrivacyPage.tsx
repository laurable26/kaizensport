import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function PrivacyPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    try {
      // Supprimer toutes les données utilisateur via fonction RPC
      // (les FK en cascade s'occupent du reste)
      const { error } = await supabase.rpc('delete_user_account')
      if (error) throw error

      toast.success('Compte supprimé')
      await signOut()
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error(err)
      toast.error('Erreur lors de la suppression du compte')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Confidentialité" back />

      <div className="px-4 py-6 space-y-6 pb-24">
        {/* En-tête */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto">
            <img src="/icons/logo.svg" alt="Kaizen Sport" className="w-7 h-7 invert opacity-70" />
          </div>
          <h1 className="text-xl font-black">Politique de confidentialité</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Dernière mise à jour : 24 février 2026</p>
        </div>

        {[
          {
            title: '1. Qui sommes-nous ?',
            content:
              'Kaizen Sport est une application web progressive (PWA) permettant de suivre vos entraînements, exercices et séances de sport. Elle est développée et opérée à titre personnel.',
          },
          {
            title: '2. Données collectées',
            content:
              "Nous collectons uniquement les données nécessaires au fonctionnement de l'application :\n\n• Adresse e-mail (pour l'authentification)\n• Nom d'affichage (optionnel, défini par vous)\n• Photo de profil (optionnelle)\n• Données de musculation : exercices, séances, séries, poids, répétitions, ressentis, planning\n• Données de course à pied : tracés GPS, distance, durée, allure, dénivelé, ressenti\n• Records personnels de course (5 km, 10 km, semi-marathon, marathon)\n• Photos des exercices (stockées dans votre espace privé)\n• Abonnements aux notifications push",
          },
          {
            title: '3. Données de localisation (GPS)',
            content:
              "Le mode Course utilise la géolocalisation de votre appareil pendant vos sorties :\n\n• La localisation n'est active que lorsque vous lancez une course\n• Le tracé GPS (latitude, longitude, altitude, vitesse) est enregistré uniquement si vous terminez et sauvegardez la course\n• Les données GPS sont stockées dans votre compte personnel et ne sont pas partagées\n• Vous pouvez refuser l'accès GPS : la course fonctionnera sans tracé ni statistiques de distance\n• La permission GPS peut être révoquée à tout moment depuis les paramètres de votre navigateur",
          },
          {
            title: '4. Comment sont utilisées vos données ?',
            content:
              "Vos données sont utilisées exclusivement pour :\n• Afficher votre historique et progression (musculation et course)\n• Calculer vos records personnels et statistiques\n• Envoyer des rappels de séances planifiées (si activé)\n• Partager des séances ou courses avec vos amis (si vous l'autorisez)\n\nVos données ne sont jamais vendues, ni partagées avec des tiers à des fins publicitaires.",
          },
          {
            title: '5. Stockage et sécurité',
            content:
              "Vos données sont hébergées sur Supabase (infrastructure cloud basée en Europe) avec :\n• Chiffrement en transit (HTTPS/TLS)\n• Isolation par utilisateur via Row Level Security (RLS)\n• Authentification sécurisée par lien magique (sans mot de passe)\n• Les tracés GPS sont stockés de façon chiffrée et ne sont accessibles que par vous",
          },
          {
            title: '6. Partage avec des tiers',
            content:
              "Nous utilisons les services tiers suivants :\n• Supabase — hébergement base de données, authentification et stockage fichiers (https://supabase.com)\n• Vercel — hébergement de l'application web (https://vercel.com)\n\nAucune donnée GPS ou de santé n'est transmise à ces services au-delà du stockage nécessaire. Ces services disposent de leurs propres politiques de confidentialité.",
          },
          {
            title: '7. Vos droits (RGPD)',
            content:
              "Conformément au RGPD, vous disposez des droits suivants :\n• Accès à vos données (historique, tracés GPS, records)\n• Rectification (modifier votre nom, email depuis le Profil)\n• Suppression de votre compte et de toutes vos données, y compris les tracés GPS (bouton ci-dessous)\n• Portabilité de vos données\n• Retrait du consentement GPS à tout moment\n\nLa suppression de compte est irréversible et efface immédiatement toutes vos données.",
          },
          {
            title: '8. Cookies et stockage local',
            content:
              "L'application utilise le stockage local du navigateur (localStorage) uniquement pour :\n• Maintenir votre session de connexion\n• Mémoriser votre préférence de thème (clair/sombre)\n• Mémoriser votre mode sport sélectionné (musculation/course)\n\nAucun cookie de suivi ou de publicité n'est utilisé.",
          },
          {
            title: '9. Notifications push',
            content:
              "Si vous activez les notifications push, un abonnement est enregistré pour vous envoyer des rappels de séances planifiées. Vous pouvez désactiver les notifications à tout moment depuis les paramètres de votre navigateur ou de l'application.",
          },
          {
            title: '10. Mineurs',
            content:
              "Kaizen Sport est destiné aux personnes de 16 ans et plus. Nous ne collectons pas sciemment de données concernant des mineurs de moins de 16 ans.",
          },
          {
            title: '11. Modifications',
            content:
              "Cette politique peut être mise à jour. En cas de modification importante, vous serez informé via l'application. La date de dernière mise à jour est indiquée en haut de cette page.",
          },
        ].map((section) => (
          <div key={section.title} className="bg-[var(--color-surface)] rounded-2xl p-5 space-y-2">
            <h2 className="font-bold text-sm text-[var(--color-accent)]">{section.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}

        {/* Suppression de compte */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-danger)]/30">
          <div className="px-5 py-4 border-b border-[var(--color-danger)]/20">
            <p className="text-sm font-bold text-[var(--color-danger)]">Zone dangereuse</p>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              La suppression de votre compte est <strong>définitive et irréversible</strong>. Toutes vos données seront effacées : séances, exercices, planning, historique, photos, courses, tracés GPS et records personnels.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-[var(--color-danger)] font-semibold text-sm py-2.5 px-4 rounded-xl border border-[var(--color-danger)]/40 active-scale w-full justify-center"
            >
              <Trash2 size={16} />
              Supprimer mon compte
            </button>
          </div>
        </div>
      </div>

      {/* Modal confirmation suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowDeleteModal(false)}>
          <div
            className="bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--color-danger)]/15 flex items-center justify-center">
                <AlertTriangle size={26} className="text-[var(--color-danger)]" />
              </div>
              <h3 className="text-lg font-black">Supprimer le compte ?</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement effacées.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-[var(--color-text-muted)]">
                Tapez <strong className="text-[var(--color-text)]">SUPPRIMER</strong> pour confirmer
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full bg-[var(--color-surface-2)] px-4 py-3 rounded-xl outline-none border border-[var(--color-border)] focus:border-[var(--color-danger)] text-[var(--color-text)] text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmText('') }}
                className="flex-1 py-3 rounded-xl bg-[var(--color-surface-2)] text-sm font-semibold active-scale"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'SUPPRIMER' || deleting}
                className="flex-1 py-3 rounded-xl bg-[var(--color-danger)] text-white text-sm font-semibold active-scale disabled:opacity-40"
              >
                {deleting
                  ? <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Suppression...
                    </span>
                  : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
