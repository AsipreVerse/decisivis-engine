'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Cookie, X, Check } from 'lucide-react'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    functional: false
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const acceptAll = () => {
    const fullConsent = {
      necessary: true,
      analytics: true,
      functional: true,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(fullConsent))
    setShowBanner(false)
  }

  const acceptSelected = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(consent))
    setShowBanner(false)
  }

  const rejectAll = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      functional: false,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('cookie-consent', JSON.stringify(minimalConsent))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/20 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Cookie className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Cookie Preferences</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We use cookies to enhance your experience. Some cookies are essential for the site to function properly, 
                while others help us understand how you use our service.
              </p>
              
              {/* Cookie Categories */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={preferences.necessary}
                        disabled
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-sm">Necessary Cookies</span>
                      <span className="text-xs text-gray-500">(Always enabled)</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Required for authentication, security, and basic functionality
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={preferences.functional}
                        onChange={(e) => setPreferences({...preferences, functional: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-sm">Functional Cookies</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Remember your preferences and settings
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-sm">Analytics Cookies</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Help us improve our service by understanding usage patterns
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link href="/cookie-policy" className="text-xs text-blue-600 hover:underline">
                  Cookie Policy
                </Link>
                
                <div className="flex gap-2">
                  <button
                    onClick={rejectAll}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={acceptSelected}
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Accept Selected
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Accept All
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowBanner(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}