import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex items-center justify-center">
      <div className="text-center px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-2xl border border-white/10 mb-6">
          <span className="text-3xl font-black text-white/20">404</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h1>
        <p className="text-white/40 text-sm mb-8 max-w-[280px] mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all min-h-[44px]"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  )
}
