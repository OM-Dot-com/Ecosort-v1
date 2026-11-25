import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceRoleClient()

    // Verify admin
    const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const action = request.nextUrl.searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'updateRole': {
        const { userId, newRole } = body
        if (!['user', 'organizer', 'admin'].includes(newRole)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        await serviceClient.from('profiles').update({ role: newRole }).eq('id', userId)
        return NextResponse.json({ success: true })
      }

      case 'reviewEvidence': {
        const { evidenceId, status } = body
        await serviceClient.from('cleanup_evidence').update({
          status, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
        }).eq('id', evidenceId)

        if (status === 'approved') {
          const { data: evidence } = await serviceClient.from('cleanup_evidence').select('user_id').eq('id', evidenceId).single()
          if (evidence) {
            const { data: existing } = await serviceClient.from('point_transactions').select('id').eq('reference_id', evidenceId).eq('transaction_type', 'evidence_upload').single()
            if (!existing) {
              await serviceClient.from('point_transactions').insert({
                user_id: evidence.user_id, points: 30, transaction_type: 'evidence_upload',
                description: 'Approved cleanup evidence', reference_id: evidenceId, reference_type: 'evidence',
              })
              const { data: p } = await serviceClient.from('profiles').select('total_points').eq('id', evidence.user_id).single()
              if (p) await serviceClient.from('profiles').update({ total_points: (p.total_points || 0) + 30 }).eq('id', evidence.user_id)
              await serviceClient.from('notifications').insert({
                user_id: evidence.user_id, title: 'Evidence Approved!',
                message: 'Your cleanup evidence was approved. You earned 30 points!',
                type: 'points', reference_id: evidenceId, reference_type: 'evidence',
              })
            }
          }
        }
        return NextResponse.json({ success: true })
      }

      case 'reviewReport': {
        const { reportId, status: reportStatus } = body
        await serviceClient.from('reports').update({
          status: reportStatus, reviewed_by: user.id,
        }).eq('id', reportId)
        return NextResponse.json({ success: true })
      }

      case 'updatePointConfig': {
        const { configs } = body
        for (const config of configs) {
          await serviceClient.from('point_config').update({
            points: config.points, daily_limit: config.daily_limit,
          }).eq('id', config.id)
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
