import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// Note: After running `npx supabase gen types typescript --project-id YOUR_ID`,
// replace this with: import type { Database } from '@/types/database'
// and use createClient<Database>(...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
