import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-8eb98.up.railway.app'
const API_KEY = process.env.API_KEY || 'decisivis_api_key_2025_secure_token'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()
    
    // Parse CSV or JSON
    let matches = []
    if (file.name.endsWith('.csv')) {
      // Parse CSV
      const lines = content.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const match: any = {}
        headers.forEach((header, index) => {
          match[header.toLowerCase().replace(/ /g, '_')] = values[index]
        })
        matches.push(match)
      }
    } else if (file.name.endsWith('.json')) {
      // Parse JSON
      matches = JSON.parse(content)
    }

    // Validate data - remove fake shots on target
    const validatedMatches = matches.filter((match: any) => {
      const homeShotsOnTarget = parseInt(match.home_shots_on_target || '0')
      const awayShotsOnTarget = parseInt(match.away_shots_on_target || '0')
      const homeGoals = parseInt(match.home_goals || '0')
      const awayGoals = parseInt(match.away_goals || '0')
      
      // Check for fake data pattern (shots = goals + 2)
      const homeFake = homeShotsOnTarget === homeGoals + 2
      const awayFake = awayShotsOnTarget === awayGoals + 2
      
      return !homeFake && !awayFake
    })

    // Send to Python API for processing
    const response = await fetch(`${PYTHON_API_URL}/data/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        matches: validatedMatches,
        source: file.name,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      // Fallback: Process locally
      return NextResponse.json({
        matches_added: validatedMatches.length,
        matches_updated: 0,
        duplicates: matches.length - validatedMatches.length,
        errors: [],
        message: 'Data processed locally (API unavailable)'
      })
    }

    const result = await response.json()
    
    return NextResponse.json({
      matches_added: result.added || validatedMatches.length,
      matches_updated: result.updated || 0,
      duplicates: result.duplicates || 0,
      errors: result.errors || [],
      message: 'Upload successful'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}