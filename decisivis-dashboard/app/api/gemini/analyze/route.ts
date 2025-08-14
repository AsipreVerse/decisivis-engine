import { NextRequest, NextResponse } from 'next/server'
import { geminiClient } from '@/lib/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const { predictions } = await request.json()
    
    if (!predictions || !Array.isArray(predictions)) {
      return NextResponse.json(
        { error: 'Invalid predictions data' },
        { status: 400 }
      )
    }

    // Add predictions to buffer
    predictions.forEach(pred => {
      geminiClient.addPrediction(pred)
    })

    // Get current status
    const status = geminiClient.getStatus()

    // Check if analysis should be triggered
    if (status.bufferSize >= status.bufferCapacity * 0.9) {
      const analysis = await geminiClient.analyzePerformance()
      
      return NextResponse.json({
        message: 'Analysis completed',
        analysis,
        status
      })
    }

    return NextResponse.json({
      message: 'Predictions added to buffer',
      status
    })
  } catch (error) {
    console.error('Gemini analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const status = geminiClient.getStatus()
  
  return NextResponse.json({
    status,
    message: status.geminiEnabled 
      ? 'Gemini agent is active' 
      : 'Gemini API key not configured'
  })
}