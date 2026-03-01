'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { hapticLight } from '@/lib/haptics'

type Props = {
  name: string
  slug: string
  clubId: string
  icon: string
  topTeam: string | null
  teamCount: number
}

function TierIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'trophy':
      return (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m-4.5-8.25a6.5 6.5 0 1113 0H7.5zM5 7h-.5A2.5 2.5 0 012 4.5v0A2.5 2.5 0 014.5 2H5m14 5h.5A2.5 2.5 0 0022 4.5v0A2.5 2.5 0 0019.5 2H19" />
        </svg>
      )
    case 'star':
      return (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f472b6" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      )
    case 'users':
      return (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    case 'zap':
      return (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      )
    default:
      return null
  }
}

export default function TierCard({ name, slug, clubId, icon, topTeam, teamCount }: Props) {
  return (
    <Link href={`/ladder/${clubId}/${slug}`} onClick={() => hapticLight()}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5 h-full"
      >
        <TierIcon icon={icon} />
        <div>
          <h4 className="text-sm font-bold text-white leading-tight">{name}</h4>
          {topTeam ? (
            <p className="text-[10px] text-white/40 mt-0.5 truncate">#{' '}1 {topTeam}</p>
          ) : (
            <p className="text-[10px] text-white/30 mt-0.5">No teams yet</p>
          )}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/20 mt-auto">
          {teamCount} team{teamCount !== 1 ? 's' : ''}
        </p>
      </motion.div>
    </Link>
  )
}
