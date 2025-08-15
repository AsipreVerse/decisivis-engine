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
      
      setMatches(apiData.matches)
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getEdgeColor = (edge: number) => {
    if (edge >= 5) return 'text-green-600'
    if (edge >= 2) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Security Warning */}
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>⚠️ TESTING ENVIRONMENT:</strong> This interface is for testing API functionality before OddSight integration.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Testing Interface</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test time-filtered predictions and edge value calculations
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
                  <p className="text-sm text-gray-600">Available Matches</p>
                  <p className="text-3xl font-bold">{matches.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-3xl font-bold">
                    {Math.round(matches.reduce((sum, m) => sum + m.prediction.confidence_adjusted, 0) / matches.length)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Max Edge Value</p>
                  <p className="text-3xl font-bold">
                    {Math.max(...matches.map(m => m.prediction.edge_value)).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Confidence</p>
                  <p className="text-3xl font-bold">
                    {matches.filter(m => m.prediction.confidence_adjusted >= 80).length}
                  </p>
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
          matches.map((match) => (
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
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(match.prediction.confidence_adjusted)}`}>
                      {Math.round(match.prediction.confidence_adjusted)}% confidence
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Predictions */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Predictions
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Home Win:</span>
                        <span className="font-medium">{(match.prediction.home_win_prob * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Draw:</span>
                        <span className="font-medium">{(match.prediction.draw_prob * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Away Win:</span>
                        <span className="font-medium">{(match.prediction.away_win_prob * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Odds */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Market Odds
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Home:</span>
                        <span className="font-medium">{match.odds.home.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Draw:</span>
                        <span className="font-medium">{match.odds.draw.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Away:</span>
                        <span className="font-medium">{match.odds.away.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Value Analysis */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Value Analysis
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Edge Value:</span>
                        <span className={`font-bold ${getEdgeColor(match.prediction.edge_value)}`}>
                          +{match.prediction.edge_value.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recommended:</span>
                        <span className="font-medium capitalize">{match.prediction.recommended_bet.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Market Confidence:</span>
                        <span className="font-medium">{match.odds.market_confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}