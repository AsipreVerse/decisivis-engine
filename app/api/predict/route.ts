import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-d74c1.up.railway.app'
const API_KEY = process.env.API_KEY || 'decisivis_api_key_2025_secure_token'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { homeTeam, awayTeam, features } = await request.json()
    
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing team information' },
        { status: 400 }
      )
    }

    // Call Python API on Railway
    const response = await fetch(`${PYTHON_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        home_team: homeTeam,
        away_team: awayTeam,
        features: features
      })
    })

    let predictions
    
    if (!response.ok) {
      // Fallback to local prediction if API is down
      console.warn('Railway API unavailable, using fallback prediction')
      predictions = generatePrediction(features)
    } else {
      // Use response from Railway API
      const data = await response.json()
      predictions = {
        result: data.prediction,
        confidence: data.confidence,
        probabilities: data.probabilities
      }
    }

    return NextResponse.json({
      prediction: predictions,
      analysis: {
        homeTeam,
        awayTeam,
        timestamp: new Date().toISOString(),
        source: response.ok ? 'railway-api' : 'fallback'
      }
    })
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'Prediction failed' },
      { status: 500 }
    )
  }
}

function generatePrediction(features: any) {
  // Simple prediction logic based on features
  // In production, this would call the actual ML model
  
  const shotDiff = features.home_shots_on_target - features.away_shots_on_target
  const eloDiff = features.home_elo - features.away_elo
  const formDiff = features.home_form - features.away_form
  
  // Calculate base probabilities
  let homeProb = 0.43 // Base home advantage
  let drawProb = 0.26
  let awayProb = 0.31
  
  // Adjust based on features
  if (shotDiff > 2) homeProb += 0.15
  if (shotDiff < -2) awayProb += 0.15
  
  if (eloDiff > 100) homeProb += 0.10
  if (eloDiff < -100) awayProb += 0.10
  
  if (formDiff > 0.3) homeProb += 0.05
  if (formDiff < -0.3) awayProb += 0.05
  
  // Normalize probabilities
  const total = homeProb + drawProb + awayProb
  homeProb /= total
  drawProb /= total
  awayProb /= total
  
  // Determine result
  let result = 'H'
  let confidence = homeProb
  
  if (drawProb > homeProb && drawProb > awayProb) {
    result = 'D'
    confidence = drawProb
  } else if (awayProb > homeProb) {
    result = 'A'
    confidence = awayProb
  }
  
  return {
    result,
    confidence,
    probabilities: {
      home: homeProb,
      draw: drawProb,
      away: awayProb
    }
  }
}

export async function GET() {
  try {
    // Call Railway API stats endpoint
    const response = await fetch(`${PYTHON_API_URL}/stats`, {
      headers: {
        'X-API-Key': API_KEY
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }
    
    const stats = await response.json()
    
    return NextResponse.json({
      stats,
      message: 'Prediction service is running',
      api_status: 'connected'
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get prediction stats',
        api_status: 'disconnected'
      },
      { status: 500 }
    )
  }
}