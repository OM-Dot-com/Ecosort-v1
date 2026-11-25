import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content_id, score, max_score } = await request.json()
    if (!content_id) return NextResponse.json({ error: 'Content ID required' }, { status: 400 })

    const serviceClient = createServiceRoleClient()

    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const { count } = await serviceClient
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today)

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: 'Daily learning limit reached (5 per day)' }, { status: 429 })
    }

    // Check duplicate for same content today
    const { data: existing } = await serviceClient
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .gte('created_at', today)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Already completed this content today' }, { status: 400 })
    }

    // Get content points
    const { data: content } = await serviceClient
      .from('learning_content')
      .select('points_reward, title')
      .eq('id', content_id)
      .single()

    const points = content?.points_reward || 10

    // Insert attempt
    await serviceClient.from('quiz_attempts').insert({
      user_id: user.id, content_id,
      score: score || 100, max_score: max_score || 100,
      passed: true, points_awarded: points,
    })

    // Award points
    await serviceClient.from('point_transactions').insert({
      user_id: user.id, points, transaction_type: 'learning',
      description: `Completed: ${content?.title || 'Learning activity'}`,
      reference_id: content_id, reference_type: 'learning',
    })

    const { data: profile } = await serviceClient.from('profiles').select('total_points').eq('id', user.id).single()
    await serviceClient.from('profiles').update({
      total_points: (profile?.total_points || 0) + points,
    }).eq('id', user.id)

    // Notify
    await serviceClient.from('notifications').insert({
      user_id: user.id, title: 'Learning Complete!',
      message: `You earned ${points} points for completing "${content?.title}"`,
      type: 'learning', reference_id: content_id, reference_type: 'learning',
    })

    return NextResponse.json({ success: true, points_awarded: points })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
