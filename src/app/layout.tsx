import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'EcoSort - AI-Powered Waste Management',
  description:
    'AI-powered environmental platform for waste management, community cleaning, and recycling education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-green-50/30">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', background: '#14532d', color: '#fff' },
            success: { style: { background: '#15803d' } },
            error: { style: { background: '#dc2626' } },
          }}
        />
      </body>
    </html>
  )
}
