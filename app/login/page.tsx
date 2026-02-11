'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email, 
      password: password 
    })
    if (error) {
      setError(error.message)
    } else {
      router.push('/profile')
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#0b0d14] border border-white/10 rounded-xl p-4 mt-1 focus:border-[#00ff88] outline-none"
                placeholder="umairlakhani@gmail.com"
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
            <button type="submit" className="w-full py-4 bg-[#00ff88] text-black font-black rounded-xl uppercase shadow-lg">
              Unlock My Dashboard
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="h-[72px]" />
            <div className="h-[72px]" />
            <div className="h-12" />
          </div>
        )}
      </div>
    </div>
  )
}
