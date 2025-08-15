'use client'

import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ModelStatus({ loading }: { loading: boolean }) {
  const accuracy = 54.6
  const targetAccuracy = 70
  const needsImprovement = accuracy < targetAccuracy

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <TrendingUp className="mr-2 h-5 w-5" />
        Model Status
      </h2>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Accuracy Meter */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Model Accuracy</span>
              <span className={`text-sm font-bold ${needsImprovement ? 'text-yellow-600' : 'text-green-600'}`}>
                {accuracy}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  needsImprovement ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${accuracy}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">0%</span>
              <span className="text-xs text-gray-500">Target: {targetAccuracy}%</span>
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </div>

          {/* Status Alert */}
          {needsImprovement ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Training Recommended
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Current accuracy is below target. With 3,464 matches available, 
                    training should improve accuracy significantly.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Model Ready
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Accuracy meets target threshold for production use.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature Importance */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">Feature Importance</h3>
            <div className="space-y-2">
              {[
                { name: 'ELO Differential', value: 18.6 },
                { name: 'Form Differential', value: 14.4 },
                { name: 'Shots Differential', value: 5.9 },
                { name: 'Home Shots on Target', value: 3.9 },
                { name: 'H2H Factor', value: 2.9 },
              ].map((feature) => (
                <div key={feature.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{feature.name}</span>
                    <span>{feature.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${feature.value * 5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confusion Matrix Summary */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">Prediction Distribution</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded p-2">
                <p className="text-xs text-gray-600">Home</p>
                <p className="font-bold text-blue-600">82%</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-600">Draw</p>
                <p className="font-bold text-gray-600">0%</p>
              </div>
              <div className="bg-green-50 rounded p-2">
                <p className="text-xs text-gray-600">Away</p>
                <p className="font-bold text-green-600">59%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}