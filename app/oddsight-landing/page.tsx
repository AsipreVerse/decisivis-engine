'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Target, 
  Activity,
  Zap,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe,
  Users,
  Trophy,
  ArrowRight
} from 'lucide-react'

interface LiveMatch {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoff: string
  edgeValue: number
  confidence: number
  prediction: string
  trend: 'up' | 'down' | 'stable'
}

interface Signal {
  id: string
  type: 'value' | 'movement' | 'consensus'
  title: string
  match: string
  timeAgo: string
  change: number
  priority: 'high' | 'medium' | 'low'
}

export default function OddSightLandingPage() {
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString())
  const [activeSignals, setActiveSignals] = useState<number>(14)
  const [signalAccuracy, setSignalAccuracy] = useState<number>(98.2)

  // Featured match data
  const featuredMatch: LiveMatch = {
    id: '1',
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    kickoff: 'Today 20:00',
    edgeValue: 4.72,
    confidence: 87,
    prediction: 'Strategic advantage identified',
    trend: 'up'
  }

  // Recent activity signals
  const recentSignals: Signal[] = [
    {
      id: '1',
      type: 'value',
      title: 'High Value Detected',
      match: 'Man United vs Chelsea',
      timeAgo: '5m ago',
      change: 1.8,
      priority: 'high'
    },
    {
      id: '2',
      type: 'movement',
      title: 'Line Movement',
      match: 'Lakers vs Warriors',
      timeAgo: '12m ago',
      change: 2.4,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'consensus',
      title: 'Market Shift',
      match: 'Real Madrid vs Barcelona',
      timeAgo: '18m ago',
      change: -1.2,
      priority: 'medium'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString())
      // Simulate live updates
      setActiveSignals(prev => prev + Math.floor(Math.random() * 3) - 1)
      setSignalAccuracy(prev => Math.max(95, Math.min(100, prev + (Math.random() - 0.5) * 0.5)))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'value': return <Target className="h-4 w-4" />
      case 'movement': return <TrendingUp className="h-4 w-4" />
      case 'consensus': return <Users className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Age Restriction Banner */}
      <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
        18+ | Gamble Responsibly | BeGambleAware.org
      </div>

      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              OddSight
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-2">Market Intelligence Platform</p>
          <p className="text-sm text-gray-400">For informational purposes only • Not betting advice</p>
        </div>

        {/* Live Status */}
        <div className="flex justify-center mb-8">
          <div className="bg-green-500/20 border border-green-500/30 rounded-full px-6 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">LIVE</span>
            <span className="text-gray-400 text-sm">Updated {lastUpdate}</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Market Intelligence */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    LIVE MARKET INTELLIGENCE
                  </CardTitle>
                  <span className="text-xs text-gray-400">Updated 3m ago</span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Premier Event */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-500">PREMIER EVENT</span>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {featuredMatch.homeTeam} vs. {featuredMatch.awayTeam}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {featuredMatch.league} • {featuredMatch.kickoff}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-400">
                          +{featuredMatch.edgeValue.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">Edge Value</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-600/30 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Strategic advantage</div>
                        <div className="text-white font-medium">{featuredMatch.prediction}</div>
                      </div>
                      <div className="bg-slate-600/30 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Market confidence</div>
                        <div className="text-white font-medium">{featuredMatch.confidence}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signal Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-blue-400 font-medium">SIGNAL ACCURACY</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {signalAccuracy.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-purple-400 font-medium">ACTIVE SIGNALS</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {activeSignals}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-400" />
                  RECENT ACTIVITY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSignals.map((signal) => (
                    <div key={signal.id} className={`p-4 rounded-lg border ${getPriorityColor(signal.priority)}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-current">
                          {getTypeIcon(signal.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-current">
                            {signal.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {signal.match}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {signal.timeAgo}
                            </span>
                            <span className={`text-sm font-bold ${signal.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {signal.change > 0 ? '+' : ''}{signal.change}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="text-center">
                    <span className="text-sm text-green-400 font-medium">Live updating</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Access Advanced Market Intelligence
              </h2>
              <p className="text-gray-300 mb-6">
                Professional-grade analysis tools for serious market researchers. 
                Educational insights and statistical modeling.
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto">
                View Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Footer */}
        <div className="mt-12 p-6 bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="text-center text-sm text-gray-400 space-y-2">
            <p>
              <strong>Disclaimer:</strong> This platform provides market analysis for educational purposes only. 
              Not investment or betting advice. Past performance is not indicative of future results.
            </p>
            <div className="flex justify-center space-x-6 text-xs">
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener" className="hover:text-blue-400 underline">
                BeGambleAware.org
              </a>
              <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener" className="hover:text-blue-400 underline">
                GamCare: 0808 8020 133
              </a>
              <span>18+ Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}