import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST() {
  try {
    // Start the enhanced training script
    const scriptPath = path.join(process.cwd(), '..', 'enhanced_train.py')
    
    const pythonProcess = spawn('python3', [scriptPath], {
      cwd: path.join(process.cwd(), '..'),
      env: { ...process.env }
    })

    // Store process ID for tracking
    const processId = pythonProcess.pid
    
    // Collect output
    let output = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
      console.log(`Enhanced Training: ${data}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
      console.error(`Training error: ${data}`)
    })

    pythonProcess.on('close', (code) => {
      console.log(`Enhanced training completed with code ${code}`)
      
      // Check if 70% accuracy was achieved
      const accuracyMatch = output.match(/Best Accuracy: (\d+\.\d+)%/)
      if (accuracyMatch) {
        const accuracy = parseFloat(accuracyMatch[1])
        if (accuracy >= 70) {
          console.log(`🎉 TARGET ACHIEVED: ${accuracy}%`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Enhanced training started - targeting 70%+ accuracy',
      processId,
      features: [
        'StatsBomb shots on target (14.2%)',
        'Understat xG metrics (8.5%)',
        'FBref advanced stats (4.5%)',
        'Home advantage (13.5%)',
        'Recent form with temporal decay (11%)',
        'Team strength (9%)',
        'Head-to-head history (6%)'
      ]
    })
  } catch (error) {
    console.error('Failed to start enhanced training:', error)
    return NextResponse.json(
      { error: 'Failed to start enhanced training' },
      { status: 500 }
    )
  }
}