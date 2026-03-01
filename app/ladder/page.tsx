'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight } from '@/lib/haptics'
import { CLUBS } from '@/lib/ladder-config'
import BottomNav from '@/app/components/BottomNav'
import LadderBreadcrumb from '@/app/components/LadderBreadcrumb'
import ClubCard from '@/app/components/ClubCard'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

export default function LadderDirectoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
        <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
          <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-4">
            <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse mt-2 mb-6" />
            <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
        <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => { hapticLight(); router.push('/dashboard') }} className="cursor-pointer text-white/40 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Club Ladder</h1>
          </div>
          <div className="pl-9">
            <LadderBreadcrumb segments={[{ label: 'Ladder', href: '/ladder' }]} />
          </div>
          <p className="text-sm text-white/40 mt-2 mb-6">Select your club</p>
        </div>

        <div className="px-6 pb-28">
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
            {CLUBS.map((club) => (
              <motion.div key={club.slug} variants={fadeUp}>
                <ClubCard name={club.name} slug={club.slug} tierCount={club.tiers.length} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
