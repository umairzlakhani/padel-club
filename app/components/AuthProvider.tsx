'use client'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import Toast from './Toast'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

const PUBLIC_PATHS = ['/login', '/apply', '/coach-apply', '/']

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' as 'success' | 'error' })
  const router = useRouter()
  const pathname = usePathname()

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message, type: 'error' })
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !newSession) {
          const isPublic = PUBLIC_PATHS.some(p => pathname === p)
          if (!isPublic) {
            showToast('Session expired — please sign in again')
            router.replace('/login')
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [pathname, router, showToast])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(t => ({ ...t, visible: false }))}
      />
      {children}
    </AuthContext.Provider>
  )
}
