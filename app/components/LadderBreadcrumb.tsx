'use client'
import Link from 'next/link'
import { hapticLight } from '@/lib/haptics'

type Segment = { label: string; href: string }

export default function LadderBreadcrumb({ segments }: { segments: Segment[] }) {
  return (
    <nav className="flex items-center gap-1.5 mb-4">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={seg.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="text-white/20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">{seg.label}</span>
            ) : (
              <Link
                href={seg.href}
                onClick={() => hapticLight()}
                className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
              >
                {seg.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
