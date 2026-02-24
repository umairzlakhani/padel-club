'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#111] rounded-[40px] border border-white/5 p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Something Went Wrong</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
