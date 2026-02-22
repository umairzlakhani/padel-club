'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0b0d14] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="mb-8">
        <div className="text-6xl mb-4">🎾</div>
        <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
          Match<br/><span className="text-[#00ff88]">Day</span>
        </h1>
      </div>

      <div className="space-y-4 w-full max-w-xs">
        {!mounted ? (
          <div className="py-4" />
        ) : session ? (
          <a href="/dashboard" className="block w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase shadow-lg shadow-[#00ff88]/20">
            Enter Dashboard
          </a>
        ) : (
          <>
            <a href="/login" className="block w-full py-4 bg-white text-black font-black rounded-2xl uppercase">
              Sign In
            </a>
            <a href="/apply" className="block w-full py-4 border border-white/10 text-gray-500 font-bold rounded-2xl uppercase text-sm">
              New Application
            </a>
            <a href="/coach-apply" className="block w-full py-3 text-gray-600 font-semibold rounded-2xl uppercase text-xs tracking-wider text-center hover:text-[#00ff88] transition-all">
              Apply as Coach
            </a>
          </>
        )}
      </div>
    </div>
  )
}
