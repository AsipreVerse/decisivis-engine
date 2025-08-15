'use client'

import { useEffect, useState } from 'react'
import { Database, Users, Trophy } from 'lucide-react'

export default function DataOverview({ loading }: { loading: boolean }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data-overview')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch data overview:', error)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Database className="mr-2 h-5 w-5" />
        Data Overview
      </h2>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Total Matches</span>
            <span className="font-semibold">3,464</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Competitions</span>
            <span className="font-semibold">21</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Teams</span>
            <span className="font-semibold">2,723</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Avg Home Shots on Target</span>
            <span className="font-semibold">4.9</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Avg Away Shots on Target</span>
            <span className="font-semibold">4.0</span>
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Top Competitions</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>La Liga</span>
                <span className="text-gray-600">868 matches</span>
              </div>
              <div className="flex justify-between">
                <span>Ligue 1</span>
                <span className="text-gray-600">435 matches</span>
              </div>
              <div className="flex justify-between">
                <span>Premier League</span>
                <span className="text-gray-600">418 matches</span>
              </div>
              <div className="flex justify-between">
                <span>Serie A</span>
                <span className="text-gray-600">381 matches</span>
              </div>
              <div className="flex justify-between">
                <span>Bundesliga</span>
                <span className="text-gray-600">340 matches</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}