'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Reward, RewardRedemption, Challenge } from '@/lib/types'
import { Gift, Trophy, Coins, Star, ShoppingBag, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RewardsPage() {
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const [rwRes, rdRes, chRes] = await Promise.all([
        supabase.from('rewards').select('*').eq('is_active', true).order('points_cost'),
        supabase.from('reward_redemptions').select('*, rewards(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('is_active', true),
      ])
      setRewards(rwRes.data || [])
      setRedemptions(rdRes.data || [])
      setChallenges(chRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [user, supabase])

  const handleRedeem = async (reward: Reward) => {
    if (!user || (user.total_points || 0) < reward.points_cost) {
      toast.error('Not enough points')
      return
    }
    setRedeeming(reward.id)
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward_id: reward.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Reward redeemed!')
      refreshProfile()
    } catch { toast.error('Failed to redeem') }
    finally { setRedeeming(null) }
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><Gift className="h-7 w-7" /> Rewards</h2>

        {/* Points Balance */}
        <div className="card bg-gradient-to-r from-green-700 to-green-800 text-white mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/30 rounded-2xl p-4">
              <Coins className="h-10 w-10" />
            </div>
            <div>
              <p className="text-green-200 text-sm">Your Balance</p>
              <p className="text-4xl font-bold">{user?.total_points || 0} <span className="text-lg font-normal text-green-300">points</span></p>
            </div>
          </div>
        </div>

        {/* Challenges */}
        {challenges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2"><Zap className="h-5 w-5" /> Active Challenges</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.map((ch) => (
                <div key={ch.id} className="card border-l-4 border-l-yellow-400 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant={ch.challenge_type === 'daily' ? 'warning' : 'info'}>{ch.challenge_type}</Badge>
                      <h4 className="font-semibold text-sm mt-2">{ch.title}</h4>
                      {ch.description && <p className="text-xs text-gray-500 mt-1">{ch.description}</p>}
                    </div>
                    <span className="text-sm font-bold text-green-700">+{ch.points_reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Rewards */}
        <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2"><Star className="h-5 w-5" /> Available Rewards</h3>
        {loading ? <LoadingSpinner /> : rewards.length === 0 ? (
          <EmptyState icon={<Gift className="h-12 w-12" />} title="No rewards available" description="Check back later for exciting rewards!" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {rewards.map((reward) => (
              <div key={reward.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                <div className="bg-green-100 rounded-xl p-4 text-center mb-3">
                  <Gift className="h-10 w-10 text-green-600 mx-auto" />
                </div>
                <h4 className="font-semibold text-green-800">{reward.name}</h4>
                {reward.description && <p className="text-sm text-gray-600 mt-1">{reward.description}</p>}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-green-700 flex items-center gap-1"><Coins className="h-4 w-4" />{reward.points_cost}</span>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={redeeming === reward.id || (user?.total_points || 0) < reward.points_cost}
                    className="btn-primary text-sm py-1.5"
                  >
                    {redeeming === reward.id ? '...' : (user?.total_points || 0) < reward.points_cost ? 'Need more pts' : 'Redeem'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Redemption History */}
        <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Redemption History</h3>
        {redemptions.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="h-10 w-10" />} title="No redemptions yet" />
        ) : (
          <div className="card">
            <div className="space-y-3">
              {redemptions.map((rd) => (
                <div key={rd.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rd.rewards?.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(rd.created_at)} · {rd.points_spent} pts</p>
                  </div>
                  <Badge variant={rd.status === 'fulfilled' ? 'success' : rd.status === 'cancelled' ? 'danger' : 'warning'}>{rd.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
