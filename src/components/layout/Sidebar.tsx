'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Camera, Users, CalendarCheck, Map, BookOpen,
  Trophy, User, Bell, Shield, Leaf, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { Profile } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/scanner', label: 'AI Scanner', icon: Camera },
  { href: '/dashboard/community', label: 'Eco Community', icon: Users },
  { href: '/dashboard/drives', label: 'Cleaning Drives', icon: CalendarCheck },
  { href: '/dashboard/map', label: 'Nearby Map', icon: Map },
  { href: '/dashboard/learn', label: 'Recycling Guides', icon: BookOpen },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/dashboard/rewards', label: 'Rewards', icon: Trophy },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

interface SidebarProps {
  user: Profile
  onSignOut: () => void
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const allItems = user.role === 'admin'
    ? [...navItems, { href: '/dashboard/admin', label: 'Admin', icon: Shield }]
    : navItems

  return (
    <aside
      className={`hidden lg:flex flex-col bg-gradient-to-b from-green-800 to-green-900 text-white transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      } min-h-screen fixed left-0 top-0 z-40`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-green-700/50">
        <div className="bg-green-500 rounded-xl p-2 flex-shrink-0">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        {!collapsed && <span className="text-xl font-bold tracking-tight">EcoSort</span>}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {allItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-green-600/50 text-white shadow-sm'
                  : 'text-green-200 hover:bg-green-700/50 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 p-2 rounded-xl hover:bg-green-700/50 text-green-300 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>

      {/* User Info */}
      <div className="border-t border-green-700/50 p-4">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar_url} name={user.full_name || 'User'} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name || 'User'}</p>
              <p className="text-xs text-green-300 truncate">{user.total_points} pts</p>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg hover:bg-green-700/50 text-green-300 hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
