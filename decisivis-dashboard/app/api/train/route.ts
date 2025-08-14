import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-d74c1.up.railway.app'
const API_KEY = process.env.API_KEY || 'decisivis_api_key_2025_secure_token'

// Rate limiting - simple in-memory store
const trainingRequests = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = trainingRequests.get(userId)
  
  if (!userRequests || now - userRequests > RATE_LIMIT_WINDOW) {
    trainingRequests.set(userId, now)
    return true
  }
  
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const userId = session.user?.email || 'anonymous'
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before training again.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Call Python API to trigger training
    const response = await fetch(`${PYTHON_API_URL}/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        trigger: body.trigger || 'manual',
        config: body.config || {}
      })
    })

    if (!response.ok) {
      throw new Error('Training failed')
    }

    const result = await response.json()
    
    return NextResponse.json({
      status: 'success',
      accuracy: result.accuracy,
      message: result.message,
      details: result
    })
  } catch (error) {
    console.error('Training error:', error)
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get training status from Railway API
    const response = await fetch(`${PYTHON_API_URL}/training/status`, {
      headers: {
        'X-API-Key': API_KEY
      }
    })

    if (!response.ok) {
      // Return default status if API is unavailable
      return NextResponse.json({
        status: 'idle',
        message: 'Training service unavailable',
        last_training: null
      })
    }

    const status = await response.json()
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    )
  }
}