import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { geminiClient } from '@/lib/gemini-client'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function POST(request: NextRequest) {
  try {
    const { homeTeam, awayTeam, features } = await request.json()
    
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing team information' },
        { status: 400 }
      )
    }

    // Mock prediction logic (in production, this would call the Python model)
    const predictions = generatePrediction(features)
    
    // Log prediction to database
    const client = await pool.connect()
    try {
      await client.query(
        `INSERT INTO predictions (
          home_team, away_team, predicted_result, 
          home_prob, draw_prob, away_prob, 
          confidence, model_version, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id`,
        [
          homeTeam,
          awayTeam,
          predictions.result,
          predictions.probabilities.home,
          predictions.probabilities.draw,
          predictions.probabilities.away,
          predictions.confidence,
          'v1.0.0'
        ]
      )
    } finally {
      client.release()
    }

    // Add to Gemini analysis buffer if match is completed
    if (features.actualResult) {
      geminiClient.addPrediction({
        matchId: features.matchId || 0,
        predicted: predictions.result,
        actual: features.actualResult,
        confidence: predictions.confidence,
        features: features,
        correct: predictions.result === features.actualResult
      })
    }

    return NextResponse.json({
      prediction: predictions,
      analysis: {
        homeTeam,
        awayTeam,
        timestamp: new Date().toISOString()
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
    // Get recent predictions from database
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT 
          COUNT(*) as total,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as accuracy
        FROM predictions
        WHERE created_at >= NOW() - INTERVAL '7 days'`
      )
      
      return NextResponse.json({
        stats: result.rows[0],
        message: 'Prediction service is running'
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get prediction stats' },
      { status: 500 }
    )
  }
}