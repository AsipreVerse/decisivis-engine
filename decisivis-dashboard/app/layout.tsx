import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import Navigation from '@/components/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Decisivis Dashboard - Football Prediction Engine',
  description: 'Monitor and control your football prediction model',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900">
        <Providers>
          {session && <Navigation />}
          {children}
        </Providers>
      </body>
    </html>
  )
}