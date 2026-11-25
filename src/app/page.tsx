import React from 'react'
import Link from 'next/link'
import { Leaf, Camera, Users, CalendarCheck, Trophy, ArrowRight, Recycle, MapPin, Award, ChevronRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const features = [
    { icon: Camera, title: 'AI Waste Scanner', desc: 'Snap a photo and let AI identify the waste type, correct bin, and recycling options instantly.', color: 'from-green-500 to-emerald-600' },
    { icon: Users, title: 'Community Groups', desc: 'Find eco-conscious people near you, create cleaning groups, and make a collective impact.', color: 'from-blue-500 to-cyan-600' },
    { icon: CalendarCheck, title: 'Cleaning Drives', desc: 'Organize or join local cleanup events, track participation, and document your impact.', color: 'from-purple-500 to-violet-600' },
    { icon: Trophy, title: 'Rewards & Leaderboard', desc: 'Earn points for every contribution, unlock achievements, and compete on leaderboards.', color: 'from-orange-500 to-amber-600' },
  ]

  const steps = [
    { num: '01', title: 'Scan Waste', desc: 'Upload a photo of waste and AI identifies how to dispose it properly.' },
    { num: '02', title: 'Join Community', desc: 'Find nearby cleaning groups and connect with environmentally conscious people.' },
    { num: '03', title: 'Clean Together', desc: 'Participate in organized cleanup drives and document your impact.' },
    { num: '04', title: 'Earn Rewards', desc: 'Get points for verified contributions and climb the leaderboard.' },
  ]

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-green-700 rounded-xl p-1.5"><Leaf className="h-5 w-5 text-white" /></div>
            <span className="text-xl font-bold text-green-800">EcoSort</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-green-700 hover:text-green-800 font-medium text-sm px-4 py-2">Login</Link>
            <Link href="/auth/register" className="btn-primary text-sm py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-gradient-to-br from-green-700 via-green-800 to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-green-600/30 rounded-full px-4 py-1.5 text-sm text-green-200 mb-6">
              <Sparkles className="h-4 w-4" /> AI-Powered Environmental Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Make Waste Management <span className="text-green-300">Smarter</span> & Communities <span className="text-green-300">Cleaner</span>
            </h1>
            <p className="text-lg text-green-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              Scan waste with AI, learn proper disposal, organize community cleanups, and earn rewards for your environmental contributions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register" className="bg-white text-green-800 hover:bg-green-50 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/auth/login" className="border border-green-400 text-green-200 hover:bg-green-700 px-8 py-3 rounded-xl font-medium transition-all">
                Sign In
              </Link>
            </div>
          </div>
        </div>
        <div className="h-16 bg-gradient-to-b from-transparent to-green-50/30" />
      </section>

      {/* Features */}
      <section className="py-20 bg-green-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-green-800 mb-3">Everything you need for a greener world</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From AI-powered waste identification to community-driven cleanups, EcoSort has all the tools you need.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-shadow group">
                <div className={`bg-gradient-to-br ${f.color} rounded-xl p-3 inline-block mb-4`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-green-800 mb-3">How it works</h2>
            <p className="text-gray-600">Four simple steps to making a real environmental impact</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                <div className="text-5xl font-black text-green-100 mb-3">{s.num}</div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-6 w-6 text-green-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-green-700 to-green-900 text-white">
        <div className="max-w-3xl mx-auto text-center px-4">
          <Recycle className="h-12 w-12 mx-auto mb-6 text-green-300" />
          <h2 className="text-3xl font-bold mb-4">Join the EcoSort community today</h2>
          <p className="text-green-200 mb-8 text-lg">Start making a difference — one scan, one cleanup at a time.</p>
          <Link href="/auth/register" className="bg-white text-green-800 hover:bg-green-50 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg inline-flex items-center gap-2">
            Create Free Account <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-green-300 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              <span className="font-bold text-white">EcoSort</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/auth/login" className="hover:text-white">Login</Link>
              <Link href="/auth/register" className="hover:text-white">Register</Link>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Global</span>
              <span className="flex items-center gap-1"><Award className="h-3 w-3" /> Earn Rewards</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} EcoSort. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
