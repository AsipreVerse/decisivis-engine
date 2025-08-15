'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Zap, TrendingUp, Building2, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface PricingTier {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  limitations: string[]
  stripePriceId?: string
  popular?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for casual analysis',
    features: [
      'Up to 5 predictions per day',
      'Basic statistical analysis',
      '24-hour match window',
      'Standard confidence metrics',
      'Email support'
    ],
    limitations: [
      'No API access',
      'No data export',
      'No priority support',
      'No advanced features'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    description: 'For serious analysts',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    popular: true,
    features: [
      'Unlimited predictions',
      'Advanced ML analysis',
      'All time windows (12h-72h)',
      'High-confidence filtering',
      'CSV data export',
      'API access (1000 calls/day)',
      'Priority email support',
      'Custom alerts',
      'Historical data access'
    ],
    limitations: [
      'No white-label options',
      'No dedicated support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    period: 'month',
    description: 'For organizations',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'White-label options',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom model training',
      'Real-time webhooks',
      'Team collaboration',
      'Advanced analytics dashboard',
      'Phone & video support'
    ],
    limitations: []
  }
]

export default function PricingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const handleSubscribe = async (tier: PricingTier) => {
    if (!session) {
      redirect('/login')
      return
    }

    if (tier.id === 'free') {
      // Handle free tier selection
      return
    }

    setLoading(tier.id)

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: tier.stripePriceId,
          tierId: tier.id,
          billingPeriod
        }),
      })

      const { url } = await response.json()

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const getDisplayPrice = (tier: PricingTier) => {
    if (tier.price === 0) return 'Free'
    
    const price = billingPeriod === 'yearly' ? tier.price * 10 : tier.price // 2 months free
    return `$${price}`
  }

  const getDisplayPeriod = (tier: PricingTier) => {
    if (tier.price === 0) return ''
    return billingPeriod === 'yearly' ? '/year' : '/month'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Choose the plan that fits your needs
        </p>

        {/* Billing Period Toggle */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.id}
            className={`relative ${
              tier.popular
                ? 'border-blue-600 shadow-xl scale-105'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-8">
              <div className="mb-4">
                {tier.id === 'free' && <Zap className="h-12 w-12 mx-auto text-gray-600" />}
                {tier.id === 'pro' && <TrendingUp className="h-12 w-12 mx-auto text-blue-600" />}
                {tier.id === 'enterprise' && <Building2 className="h-12 w-12 mx-auto text-purple-600" />}
              </div>
              
              <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{tier.description}</p>
              
              <div className="mb-6">
                <span className="text-4xl font-bold">{getDisplayPrice(tier)}</span>
                <span className="text-gray-600 dark:text-gray-400">{getDisplayPeriod(tier)}</span>
                {billingPeriod === 'yearly' && tier.price > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    2 months free with yearly billing
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={loading === tier.id}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  tier.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : tier.id === 'enterprise'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tier.id ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </span>
                ) : tier.id === 'free' ? (
                  'Get Started'
                ) : tier.id === 'enterprise' ? (
                  'Contact Sales'
                ) : (
                  'Start Free Trial'
                )}
              </button>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Features</h4>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.limitations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Limitations</h4>
                    <ul className="space-y-2">
                      {tier.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is there a free trial?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, Pro and Enterprise plans come with a 14-day free trial. No credit card required to start.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit cards, debit cards, and PayPal through our secure Stripe integration.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely! You can cancel your subscription at any time with no cancellation fees. You'll continue to have access until the end of your billing period.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Money Back Guarantee */}
      <div className="mt-12 text-center">
        <Card className="max-w-2xl mx-auto bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="py-8">
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
              30-Day Money Back Guarantee
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Try Decisivis risk-free. If you're not satisfied within the first 30 days, we'll refund your payment in full.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}