'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/scanner': 'AI Waste Scanner',
  '/dashboard/community': 'Eco Community',
  '/dashboard/drives': 'Cleaning Drives',
  '/dashboard/map': 'Nearby Map',
  '/dashboard/learn': 'Recycling Guides',
  '/dashboard/leaderboard': 'Leaderboard',
  '/dashboard/rewards': 'Rewards',
  '/dashboard/profile': 'Profile',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/admin': 'Admin Panel',
}

interface TopBarProps {
  user: Profile
  unreadCount: number
}

export function TopBar({ user, unreadCount }: TopBarProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'EcoSort'

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-green-100">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <h1 className="text-lg font-bold text-green-800">{title}</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/notifications"
            className="relative p-2 rounded-xl hover:bg-green-50 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/dashboard/profile">
            <Avatar src={user.avatar_url} name={user.full_name || 'User'} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  )
}
