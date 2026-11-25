import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reward_id } = await request.json()
    const serviceClient = createServiceRoleClient()

    const { data: reward } = await serviceClient.from('rewards').select('*').eq('id', reward_id).eq('is_active', true).single()
    if (!reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })

    const { data: profile } = await serviceClient.from('profiles').select('total_points').eq('id', user.id).single()
    if (!profile || profile.total_points < reward.points_cost) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: 'Out of stock' }, { status: 400 })
    }

    // Create redemption
    await serviceClient.from('reward_redemptions').insert({
      user_id: user.id, reward_id, points_spent: reward.points_cost,
    })

    // Deduct points
    await serviceClient.from('point_transactions').insert({
      user_id: user.id, points: -reward.points_cost, transaction_type: 'redemption',
      description: `Redeemed: ${reward.name}`, reference_id: reward_id, reference_type: 'reward',
    })

    await serviceClient.from('profiles').update({
      total_points: profile.total_points - reward.points_cost,
    }).eq('id', user.id)

    // Decrement stock
    if (reward.stock !== null) {
      await serviceClient.from('rewards').update({ stock: reward.stock - 1 }).eq('id', reward_id)
    }

    // Notify
    await serviceClient.from('notifications').insert({
      user_id: user.id, title: 'Reward Redeemed!',
      message: `You redeemed "${reward.name}" for ${reward.points_cost} points.`,
      type: 'reward', reference_id: reward_id, reference_type: 'reward',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to redeem' }, { status: 500 })
  }
}
