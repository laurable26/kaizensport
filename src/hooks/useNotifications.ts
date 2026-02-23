import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useNotifications() {
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

  const registerPush = async (): Promise<boolean> => {
    if (!isSupported) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    if (!vapidKey) {
      console.warn('VAPID public key not configured')
      return false
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: subscription.toJSON(),
      user_agent: navigator.userAgent,
    })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return false
    }

    return true
  }

  const unregisterPush = async (): Promise<void> => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
  }

  const getPermissionStatus = (): NotificationPermission | 'unsupported' => {
    if (!isSupported) return 'unsupported'
    return Notification.permission
  }

  return { isSupported, registerPush, unregisterPush, getPermissionStatus }
}
