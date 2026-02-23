import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  email: string
  full_name: string | null
}

export type Friendship = {
  id: string
  user_id_1: string
  user_id_2: string
  status: 'pending' | 'accepted' | 'rejected'
  requester: string
  created_at: string
  friend: Profile
}

export type SessionInvite = {
  id: string
  session_log_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  inviter?: Profile
  invitee?: Profile
}

// Fetch current user's friends (accepted friendships)
export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          p1:profiles!friendships_user_id_1_fkey(*),
          p2:profiles!friendships_user_id_2_fkey(*)
        `)
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .eq('status', 'accepted')

      if (error) throw error

      return (data ?? []).map((f: any) => ({
        ...f,
        friend: f.user_id_1 === user.id ? f.p2 : f.p1,
      })) as Friendship[]
    },
  })
}

// Fetch pending friend requests (received)
export function usePendingRequests() {
  return useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          p1:profiles!friendships_user_id_1_fkey(*),
          p2:profiles!friendships_user_id_2_fkey(*)
        `)
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
        .eq('status', 'pending')
        .neq('requester', user.id)

      if (error) throw error

      return (data ?? []).map((f: any) => ({
        ...f,
        friend: f.user_id_1 === user.id ? f.p2 : f.p1,
      })) as Friendship[]
    },
  })
}

// Search user by email to add as friend
export function useSearchProfile() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .single()
      if (error) return null
      return data as Profile
    },
  })
}

// Send friend request
export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const user = authSession?.user
      if (!user) throw new Error('Non authentifié')

      const [uid1, uid2] = [user.id, targetUserId].sort()
      const { error } = await supabase.from('friendships').insert({
        user_id_1: uid1,
        user_id_2: uid2,
        requester: user.id,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

// Accept friend request
export function useRespondFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
    },
  })
}

// Remove friend
export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

// Invite a friend to an active session (musculation)
export function useInviteToSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionLogId, inviteeId }: { sessionLogId: string; inviteeId: string }) => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const user = authSession?.user
      if (!user) throw new Error('Non authentifié')

      const { error } = await supabase.from('session_invites').insert({
        session_log_id: sessionLogId,
        inviter_id: user.id,
        invitee_id: inviteeId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-invites'] }),
  })
}

// Invite a friend to an active run
export function useInviteToRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ runLogId, inviteeId }: { runLogId: string; inviteeId: string }) => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const user = authSession?.user
      if (!user) throw new Error('Non authentifié')

      const { error } = await supabase.from('run_invites').insert({
        run_log_id: runLogId,
        inviter_id: user.id,
        invitee_id: inviteeId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['run-invites'] }),
  })
}

// Get pending run invitations for the current user
export function useRunInvites() {
  return useQuery({
    queryKey: ['run-invites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('run_invites')
        .select(`
          *,
          inviter:profiles!run_invites_inviter_id_fkey(*)
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')

      if (error) {
        // Table peut ne pas encore exister si migration pas encore exécutée
        console.warn('[useRunInvites]', error.message)
        return []
      }
      return (data ?? []) as RunInvite[]
    },
  })
}

// Respond to a run invite
export function useRespondRunInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('run_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['run-invites'] }),
  })
}

export type RunInvite = {
  id: string
  run_log_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  inviter?: Profile
}

// Get pending session invitations for the current user
export function useSessionInvites() {
  return useQuery({
    queryKey: ['session-invites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('session_invites')
        .select(`
          *,
          inviter:profiles!session_invites_inviter_id_fkey(*)
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')

      if (error) throw error
      return (data ?? []) as SessionInvite[]
    },
  })
}

// Respond to a session invite
export function useRespondSessionInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('session_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-invites'] }),
  })
}
