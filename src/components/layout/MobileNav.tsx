'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Camera, Users, CalendarCheck, MoreHorizontal,
  Map, BookOpen, Trophy, User, Bell, Shield, X,
} from 'lucide-react'
import type { Profile } from '@/lib/types'

const mainItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/scanner', label: 'Scan', icon: Camera },
  { href: '/dashboard/community', label: 'Community', icon: Users },
  { href: '/dashboard/drives', label: 'Drives', icon: CalendarCheck },
]

const moreItems = [
  { href: '/dashboard/map', label: 'Nearby Map', icon: Map },
  { href: '/dashboard/learn', label: 'Learn', icon: BookOpen },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/dashboard/rewards', label: 'Rewards', icon: Trophy },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

export function MobileNav({ user }: { user: Profile }) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const allMore = user.role === 'admin'
    ? [...moreItems, { href: '/dashboard/admin', label: 'Admin', icon: Shield }]
    : moreItems

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-16 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-800">More</h3>
              <button onClick={() => setShowMore(false)} className="p-1"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allMore.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      isActive ? 'bg-green-100 text-green-700' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 lg:hidden z-40 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-2">
          {mainItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
              showMore ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
