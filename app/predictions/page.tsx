'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Target, 
  TrendingUp, 
  Home,
  Plane,
  BarChart3,
  Trophy,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface PredictionResult {
  prediction: 'H' | 'D' | 'A'
  confidence: number
  probabilities: {
    home: number
    draw: number
    away: number
  }
}

export default function PredictionsPage() {
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState('')

  // Feature inputs for advanced prediction
  const [features, setFeatures] = useState({
    home_shots_on_target: 5,
    away_shots_on_target: 3,
    home_form: 0.6,
    away_form: 0.4,
    home_elo: 1550,
    away_elo: 1450,
    h2h_home_wins: 3,
    h2h_draws: 2,
    h2h_away_wins: 1
  })

  const teams = [
    'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United',
    'Barcelona', 'Real Madrid', 'Atletico Madrid', 'Sevilla', 'Valencia',
    'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
    'Juventus', 'AC Milan', 'Inter Milan', 'AS Roma', 'Napoli',
    'PSG', 'Marseille', 'Lyon', 'Monaco', 'Lille'
  ].sort()

  const makePrediction = async () => {
    if (!homeTeam || !awayTeam) {
      setError('Please select both teams')
      return
    }

    if (homeTeam === awayTeam) {
      setError('Teams must be different')
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      // Calculate derived features
      const shot_diff = features.home_shots_on_target - features.away_shots_on_target
      const elo_diff = features.home_elo - features.away_elo
      const form_diff = features.home_form - features.away_form
      const h2h_score = (features.h2h_home_wins * 3 + features.h2h_draws) / 
                       ((features.h2h_home_wins + features.h2h_draws + features.h2h_away_wins) * 3)

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          features: {
            shot_diff,
            home_advantage: 1,
            home_form: features.home_form,
            away_form: features.away_form,
            elo_diff,
            h2h_score
          }
        })
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const data = await response.json()
      setResult(data.prediction)
    } catch (err) {
      setError('Failed to make prediction. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'H': return 'text-blue-600'
      case 'A': return 'text-red-600'
      case 'D': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getPredictionText = (prediction: string) => {
    switch (prediction) {
      case 'H': return 'Home Win'
      case 'A': return 'Away Win'
      case 'D': return 'Draw'
      default: return 'Unknown'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                Match Prediction Testing
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Test predictions with custom team matchups and features
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Home className="h-4 w-4" />
                  Home Team
                </label>
                <select
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select home team...</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <div className="text-2xl font-bold text-gray-400">VS</div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Plane className="h-4 w-4" />
                  Away Team
                </label>
                <select
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select away team...</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Home Elo</p>
                  <input
                    type="number"
                    value={features.home_elo}
                    onChange={(e) => setFeatures(prev => ({ ...prev, home_elo: parseInt(e.target.value) }))}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Away Elo</p>
                  <input
                    type="number"
                    value={features.away_elo}
                    onChange={(e) => setFeatures(prev => ({ ...prev, away_elo: parseInt(e.target.value) }))}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                  />
                </div>
              </div>

              <button
                onClick={makePrediction}
                disabled={isLoading || !homeTeam || !awayTeam}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Make Prediction
                  </>
                )}
              </button>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Prediction Result */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Result</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  {/* Main Prediction */}
                  <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Predicted Result</p>
                    <p className={`text-4xl font-bold ${getPredictionColor(result.prediction)}`}>
                      {getPredictionText(result.prediction)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Probability Bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          Home Win
                        </span>
                        <span>{(result.probabilities.home * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{ width: `${result.probabilities.home * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Draw</span>
                        <span>{(result.probabilities.draw * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gray-600 h-3 rounded-full"
                          style={{ width: `${result.probabilities.draw * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Plane className="h-3 w-3" />
                          Away Win
                        </span>
                        <span>{(result.probabilities.away * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-red-600 h-3 rounded-full"
                          style={{ width: `${result.probabilities.away * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Confidence Indicator */}
                  <Alert className={result.confidence > 0.6 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                    {result.confidence > 0.6 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <AlertDescription>
                      {result.confidence > 0.6
                        ? 'High confidence prediction - Model is fairly certain about this outcome'
                        : 'Moderate confidence - This match could go either way'}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3" />
                  <p>Select teams and click predict to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Features (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium">Home Shots on Target</label>
                <input
                  type="number"
                  value={features.home_shots_on_target}
                  onChange={(e) => setFeatures(prev => ({ ...prev, home_shots_on_target: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Away Shots on Target</label>
                <input
                  type="number"
                  value={features.away_shots_on_target}
                  onChange={(e) => setFeatures(prev => ({ ...prev, away_shots_on_target: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Home Form (0-1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={features.home_form}
                  onChange={(e) => setFeatures(prev => ({ ...prev, home_form: parseFloat(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Away Form (0-1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={features.away_form}
                  onChange={(e) => setFeatures(prev => ({ ...prev, away_form: parseFloat(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium">H2H Home Wins</label>
                <input
                  type="number"
                  value={features.h2h_home_wins}
                  onChange={(e) => setFeatures(prev => ({ ...prev, h2h_home_wins: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              These features are used to calculate the prediction. Default values are based on average statistics.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}