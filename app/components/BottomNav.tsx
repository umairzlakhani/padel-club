'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { hapticLight } from '@/lib/haptics'

const leftTabs = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
      </svg>
    ),
  },
  {
    label: 'Feed',
    href: '/feed',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
]

const rightTabs = [
  {
    label: 'Book',
    href: '/booking',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

function TabItem({ tab }: { tab: { label: string; href: string; icon: React.ReactNode } }) {
  const pathname = usePathname()
  const isActive = pathname === tab.href
  return (
    <Link href={tab.href} onClick={() => hapticLight()} aria-label={tab.label}>
      <motion.div
        whileTap={{ scale: 0.85 }}
        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] ${
          isActive ? 'text-[#00ff88]' : 'text-white/30'
        }`}
      >
        {tab.icon}
        <span className="text-[9px] font-semibold uppercase tracking-wider">{tab.label}</span>
      </motion.div>
    </Link>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/5 z-50">
      <div className="flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {leftTabs.map((tab) => (
          <TabItem key={tab.href} tab={tab} />
        ))}

        {/* Center FAB */}
        <Link href="/matchmaking" onClick={() => hapticLight()} aria-label="Find Match">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 bg-[#00ff88] rounded-full -mt-7 shadow-lg shadow-[#00ff88]/30 flex items-center justify-center"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </motion.div>
        </Link>

        {rightTabs.map((tab) => (
          <TabItem key={tab.href} tab={tab} />
        ))}
      </div>
    </nav>
  )
}
