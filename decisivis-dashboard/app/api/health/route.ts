import { NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-d74c1.up.railway.app'

export async function GET() {
  try {
    // Check Railway Python API health
    const response = await fetch(`${PYTHON_API_URL}/health`)
    
    if (!response.ok) {
      throw new Error(`Railway API returned ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json({
      status: 'connected',
      railwayApi: data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Railway API error:', error)
    return NextResponse.json({
      status: 'error',
      error: error.message,
      railwayUrl: PYTHON_API_URL,
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}