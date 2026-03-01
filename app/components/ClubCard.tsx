'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { hapticLight } from '@/lib/haptics'

type Props = {
  name: string
  slug: string
  tierCount: number
}

export default function ClubCard({ name, slug, tierCount }: Props) {
  return (
    <Link href={`/ladder/${slug}`} onClick={() => hapticLight()}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="bg-[#111] border border-[#00ff88]/20 rounded-2xl p-5 flex items-center justify-between"
      >
        <div>
          <h3 className="text-lg font-bold text-white">{name}</h3>
          <p className="text-xs text-white/40 mt-0.5">{tierCount} active tier{tierCount !== 1 ? 's' : ''}</p>
        </div>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-white/20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </Link>
  )
}
