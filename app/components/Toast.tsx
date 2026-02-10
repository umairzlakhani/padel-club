'use client'
import { useEffect } from 'react'

type ToastProps = {
  message: string
  type?: 'success' | 'error'
  visible: boolean
  onClose: () => void
}

export default function Toast({ message, type = 'success', visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 3000)
      return () => clearTimeout(t)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] max-w-[440px] w-[calc(100%-48px)] animate-[slideDown_0.3s_ease-out]">
      <div
        className={`px-4 py-3 rounded-xl border backdrop-blur-lg flex items-center gap-3 shadow-2xl ${
          type === 'success'
            ? 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}
      >
        <span className="text-lg">{type === 'success' ? '\u2713' : '\u2717'}</span>
        <span className="text-sm font-semibold flex-1">{message}</span>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none">
          &times;
        </button>
      </div>
    </div>
  )
}
