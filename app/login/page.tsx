'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function LoginForm() {
  const [mounted, setMounted] = useState(false)
  const [email, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => { setMounted(true) }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    if (error) {
      setError(error.message)
      setLoginLoading(false)
    } else {
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0d14] text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#1a1c2e] rounded-3xl p-8 border border-white/5 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎾</div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Player Login</h1>
          <p className="text-gray-400 text-sm">Sign in to Match Day</p>
        </div>

        {mounted ? (
          <div className="space-y-4">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-4 bg-white text-gray-800 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-lg disabled:opacity-50"
            >
              <GoogleLogo />
              {googleLoading ? 'Redirecting...' : 'Sign in with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">or continue with email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#0b0d14] border border-white/10 rounded-xl p-4 mt-1 focus:border-[#00ff88] outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0d14] border border-white/10 rounded-xl p-4 mt-1 focus:border-[#00ff88] outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-xs italic">{error}</p>}
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-[#00ff88] text-black font-black rounded-xl uppercase shadow-lg disabled:opacity-50">
                {loginLoading ? 'Signing in...' : 'Unlock My Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-[56px]" />
            <div className="h-[72px]" />
            <div className="h-[72px]" />
            <div className="h-12" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
