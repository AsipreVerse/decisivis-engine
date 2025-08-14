'use client'

import { useState } from 'react'
import { Trophy, ArrowRight } from 'lucide-react'

export default function PredictionDemo() {
  const [homeTeam, setHomeTeam] = useState('Barcelona')
  const [awayTeam, setAwayTeam] = useState('Real Madrid')
  const [prediction, setPrediction] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const teams = [
    'Barcelona', 'Real Madrid', 'Bayern Munich', 'Liverpool',
    'Manchester City', 'PSG', 'Chelsea', 'Arsenal',
    'Juventus', 'AC Milan', 'Inter Milan', 'Atletico Madrid'
  ]

  const makePrediction = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: homeTeam,
          away_team: awayTeam,
          date: new Date().toISOString().split('T')[0]
        })
      })
      
      const data = await response.json()
      setPrediction(data)
    } catch (error) {
      console.error('Prediction failed:', error)
      // Mock prediction for demo
      setPrediction({
        prediction: 'H',
        confidence: 0.67,
        probabilities: {
          home: 0.67,
          draw: 0.21,
          away: 0.12
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Trophy className="mr-2 h-5 w-5" />
        Prediction Demo
      </h2>

      <div className="space-y-4">
        {/* Team Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Home Team</label>
            <select
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {teams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Away Team</label>
            <select
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {teams.filter(t => t !== homeTeam).map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Predict Button */}
        <button
          onClick={makePrediction}
          disabled={loading}
          className="w-full btn-secondary flex items-center justify-center"
        >
          {loading ? (
            <span>Analyzing...</span>
          ) : (
            <>
              Make Prediction
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>

        {/* Prediction Result */}
        {prediction && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Prediction Result</h3>
            
            {/* Winner */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-3">
              <p className="text-sm text-gray-600 mb-1">Predicted Winner</p>
              <p className="text-2xl font-bold">
                {prediction.prediction === 'H' ? homeTeam :
                 prediction.prediction === 'A' ? awayTeam : 'Draw'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Confidence: {(prediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
            
            {/* Probability Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{homeTeam} (Home)</span>
                  <span className="text-sm font-semibold">
                    {(prediction.probabilities.home * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: `${prediction.probabilities.home * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Draw</span>
                  <span className="text-sm font-semibold">
                    {(prediction.probabilities.draw * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gray-500"
                    style={{ width: `${prediction.probabilities.draw * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{awayTeam} (Away)</span>
                  <span className="text-sm font-semibold">
                    {(prediction.probabilities.away * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${prediction.probabilities.away * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}