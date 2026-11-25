import React from 'react'

export function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizes[size]} animate-spin rounded-full border-3 border-green-200 border-t-green-600`} />
      {text && <p className="text-sm text-gray-500 animate-pulse">{text}</p>}
    </div>
  )
}
