#!/usr/bin/env python3
"""
StatsBomb Data Fetcher - Get ALL free matches with REAL shots on target
This is the most important component - shots on target = 14.2% predictive power
"""

import os
import json
import requests
import psycopg2
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require")
STATSBOMB_BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"


class StatsBombFetcher:
    """Fetch ALL available StatsBomb matches with real shots on target data."""
    
    def __init__(self):
        self.base_url = STATSBOMB_BASE_URL
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor()
        self.total_matches = 0
        self.matches_with_shots = 0
        
    def setup_database(self):
        """Create tables if they don't exist."""
        logger.info("Setting up database tables...")
        
        schema = """
        CREATE TABLE IF NOT EXISTS matches (
            id SERIAL PRIMARY KEY,
            statsbomb_id VARCHAR(50) UNIQUE,
            match_date DATE,
            competition VARCHAR(100),
            season VARCHAR(50),
            home_team VARCHAR(100),
            away_team VARCHAR(100),
            
            -- Core features
            home_shots_on_target INT,
            away_shots_on_target INT,
            
            -- Result
            home_goals INT,
            away_goals INT,
            result CHAR(1), -- H/D/A
            
            -- Additional features (calculated later)
            is_home_game BOOLEAN DEFAULT TRUE,
            home_recent_form DECIMAL(3,2),
            away_recent_form DECIMAL(3,2),
            home_elo DECIMAL(6,2) DEFAULT 1500,
            away_elo DECIMAL(6,2) DEFAULT 1500,
            h2h_home_wins INT DEFAULT 0,
            h2h_away_wins INT DEFAULT 0,
            h2h_draws INT DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
        CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(home_team, away_team);
        CREATE INDEX IF NOT EXISTS idx_matches_statsbomb ON matches(statsbomb_id);
        
        CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE,
            matches_played INT DEFAULT 0,
            elo_rating DECIMAL(6,2) DEFAULT 1500,
            market_value DECIMAL(12,2),
            last_updated TIMESTAMP DEFAULT NOW()
        );
        """
        
        self.cur.execute(schema)
        self.conn.commit()
        logger.info("✅ Database ready")
    
    def get_all_competitions(self) -> List[Dict]:
        """Get all available competitions from StatsBomb."""
        url = f"{self.base_url}/competitions.json"
        response = requests.get(url)
        competitions = response.json()
        
        # Create unique competition/season pairs
        unique_comps = {}
        for comp in competitions:
            key = f"{comp['competition_id']}_{comp['season_id']}"
            unique_comps[key] = {
                'competition_id': comp['competition_id'],
                'season_id': comp['season_id'],
                'competition_name': comp['competition_name'],
                'season_name': comp['season_name'],
                'country_name': comp.get('country_name', 'International')
            }
        
        logger.info(f"Found {len(unique_comps)} competition/season combinations")
        return list(unique_comps.values())
    
    def get_matches(self, comp_id: int, season_id: int) -> List[Dict]:
        """Get all matches for a competition/season."""
        url = f"{self.base_url}/matches/{comp_id}/{season_id}.json"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get matches for {comp_id}/{season_id}: {e}")
        return []
    
    def get_match_events(self, match_id: int) -> List[Dict]:
        """Get all events for a match."""
        url = f"{self.base_url}/events/{match_id}.json"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get events for match {match_id}: {e}")
        return []
    
    def extract_shots_data(self, events: List[Dict], team_name: str) -> Tuple[int, int]:
        """
        Extract shots on target from match events.
        This is the MOST IMPORTANT feature (14.2% predictive power).
        """
        shots_on_target = 0
        total_shots = 0
        
        for event in events:
            if event.get('type', {}).get('name') == 'Shot':
                if event.get('team', {}).get('name') == team_name:
                    total_shots += 1
                    
                    # Check if shot was on target
                    outcome = event.get('shot', {}).get('outcome', {}).get('name', '')
                    
                    # On target includes: Goal, Saved, Saved to Corner
                    if outcome in ['Goal', 'Saved', 'Saved To Corner']:
                        shots_on_target += 1
        
        return shots_on_target, total_shots
    
    def fetch_all_matches(self, limit: Optional[int] = None):
        """
        Fetch ALL available matches from StatsBomb.
        This should get us 3500+ matches with real shots data.
        """
        logger.info("📡 Fetching ALL StatsBomb matches...")
        logger.info("This will take several minutes but gives us REAL shots on target data")
        
        competitions = self.get_all_competitions()
        matches_processed = 0
        
        for i, comp in enumerate(competitions):
            comp_id = comp['competition_id']
            season_id = comp['season_id']
            comp_name = comp['competition_name']
            season_name = comp['season_name']
            
            # Skip if we want to limit
            if limit and matches_processed >= limit:
                break
            
            # Get all matches for this competition/season
            matches = self.get_matches(comp_id, season_id)
            
            if not matches:
                continue
            
            logger.info(f"[{i+1}/{len(competitions)}] {comp_name} - {season_name}: {len(matches)} matches")
            
            for match in matches:
                if limit and matches_processed >= limit:
                    break
                
                match_id = match['match_id']
                
                # Check if already processed
                self.cur.execute(
                    "SELECT 1 FROM matches WHERE statsbomb_id = %s",
                    (str(match_id),)
                )
                if self.cur.fetchone():
                    continue
                
                # Extract match data
                home_team = match['home_team']['home_team_name']
                away_team = match['away_team']['away_team_name']
                home_score = match['home_score']
                away_score = match['away_score']
                match_date = match['match_date']
                
                # Get events to extract shots (MOST IMPORTANT!)
                events = self.get_match_events(match_id)
                
                if not events:
                    continue  # Skip if no event data
                
                # Extract REAL shots on target
                home_shots_on_target, home_total_shots = self.extract_shots_data(events, home_team)
                away_shots_on_target, away_total_shots = self.extract_shots_data(events, away_team)
                
                # Determine result
                if home_score > away_score:
                    result = 'H'
                elif away_score > home_score:
                    result = 'A'
                else:
                    result = 'D'
                
                # Store in database
                try:
                    self.cur.execute("""
                        INSERT INTO matches (
                            statsbomb_id, match_date, competition, season,
                            home_team, away_team,
                            home_shots_on_target, away_shots_on_target,
                            home_goals, away_goals, result
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (statsbomb_id) DO NOTHING
                    """, (
                        str(match_id), match_date, comp_name, season_name,
                        home_team, away_team,
                        home_shots_on_target, away_shots_on_target,
                        home_score, away_score, result
                    ))
                    
                    self.total_matches += 1
                    self.matches_with_shots += 1
                    matches_processed += 1
                    
                    # Commit every 50 matches
                    if self.total_matches % 50 == 0:
                        self.conn.commit()
                        logger.info(f"  ✓ Processed {self.total_matches} matches with shots data...")
                    
                except Exception as e:
                    logger.error(f"Failed to store match {match_id}: {e}")
                    self.conn.rollback()
            
            # Be nice to GitHub servers
            time.sleep(0.5)
        
        self.conn.commit()
        logger.info(f"\n✅ Complete! Fetched {self.total_matches} matches with REAL shots on target data!")
    
    def update_teams(self):
        """Update team statistics."""
        logger.info("Updating team statistics...")
        
        # Get all unique teams
        self.cur.execute("""
            SELECT DISTINCT home_team FROM matches
            UNION
            SELECT DISTINCT away_team FROM matches
        """)
        teams = [row[0] for row in self.cur.fetchall()]
        
        for team in teams:
            # Calculate matches played
            self.cur.execute("""
                SELECT COUNT(*) FROM matches 
                WHERE home_team = %s OR away_team = %s
            """, (team, team))
            matches_played = self.cur.fetchone()[0]
            
            # Insert or update team
            self.cur.execute("""
                INSERT INTO teams (name, elo_rating)
                VALUES (%s, 1500)
                ON CONFLICT (name) DO UPDATE
                SET elo_rating = teams.elo_rating,
                    last_updated = NOW()
            """, (team,))
        
        self.conn.commit()
        logger.info(f"✅ Updated {len(teams)} teams")
    
    def show_statistics(self):
        """Display comprehensive statistics."""
        logger.info("\n" + "="*60)
        logger.info("📊 STATSBOMB DATA STATISTICS")
        logger.info("="*60)
        
        # Overall stats
        self.cur.execute("""
            SELECT 
                COUNT(*) as total_matches,
                COUNT(DISTINCT competition) as competitions,
                COUNT(DISTINCT home_team) + COUNT(DISTINCT away_team) as team_mentions,
                MIN(match_date) as earliest_match,
                MAX(match_date) as latest_match
            FROM matches
            WHERE match_date IS NOT NULL
        """)
        stats = self.cur.fetchone()
        
        logger.info(f"Total matches: {stats[0]:,}")
        logger.info(f"Competitions: {stats[1]}")
        logger.info(f"Teams: {stats[2]//2}")
        logger.info(f"Date range: {stats[3]} to {stats[4]}")
        
        # Shots on target stats (THE KEY FEATURE!)
        self.cur.execute("""
            SELECT 
                AVG(home_shots_on_target) as avg_home_sot,
                AVG(away_shots_on_target) as avg_away_sot,
                MAX(home_shots_on_target) as max_home_sot,
                MAX(away_shots_on_target) as max_away_sot
            FROM matches
            WHERE home_shots_on_target IS NOT NULL
        """)
        shots = self.cur.fetchone()
        
        logger.info(f"\n🎯 SHOTS ON TARGET (14.2% predictive power):")
        logger.info(f"  Home average: {shots[0]:.1f}")
        logger.info(f"  Away average: {shots[1]:.1f}")
        logger.info(f"  Home maximum: {shots[2]}")
        logger.info(f"  Away maximum: {shots[3]}")
        
        # Result distribution
        self.cur.execute("""
            SELECT 
                result,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM matches
            GROUP BY result
            ORDER BY result
        """)
        results = self.cur.fetchall()
        
        logger.info(f"\n📈 RESULT DISTRIBUTION:")
        for result, count, pct in results:
            outcome = {'H': 'Home', 'D': 'Draw', 'A': 'Away'}.get(result, result)
            logger.info(f"  {outcome}: {count:,} ({pct}%)")
        
        # Top competitions by matches
        self.cur.execute("""
            SELECT competition, COUNT(*) as matches
            FROM matches
            GROUP BY competition
            ORDER BY matches DESC
            LIMIT 5
        """)
        comps = self.cur.fetchall()
        
        logger.info(f"\n🏆 TOP COMPETITIONS:")
        for comp, count in comps:
            logger.info(f"  {comp}: {count:,} matches")
        
        logger.info("\n" + "="*60)
        logger.info("Ready to train model with REAL shots on target data!")
        logger.info("="*60)
    
    def close(self):
        """Close database connection."""
        self.cur.close()
        self.conn.close()


def main():
    """Main function to fetch all StatsBomb data."""
    import sys
    
    fetcher = StatsBombFetcher()
    
    try:
        # Setup database
        fetcher.setup_database()
        
        # Check for setup-only flag
        if "--setup-only" in sys.argv:
            logger.info("Database setup complete. Exiting.")
            return
        
        # Check for limit flag
        limit = None
        if "--limit" in sys.argv:
            idx = sys.argv.index("--limit")
            if idx + 1 < len(sys.argv):
                limit = int(sys.argv[idx + 1])
                logger.info(f"Limiting to {limit} matches for testing")
        
        # Fetch all matches (or limit for testing)
        fetcher.fetch_all_matches(limit=limit)
        
        # Update team statistics
        fetcher.update_teams()
        
        # Show statistics
        fetcher.show_statistics()
        
    except KeyboardInterrupt:
        logger.info("\n⚠️ Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        fetcher.close()


if __name__ == "__main__":
    main()