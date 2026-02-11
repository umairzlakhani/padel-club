import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// We will use the Anon Key as a backup so the app NEVER crashes
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export type UserRole = 'player' | 'coach' | 'admin'

/**
 * Fetches the current authenticated user's role from the applications table.
 * Returns 'player' as default if no role is set or user is not found.
 */
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
