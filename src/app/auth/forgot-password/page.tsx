'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Please enter your email'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) toast.error(error.message)
      else setSent(true)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-green-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="bg-green-700 rounded-2xl p-3"><Leaf className="h-8 w-8 text-white" /></div>
            <span className="text-3xl font-bold text-green-800">EcoSort</span>
          </div>
        </div>
        <div className="card">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          {sent ? (
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 inline-block mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Check your email</h2>
              <p className="text-gray-500">We&apos;ve sent a password reset link to <strong>{email}</strong>.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Forgot password?</h2>
              <p className="text-gray-500 mb-6">Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input-field pl-11" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
