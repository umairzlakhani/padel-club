import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// Browser client — stores auth tokens in cookies (readable by middleware)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Admin client — server-only, bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export type UserRole = 'player' | 'coach' | 'admin'

export async function getUserRole(): Promise<{ role: UserRole; userId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: 'player', userId: null }

  const { data, error } = await supabase
    .from('applications')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !data) return { role: 'player', userId: user.id }

  return { role: (data.role as UserRole) || 'player', userId: user.id }
}
