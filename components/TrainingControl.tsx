'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RefreshCw, Zap } from 'lucide-react'

interface TrainingControlProps {
  onTrainingComplete?: () => void
}

export default function TrainingControl({ onTrainingComplete }: TrainingControlProps) {
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [trainingMode, setTrainingMode] = useState<'basic' | 'enhanced'>('basic')

  const startTraining = async (mode: 'basic' | 'enhanced' = 'basic') => {
    setIsTraining(true)
    setProgress(0)
    setLogs([])
    setTrainingMode(mode)
    setCurrentPhase(mode === 'enhanced' ? 'Initializing enhanced pipeline...' : 'Initializing...')

    try {
      // Start training via API
      const endpoint = mode === 'enhanced' ? '/api/train-enhanced' : '/api/train'
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to start training')
      }

      // Connect to SSE for progress updates
      const es = new EventSource('/api/train/progress')
      setEventSource(es)

      es.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.progress) {
          setProgress(data.progress)
        }
        
        if (data.phase) {
          setCurrentPhase(data.phase)
        }
        
        if (data.log) {
          setLogs((prev) => [...prev, data.log])
        }
        
        if (data.complete) {
          setIsTraining(false)
          es.close()
          if (onTrainingComplete) {
            onTrainingComplete()
          }
        }
      }

      es.onerror = (error) => {
        console.error('SSE Error:', error)
        setIsTraining(false)
        es.close()
      }
    } catch (error) {
      console.error('Training error:', error)
      setIsTraining(false)
      setCurrentPhase('Error occurred during training')
    }
  }

  const stopTraining = () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    setIsTraining(false)
    setCurrentPhase('Training stopped')
  }

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  // Simulate progress for demo
  useEffect(() => {
    if (isTraining && progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 2
          return next > 100 ? 100 : next
        })
        
        // Simulate phase changes
        if (progress < 20) {
          setCurrentPhase('Loading data...')
        } else if (progress < 60) {
          setCurrentPhase(`Extracting features... (${Math.floor(progress * 34.64)}/3464 matches)`)
        } else if (progress < 80) {
          setCurrentPhase('Training model...')
        } else if (progress < 95) {
          setCurrentPhase('Validating accuracy...')
        } else {
          setCurrentPhase('Saving model...')
        }
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (isTraining && progress >= 100) {
      setIsTraining(false)
      setCurrentPhase('Training complete!')
      if (onTrainingComplete) {
        onTrainingComplete()
      }
    }
  }, [isTraining, progress, onTrainingComplete])

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Zap className="mr-2 h-5 w-5" />
        Training Control
      </h2>

      <div className="space-y-4">
        {/* Control Buttons */}
        <div className="space-y-2">
          {!isTraining ? (
            <>
              <button
                onClick={() => startTraining('basic')}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Basic Training
              </button>
              
              <button
                onClick={() => startTraining('enhanced')}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all flex items-center justify-center font-semibold"
              >
                <Zap className="mr-2 h-5 w-5" />
                🚀 Enhanced Training (70%+ Target)
              </button>
            </>
          ) : (
            <button
              onClick={stopTraining}
              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <Pause className="mr-2 h-4 w-4" />
              Stop {trainingMode === 'enhanced' ? 'Enhanced' : 'Basic'} Training
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">{currentPhase}</span>
            <span className="text-sm font-bold">{Math.floor(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Training Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Dataset Size</p>
            <p className="font-semibold">3,464 matches</p>
          </div>
          <div>
            <p className="text-gray-600">Features</p>
            <p className="font-semibold">{trainingMode === 'enhanced' ? '22 features' : '7 core features'}</p>
          </div>
          <div>
            <p className="text-gray-600">Model Type</p>
            <p className="font-semibold">{trainingMode === 'enhanced' ? 'Ensemble' : 'LogisticRegression'}</p>
          </div>
          <div>
            <p className="text-gray-600">Target Accuracy</p>
            <p className="font-semibold text-green-600">{trainingMode === 'enhanced' ? '70-75%' : '55-60%'}</p>
          </div>
        </div>

        {/* Optimization Options */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2 text-sm">Optimization Settings</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Use cached features</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Parallel processing</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Cross-validation (slower)</span>
            </label>
          </div>
        </div>

        {/* Training Logs */}
        {logs.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2 text-sm">Training Logs</h3>
            <div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono h-32 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}