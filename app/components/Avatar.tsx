'use client'
import { useState } from 'react'

type AvatarProps = {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  highlight?: boolean
}

const SIZE_MAP = {
  sm: { dims: 'w-10 h-10', text: 'text-sm' },
  md: { dims: 'w-14 h-14', text: 'text-lg' },
  lg: { dims: 'w-16 h-16', text: 'text-xl' },
}

export default function Avatar({ src, name, size = 'sm', className = '', highlight = false }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const { dims, text } = SIZE_MAP[size]
  const initial = name?.charAt(0)?.toUpperCase() || '?'

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${dims} rounded-full object-cover shrink-0 ${
          highlight ? 'border border-[#00ff88]/30' : 'border border-white/10'
        } ${className}`}
      />
    )
  }

  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center shrink-0 ${
        highlight
          ? 'bg-[#00ff88]/10 border border-[#00ff88]/30'
          : 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10'
      } ${className}`}
    >
      <span className={`${text} font-bold ${highlight ? 'text-[#00ff88]' : 'text-white/50'}`}>
        {initial}
      </span>
    </div>
  )
}
