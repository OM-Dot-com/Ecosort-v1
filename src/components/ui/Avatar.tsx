import React from 'react'
import { getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }
  
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-green-100 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold ring-2 ring-green-100 ${className}`}
    >
      {getInitials(name || 'U')}
    </div>
  )
}
