'use client'

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] relative page-transition" style={{ minHeight: '100dvh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
