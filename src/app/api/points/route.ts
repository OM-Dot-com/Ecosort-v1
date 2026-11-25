import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [profile, transactions] = await Promise.all([
      supabase.from('profiles').select('total_points').eq('id', user.id).single(),
      supabase.from('point_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    return NextResponse.json({
      total_points: profile.data?.total_points || 0,
      transactions: transactions.data || [],
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
