'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Database,
  Activity
} from 'lucide-react'

interface TrainingProgress {
  status: 'idle' | 'preparing' | 'training' | 'evaluating' | 'completed' | 'error'
  epoch: number
  totalEpochs: number
  accuracy: number
  loss: number
  timeElapsed: number
  estimatedTimeRemaining: number
  message: string
}

export default function TrainingPage() {
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState<TrainingProgress>({
    status: 'idle',
    epoch: 0,
    totalEpochs: 100,
    accuracy: 0,
    loss: 1.0,
    timeElapsed: 0,
    estimatedTimeRemaining: 0,
    message: 'Ready to start training'
  })

  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 100,
    learningRate: 0.001,
    batchSize: 32,
    trainTestSplit: 0.8,
    regularization: 0.5,
    dateRange: 'last_3_years',
    leagues: 'all'
  })

  const [trainingData, setTrainingData] = useState({
    totalMatches: 16102,
    trainingMatches: 12882,
    testMatches: 3220,
    features: 50,
    modelType: 'LogisticRegression'
  })

  const startTraining = async () => {
    setIsTraining(true)
    setProgress(prev => ({ ...prev, status: 'preparing', message: 'Initializing training...' }))

    try {
      // Start training via API
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingConfig)
      })

      if (!response.ok) {
        throw new Error('Failed to start training')
      }

      // Connect to SSE for real-time progress
      const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://web-production-8eb98.up.railway.app'}/training/progress`)
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setProgress(prev => ({
          ...prev,
          status: data.status || prev.status,
          epoch: data.epoch || prev.epoch,
          totalEpochs: data.total_epochs || prev.totalEpochs,
          accuracy: data.accuracy || prev.accuracy,
          loss: data.loss || prev.loss,
          message: data.message || prev.message,
          timeElapsed: prev.timeElapsed + 1,
          estimatedTimeRemaining: Math.max(0, (data.total_epochs - data.epoch) * 2)
        }))

        // Close connection if training completed or failed
        if (data.status === 'completed' || data.status === 'error') {
          eventSource.close()
          setIsTraining(false)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        eventSource.close()
        setProgress(prev => ({
          ...prev,
          status: 'error',
          message: 'Lost connection to training server'
        }))
        setIsTraining(false)
      }

      // Store event source for cleanup
      (window as any).trainingEventSource = eventSource

    } catch (error) {
      console.error('Training error:', error)
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: 'Training failed. Please check logs.'
      }))
      setIsTraining(false)
    }
  }

  const stopTraining = () => {
    // Close SSE connection if exists
    if ((window as any).trainingEventSource) {
      (window as any).trainingEventSource.close()
      delete (window as any).trainingEventSource
    }
    
    setIsTraining(false)
    setProgress(prev => ({
      ...prev,
      status: 'idle',
      message: 'Training stopped by user'
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-blue-600" />
                Model Training Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Train your football prediction model with real data
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Accuracy</p>
              <p className="text-2xl font-bold text-blue-600">53.3%</p>
              <p className="text-xs text-gray-500">Target: 70%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Training Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Training Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Epochs</label>
                <input
                  type="number"
                  value={trainingConfig.epochs}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  disabled={isTraining}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Learning Rate</label>
                <input
                  type="number"
                  step="0.001"
                  value={trainingConfig.learningRate}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  disabled={isTraining}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Regularization (C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={trainingConfig.regularization}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, regularization: parseFloat(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  disabled={isTraining}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Train/Test Split</label>
                <select
                  value={trainingConfig.trainTestSplit}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, trainTestSplit: parseFloat(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  disabled={isTraining}
                >
                  <option value="0.7">70/30</option>
                  <option value="0.8">80/20</option>
                  <option value="0.9">90/10</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Data Range</label>
                <select
                  value={trainingConfig.dateRange}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  disabled={isTraining}
                >
                  <option value="last_year">Last Year</option>
                  <option value="last_2_years">Last 2 Years</option>
                  <option value="last_3_years">Last 3 Years</option>
                  <option value="all">All Available</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Training Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Alert */}
              <Alert className={
                progress.status === 'completed' ? 'border-green-200 bg-green-50' :
                progress.status === 'error' ? 'border-red-200 bg-red-50' :
                progress.status === 'training' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200'
              }>
                <AlertDescription className="flex items-center gap-2">
                  {progress.status === 'training' && <Activity className="h-4 w-4 animate-pulse" />}
                  {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {progress.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {progress.message}
                </AlertDescription>
              </Alert>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Epoch Progress</span>
                    <span>{progress.epoch}/{progress.totalEpochs}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.epoch / progress.totalEpochs) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Accuracy</span>
                    <span>{(progress.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress.accuracy * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Loss</span>
                    <span>{progress.loss.toFixed(3)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${(1 - progress.loss) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Database className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-xs text-gray-600">Training Data</p>
                  <p className="font-bold">{trainingData.trainingMatches.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-xs text-gray-600">Features</p>
                  <p className="font-bold">{trainingData.features}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-xs text-gray-600">Time Elapsed</p>
                  <p className="font-bold">{progress.timeElapsed.toFixed(0)}s</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Activity className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-xs text-gray-600">Model Type</p>
                  <p className="font-bold text-xs">{trainingData.modelType}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-4 pt-4">
                {!isTraining ? (
                  <button
                    onClick={startTraining}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Training
                  </button>
                ) : (
                  <button
                    onClick={stopTraining}
                    className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Stop Training
                  </button>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Training Data:</strong> The model will train on {trainingData.totalMatches.toLocaleString()} quality-verified matches from 21 leagues. 
                  All data has been validated to remove fake shots on target data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}