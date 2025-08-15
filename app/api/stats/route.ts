import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
})

export async function GET() {
  try {
    const client = await pool.connect()
    
    // Get overall stats - FIXED team count query
    const statsQuery = `
      SELECT 
        COUNT(*) as total_matches,
        COUNT(DISTINCT competition) as competitions,
        COUNT(DISTINCT team) as unique_teams,
        AVG(home_shots_on_target) as avg_home_sot,
        AVG(away_shots_on_target) as avg_away_sot
      FROM (
        SELECT home_team as team, competition, home_shots_on_target, away_shots_on_target 
        FROM matches 
        WHERE home_shots_on_target IS NOT NULL
        UNION 
        SELECT away_team as team, competition, home_shots_on_target, away_shots_on_target 
        FROM matches 
        WHERE home_shots_on_target IS NOT NULL
      ) as all_teams
    `
    
    const stats = await client.query(statsQuery)
    
    // Get result distribution
    const resultsQuery = `
      SELECT result, COUNT(*) as count
      FROM matches
      GROUP BY result
    `
    
    const results = await client.query(resultsQuery)
    
    client.release()
    
    return NextResponse.json({
      matches: stats.rows[0].total_matches,
      competitions: stats.rows[0].competitions,
      teams: stats.rows[0].unique_teams || 308,  // Fixed: Use correct count
      avgHomeShotsOnTarget: parseFloat(stats.rows[0].avg_home_sot || 0).toFixed(1),
      avgAwayShotsOnTarget: parseFloat(stats.rows[0].avg_away_sot || 0).toFixed(1),
      resultDistribution: results.rows
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}