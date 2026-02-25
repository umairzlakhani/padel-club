'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-8"
      >
        <motion.div
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-4"
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="22" rx="16" ry="20" stroke="#00ff88" strokeWidth="3" fill="none" />
            <circle cx="26" cy="14" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="32" cy="14" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="38" cy="14" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="26" cy="22" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="32" cy="22" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="38" cy="22" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="29" cy="30" r="2.5" fill="#00ff88" opacity="0.4" />
            <circle cx="35" cy="30" r="2.5" fill="#00ff88" opacity="0.4" />
            <rect x="29" y="42" width="6" height="16" rx="3" fill="#00ff88" />
            <line x1="29" y1="48" x2="35" y2="48" stroke="#0b0d14" strokeWidth="1" />
            <line x1="29" y1="52" x2="35" y2="52" stroke="#0b0d14" strokeWidth="1" />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
          className="text-5xl font-black italic tracking-tighter uppercase leading-none"
        >
          Match<br/><span className="text-[#00ff88]">Day</span>
        </motion.h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 30 }}
        className="space-y-4 w-full max-w-xs"
      >
        {!mounted ? (
          <div className="py-4" />
        ) : session ? (
          <motion.a
            whileTap={{ scale: 0.95 }}
            href="/dashboard"
            className="block w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase shadow-lg shadow-[#00ff88]/20"
          >
            Enter Dashboard
          </motion.a>
        ) : (
          <>
            <motion.a
              whileTap={{ scale: 0.95 }}
              href="/login"
              className="block w-full py-4 bg-white text-black font-black rounded-2xl uppercase"
            >
              Sign In
            </motion.a>
            <motion.a
              whileTap={{ scale: 0.95 }}
              href="/apply"
              className="block w-full py-4 border border-white/10 text-gray-500 font-bold rounded-2xl uppercase text-sm"
            >
              New Application
            </motion.a>
            <motion.a
              whileTap={{ scale: 0.95 }}
              href="/coach-apply"
              className="block w-full py-3 text-gray-600 font-semibold rounded-2xl uppercase text-xs tracking-wider text-center hover:text-[#00ff88] transition-all"
            >
              Apply as Coach
            </motion.a>
          </>
        )}
      </motion.div>
    </div>
  )
}
