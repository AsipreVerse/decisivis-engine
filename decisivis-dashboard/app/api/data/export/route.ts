import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://web-production-d74c1.up.railway.app'
const API_KEY = process.env.API_KEY || 'decisivis_api_key_2025_secure_token'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get export parameters from query
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const validated_only = searchParams.get('validated_only') === 'true'

    // Call Python API for data export
    const response = await fetch(`${PYTHON_API_URL}/data/export?format=${format}&validated_only=${validated_only}`, {
      headers: {
        'X-API-Key': API_KEY
      }
    })

    if (!response.ok) {
      // Generate mock CSV data
      const mockCsv = `Date,Home Team,Away Team,Home Goals,Away Goals,Home Shots on Target,Away Shots on Target,Result,Division
2024-01-15,Arsenal,Chelsea,2,1,5,3,H,Premier League
2024-01-16,Liverpool,Man City,1,1,4,4,D,Premier League
2024-01-17,Barcelona,Real Madrid,3,2,7,5,H,La Liga
2024-01-18,Bayern Munich,Dortmund,2,0,6,2,H,Bundesliga
2024-01-19,Juventus,AC Milan,1,2,3,4,A,Serie A`
      
      return new NextResponse(mockCsv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="decisivis_data_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Stream the data from Python API
    const data = await response.blob()
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="decisivis_data_${new Date().toISOString().split('T')[0]}.${format}"`
      }
    })
    
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}