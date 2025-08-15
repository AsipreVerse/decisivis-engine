'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  Database, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface UploadResult {
  matches_added: number
  matches_updated: number
  errors: string[]
  duplicates: number
}

export default function DataManagementPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [dataStats, setDataStats] = useState({
    total_matches: 16102,
    validated_matches: 15234,
    fake_data_removed: 868,
    leagues: 21,
    date_range: '2021-2024'
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setIsUploading(true)
    setError('')
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setUploadResult(result)
      
      // Update stats
      setDataStats(prev => ({
        ...prev,
        total_matches: prev.total_matches + result.matches_added
      }))
    } catch (err) {
      setError('Failed to upload file. Please check the format and try again.')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1
  })

  const validateData = async () => {
    setIsUploading(true)
    try {
      const response = await fetch('/api/data/validate', {
        method: 'POST'
      })
      
      const result = await response.json()
      alert(`Validation complete: ${result.valid_matches} valid matches, ${result.invalid_matches} invalid`)
    } catch (error) {
      setError('Validation failed')
    } finally {
      setIsUploading(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/data/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `decisivis_data_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (error) {
      setError('Export failed')
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
                <Database className="h-8 w-8 text-blue-600" />
                Data Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload, validate, and manage training data
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upload Match Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} disabled={isUploading} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg">Drop the file here...</p>
                ) : (
                  <>
                    <p className="text-lg mb-2">Drag & drop a CSV or JSON file here</p>
                    <p className="text-sm text-gray-500">or click to select a file</p>
                  </>
                )}
              </div>

              {isUploading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                  <span>Uploading and processing...</span>
                </div>
              )}

              {uploadResult && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Upload successful! Added {uploadResult.matches_added} matches, 
                    updated {uploadResult.matches_updated} matches.
                    {uploadResult.duplicates > 0 && ` (${uploadResult.duplicates} duplicates skipped)`}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">Required CSV Format:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Date, Home Team, Away Team, Home Goals, Away Goals</li>
                  <li>• Home Shots on Target, Away Shots on Target</li>
                  <li>• Division/League (optional)</li>
                  <li>• Referee (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Stats Section */}
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Matches</p>
                <p className="text-2xl font-bold">{dataStats.total_matches.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Validated Matches</p>
                <p className="text-2xl font-bold">{dataStats.validated_matches.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Fake Data Removed</p>
                <p className="text-2xl font-bold">{dataStats.fake_data_removed.toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Leagues</p>
                  <p className="font-bold">{dataStats.leagues}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Date Range</p>
                  <p className="font-bold text-sm">{dataStats.date_range}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Data Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={validateData}
                disabled={isUploading}
                className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Validate Data
              </button>
              
              <button
                onClick={exportData}
                className="py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </button>
              
              <button
                disabled
                className="py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Invalid Data
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Data Validation:</strong> The system automatically validates shots on target data. 
                Records where shots on target = goals + 2 are flagged as fake data and excluded from training.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}