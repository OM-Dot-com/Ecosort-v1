'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) {
        toast.error(error.message)
      } else {
        setSuccess(true)
        toast.success('Account created successfully!')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-green-50/50">
        <div className="card max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full p-4 inline-block mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-6">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. 
            Click the link to verify your account and start using EcoSort.
          </p>
          <Link href="/auth/login" className="btn-primary inline-block">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-green-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="bg-green-700 rounded-2xl p-3">
              <Leaf className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-green-800">EcoSort</span>
          </div>
        </div>

        <div className="card">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Create account</h2>
          <p className="text-gray-500 mb-6">Join the EcoSort community</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name" className="input-field pl-11" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="input-field pl-11" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                  className="input-field pl-11 pr-11" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password" className="input-field pl-11" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
