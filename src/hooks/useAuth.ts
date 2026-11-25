'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // useMemo ensures stable reference across re-renders
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        setUser(data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchProfile()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })
    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/auth/login'
  }

  return { user, loading, signOut, refreshProfile: fetchProfile }
}
