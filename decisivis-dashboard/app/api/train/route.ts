import { NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-d74c1.up.railway.app'

export async function POST() {
  try {
    // Call the Railway Python API
    const response = await fetch(`${PYTHON_API_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual' })
    })
    
    if (!response.ok) {
      throw new Error(`Training API returned ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Training API error:', error)
    return NextResponse.json(
      { error: 'Training failed', details: error.message },
      { status: 500 }
    )
  }
}
