'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  TrendingUp, 
  Target, 
  RefreshCw,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  DollarSign
} from 'lucide-react'

interface Match {
  id: string
  league: string
  match_date: string
  home_team: string
  away_team: string
  odds_available_since: string
  confidence: number
  prediction: {
    home_win_prob: number
    draw_prob: number
    away_win_prob: number
    edge_value: number
    recommended_bet: string
    confidence_adjusted: number
  }
  odds: {
    home: number
    draw: number
    away: number
    market_confidence: number
  }
}

interface MatchesResponse {
  matches: Match[]
  count: number
  time_window_hours: number
  query_time: string
  end_time: string
}

export default function TestingPage() {
  const { data: session, status } = useSession()
  const [timeWindow, setTimeWindow] = useState<12 | 24 | 48 | 72>(24)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/login')
    }
  }, [session, status])

  const fetchMatches = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Call Railway API directly through Next.js API proxy
      const response = await fetch(`/api/health`)
      let apiData
      
      if (response.ok) {
        // If API is connected, call the matches endpoint
        const matchesResponse = await fetch(`https://web-production-8eb98.up.railway.app/matches/next?hours=${timeWindow}`)
        if (!matchesResponse.ok) {
          throw new Error(`Railway API returned ${matchesResponse.status}`)
        }
        apiData = await matchesResponse.json()
      } else {
        throw new Error('API connection failed')
      }
      
      // Filter for high-confidence predictions only (80%+)
      const highConfidenceMatches = apiData.matches.filter(
        (match: Match) => match.prediction.confidence_adjusted >= 80
      )
      
      setMatches(highConfidenceMatches)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [timeWindow])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) return null

  // BBC-style outcome description
  const getOutcomeDescription = (match: Match) => {
    const { home_win_prob, draw_prob, away_win_prob } = match.prediction
    const highest = Math.max(home_win_prob, draw_prob, away_win_prob)
    
    if (home_win_prob === highest) {
      return `${match.home_team} very likely to win`
    } else if (away_win_prob === highest) {
      return `${match.away_team} very likely to win`
    } else {
      return `Match likely to be drawn`
    }
  }

  // Simple confidence indicator
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 90) return { level: 'Very High', color: 'text-green-700 bg-green-100', icon: '🟢' }
    if (confidence >= 85) return { level: 'High', color: 'text-green-600 bg-green-50', icon: '🟢' }
    if (confidence >= 80) return { level: 'Good', color: 'text-blue-600 bg-blue-50', icon: '🔵' }
    return { level: 'Moderate', color: 'text-yellow-600 bg-yellow-50', icon: '🟡' }
  }

  // Convert probability to simple odds explanation
  const getSimpleOdds = (probability: number) => {
    const outOf10 = Math.round(probability * 10)
    return `${outOf10} out of 10 times`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Responsible Gambling Notice */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-red-700 dark:text-red-300">18+</span>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Age Restriction</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            This service is restricted to users aged 18 and over. Gambling can be addictive.
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Market Intelligence - For Informational Purposes Only
          </h3>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>• This analysis is for educational and informational purposes only</p>
            <p>• Not betting advice or gambling recommendations</p>
            <p>• Past performance is not indicative of future results</p>
            <p>• Please gamble responsibly and within your means</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener" 
               className="text-blue-600 underline hover:text-blue-700">
              BeGambleAware.org
            </a>
            <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener"
               className="text-blue-600 underline hover:text-blue-700">
              GamCare Support
            </a>
            <span className="text-blue-700">Helpline: 0808 8020 133</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match Analysis Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Statistical analysis of football match outcomes - Most Likely Results Only
          </p>
        </div>
        <button
          onClick={fetchMatches}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Time Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Window Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[12, 24, 48, 72].map((hours) => (
              <button
                key={hours}
                onClick={() => setTimeWindow(hours as 12 | 24 | 48 | 72)}
                className={`p-4 rounded-lg border text-center transition-colors ${
                  timeWindow === hours
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl font-bold">{hours}h</div>
                <div className="text-sm opacity-75">
                  {hours === 12 && 'Immediate'}
                  {hours === 24 && 'Today'}
                  {hours === 48 && 'Weekend'}
                  {hours === 72 && 'Planning'}
                </div>
              </button>
            ))}
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {lastUpdated}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Matches Analysed</p>
                  <p className="text-3xl font-bold">{matches.length}</p>
                  <p className="text-xs text-gray-500 mt-1">High-confidence predictions only</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Certainty</p>
                  <p className="text-3xl font-bold">
                    {matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.prediction.confidence_adjusted, 0) / matches.length) : 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Statistical confidence</p>
                </div>
                <Target className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Time Window</p>
                  <p className="text-3xl font-bold">{timeWindow}h</p>
                  <p className="text-xs text-gray-500 mt-1">Next {timeWindow} hours</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clear Outcomes</p>
                  <p className="text-3xl font-bold">
                    {matches.filter(m => Math.max(m.prediction.home_win_prob, m.prediction.draw_prob, m.prediction.away_win_prob) >= 0.6).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Likely results identified</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading matches...
              </div>
            </CardContent>
          </Card>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No matches found for {timeWindow}h window</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => {
            const confidence = getConfidenceLevel(match.prediction.confidence_adjusted)
            return (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {match.home_team} vs {match.away_team}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {match.league} • {new Date(match.match_date).toLocaleString()}
                      </p>
                      <p className="text-sm font-medium text-blue-700 mt-1">
                        {getOutcomeDescription(match)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${confidence.color}`}>
                        <span className="mr-1">{confidence.icon}</span>
                        {confidence.level} Certainty
                      </div>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Statistical Analysis */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Statistical Analysis
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{match.home_team} to win:</span>
                          <span className="font-medium">{getSimpleOdds(match.prediction.home_win_prob)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${match.prediction.home_win_prob * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Match ends in draw:</span>
                          <span className="font-medium">{getSimpleOdds(match.prediction.draw_prob)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gray-500 h-2 rounded-full transition-all"
                            style={{ width: `${match.prediction.draw_prob * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{match.away_team} to win:</span>
                          <span className="font-medium">{getSimpleOdds(match.prediction.away_win_prob)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all"
                            style={{ width: `${match.prediction.away_win_prob * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Context */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Match Context
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600">Analysis Confidence</div>
                        <div className="text-lg font-bold text-blue-700">
                          {Math.round(match.prediction.confidence_adjusted)}% certain
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Based on historical data patterns
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600">Data Available Since</div>
                        <div className="text-sm font-medium">
                          {new Date(match.odds_available_since).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Sufficient data for analysis
                        </div>
                      </div>
                      
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm text-gray-600">Most Likely Outcome</div>
                        <div className="text-sm font-medium capitalize">
                          {match.prediction.recommended_bet.replace('_', ' ')} 
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Highest probability scenario
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Important Information
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong>Educational Purpose:</strong> This analysis is provided for educational and informational purposes only. 
            It is intended to demonstrate statistical modeling techniques and data analysis methodologies.
          </p>
          <p>
            <strong>No Betting Advice:</strong> This service does not provide betting advice, tips, or gambling recommendations. 
            All predictions are statistical estimates based on historical data and should not be used as the basis for any financial decisions.
          </p>
          <p>
            <strong>Past Performance Warning:</strong> Past performance of statistical models is not indicative of future results. 
            Football matches are unpredictable and influenced by many factors not captured in historical data.
          </p>
          <p>
            <strong>Responsible Gambling:</strong> If you choose to gamble, please do so responsibly. 
            Set limits, never bet more than you can afford to lose, and seek help if gambling becomes a problem.
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
          <div className="flex flex-wrap gap-6 text-xs text-gray-600 dark:text-gray-400">
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener" 
               className="hover:text-blue-600 underline">
              BeGambleAware.org
            </a>
            <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener"
               className="hover:text-blue-600 underline">
              GamCare: 0808 8020 133
            </a>
            <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener"
               className="hover:text-blue-600 underline">
              Gambling Therapy
            </a>
            <span>Age Restriction: 18+</span>
          </div>
        </div>
      </div>
    </div>
  )
}