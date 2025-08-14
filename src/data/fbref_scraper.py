#!/usr/bin/env python3
"""
FBref Advanced Metrics Scraper
Fetches Opta-powered advanced stats - best for minor leagues
Complements Understat with progressive passes, pressures, duels
"""

import asyncio
import aiohttp
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import time
import logging
from bs4 import BeautifulSoup
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require")

class FBrefScraper:
    """Scraper for FBref/Opta advanced metrics."""
    
    BASE_URL = "https://fbref.com"
    COMPETITIONS = {
        "Premier League": "/en/comps/9/Premier-League-Stats",
        "La Liga": "/en/comps/12/La-Liga-Stats",
        "Serie A": "/en/comps/11/Serie-A-Stats",
        "Bundesliga": "/en/comps/20/Bundesliga-Stats",
        "Ligue 1": "/en/comps/13/Ligue-1-Stats",
        "Champions League": "/en/comps/8/Champions-League-Stats",
        "Europa League": "/en/comps/19/Europa-League-Stats"
    }
    
    def __init__(self):
        self.session = None
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        self._create_tables()
    
    def _create_tables(self):
        """Create tables for FBref advanced metrics."""
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS fbref_team_stats (
                id SERIAL PRIMARY KEY,
                team VARCHAR(100),
                competition VARCHAR(50),
                season VARCHAR(10),
                matches_played INTEGER,
                
                -- Possession metrics
                possession FLOAT,
                touches INTEGER,
                touches_def_3rd INTEGER,
                touches_mid_3rd INTEGER,
                touches_att_3rd INTEGER,
                
                -- Passing metrics
                passes_completed INTEGER,
                passes_attempted INTEGER,
                pass_accuracy FLOAT,
                progressive_passes INTEGER,
                progressive_carries INTEGER,
                
                -- Defensive metrics
                pressures INTEGER,
                successful_pressures INTEGER,
                pressure_success_rate FLOAT,
                blocks INTEGER,
                interceptions INTEGER,
                tackles_won INTEGER,
                
                -- Shot creation
                sca INTEGER,  -- Shot-creating actions
                gca INTEGER,  -- Goal-creating actions
                
                -- Advanced xG
                npxg FLOAT,  -- Non-penalty xG
                xag FLOAT,   -- xG assisted
                npxg_xa FLOAT,  -- npxG + xA
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team, competition, season)
            )
        """)
        
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS fbref_player_stats (
                id SERIAL PRIMARY KEY,
                player_name VARCHAR(100),
                team VARCHAR(100),
                competition VARCHAR(50),
                season VARCHAR(10),
                position VARCHAR(20),
                age INTEGER,
                minutes_played INTEGER,
                
                -- Performance metrics
                goals INTEGER,
                assists INTEGER,
                xg FLOAT,
                xa FLOAT,
                npxg FLOAT,
                
                -- Passing
                passes_completed INTEGER,
                pass_accuracy FLOAT,
                progressive_passes INTEGER,
                key_passes INTEGER,
                
                -- Defensive
                tackles INTEGER,
                interceptions INTEGER,
                blocks INTEGER,
                clearances INTEGER,
                
                -- Physical
                aerials_won INTEGER,
                aerials_lost INTEGER,
                fouls_committed INTEGER,
                fouls_drawn INTEGER,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_name, team, competition, season)
            )
        """)
        
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS fbref_head_to_head (
                id SERIAL PRIMARY KEY,
                team1 VARCHAR(100),
                team2 VARCHAR(100),
                matches_played INTEGER,
                team1_wins INTEGER,
                draws INTEGER,
                team2_wins INTEGER,
                team1_goals INTEGER,
                team2_goals INTEGER,
                team1_xg_total FLOAT,
                team2_xg_total FLOAT,
                last_updated DATE,
                UNIQUE(team1, team2)
            )
        """)
        
        self.conn.commit()
        logger.info("✅ FBref tables created/verified")
    
    async def _fetch_page(self, url: str) -> str:
        """Fetch a page from FBref."""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # FBref rate limiting
        await asyncio.sleep(3)  # Respect their rate limits
        
        async with self.session.get(f"{self.BASE_URL}{url}") as response:
            return await response.text()
    
    async def fetch_team_stats(self, competition: str, season: str = "2024-2025") -> List[Dict]:
        """Fetch team statistics for a competition."""
        url = self.COMPETITIONS[competition]
        logger.info(f"Fetching {competition} team stats from {url}")
        
        html = await self._fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find the squad stats table
        squad_table = soup.find('table', {'id': 'stats_squads_standard_for'})
        
        if not squad_table:
            logger.warning(f"No squad table found for {competition}")
            return []
        
        teams = []
        rows = squad_table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                team_data = {
                    'team': row.find('th').text.strip(),
                    'competition': competition,
                    'season': season,
                    'matches_played': int(row.find('td', {'data-stat': 'games'}).text or 0),
                    'possession': float(row.find('td', {'data-stat': 'possession'}).text or 0),
                    'passes_completed': int(row.find('td', {'data-stat': 'passes_completed'}).text or 0),
                    'pass_accuracy': float(row.find('td', {'data-stat': 'passes_pct'}).text or 0),
                }
                
                # Get advanced stats if available
                xg_cell = row.find('td', {'data-stat': 'xg_for'})
                if xg_cell:
                    team_data['npxg'] = float(xg_cell.text or 0)
                
                teams.append(team_data)
            except Exception as e:
                logger.warning(f"Error parsing team row: {e}")
                continue
        
        logger.info(f"✅ Found {len(teams)} teams in {competition}")
        return teams
    
    async def fetch_possession_stats(self, competition_url: str) -> List[Dict]:
        """Fetch detailed possession statistics."""
        # Modify URL to get possession stats
        possession_url = competition_url.replace("Stats", "Possession-Stats")
        
        html = await self._fetch_page(possession_url)
        soup = BeautifulSoup(html, 'html.parser')
        
        possession_table = soup.find('table', {'id': 'stats_squads_possession_for'})
        
        if not possession_table:
            return []
        
        stats = []
        rows = possession_table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                team_stats = {
                    'team': row.find('th').text.strip(),
                    'touches': int(row.find('td', {'data-stat': 'touches'}).text or 0),
                    'touches_def_3rd': int(row.find('td', {'data-stat': 'touches_def_3rd'}).text or 0),
                    'touches_mid_3rd': int(row.find('td', {'data-stat': 'touches_mid_3rd'}).text or 0),
                    'touches_att_3rd': int(row.find('td', {'data-stat': 'touches_att_3rd'}).text or 0),
                    'progressive_passes': int(row.find('td', {'data-stat': 'progressive_passes'}).text or 0),
                    'progressive_carries': int(row.find('td', {'data-stat': 'progressive_carries'}).text or 0),
                }
                stats.append(team_stats)
            except Exception as e:
                continue
        
        return stats
    
    async def fetch_defensive_stats(self, competition_url: str) -> List[Dict]:
        """Fetch defensive action statistics."""
        defensive_url = competition_url.replace("Stats", "Defense-Stats")
        
        html = await self._fetch_page(defensive_url)
        soup = BeautifulSoup(html, 'html.parser')
        
        defense_table = soup.find('table', {'id': 'stats_squads_defense_for'})
        
        if not defense_table:
            return []
        
        stats = []
        rows = defense_table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                team_stats = {
                    'team': row.find('th').text.strip(),
                    'pressures': int(row.find('td', {'data-stat': 'pressures'}).text or 0),
                    'successful_pressures': int(row.find('td', {'data-stat': 'pressure_regains'}).text or 0),
                    'blocks': int(row.find('td', {'data-stat': 'blocks'}).text or 0),
                    'interceptions': int(row.find('td', {'data-stat': 'interceptions'}).text or 0),
                    'tackles_won': int(row.find('td', {'data-stat': 'tackles_won'}).text or 0),
                }
                
                # Calculate pressure success rate
                if team_stats['pressures'] > 0:
                    team_stats['pressure_success_rate'] = (
                        team_stats['successful_pressures'] / team_stats['pressures'] * 100
                    )
                else:
                    team_stats['pressure_success_rate'] = 0
                
                stats.append(team_stats)
            except Exception as e:
                continue
        
        return stats
    
    async def fetch_shot_creation(self, competition_url: str) -> List[Dict]:
        """Fetch shot and goal creation actions."""
        gca_url = competition_url.replace("Stats", "Goal-Shot-Creation-Stats")
        
        html = await self._fetch_page(gca_url)
        soup = BeautifulSoup(html, 'html.parser')
        
        gca_table = soup.find('table', {'id': 'stats_squads_gca_for'})
        
        if not gca_table:
            return []
        
        stats = []
        rows = gca_table.find('tbody').find_all('tr')
        
        for row in rows:
            try:
                team_stats = {
                    'team': row.find('th').text.strip(),
                    'sca': int(row.find('td', {'data-stat': 'sca'}).text or 0),
                    'gca': int(row.find('td', {'data-stat': 'gca'}).text or 0),
                }
                stats.append(team_stats)
            except Exception as e:
                continue
        
        return stats
    
    async def fetch_all_competition_stats(self, competition: str, season: str = "2024-2025"):
        """Fetch all available stats for a competition."""
        logger.info(f"\n📊 Fetching comprehensive stats for {competition}...")
        
        # Get base stats
        base_stats = await self.fetch_team_stats(competition, season)
        
        if not base_stats:
            return
        
        # Get additional stat categories
        competition_url = self.COMPETITIONS[competition]
        
        # Fetch advanced metrics
        possession_stats = await self.fetch_possession_stats(competition_url)
        defensive_stats = await self.fetch_defensive_stats(competition_url)
        shot_creation = await self.fetch_shot_creation(competition_url)
        
        # Merge all stats
        for team in base_stats:
            team_name = team['team']
            
            # Add possession stats
            pos_stat = next((s for s in possession_stats if s['team'] == team_name), {})
            team.update(pos_stat)
            
            # Add defensive stats
            def_stat = next((s for s in defensive_stats if s['team'] == team_name), {})
            team.update(def_stat)
            
            # Add shot creation
            shot_stat = next((s for s in shot_creation if s['team'] == team_name), {})
            team.update(shot_stat)
            
            # Save to database
            self.save_team_stats(team)
        
        logger.info(f"✅ Saved stats for {len(base_stats)} teams in {competition}")
    
    def save_team_stats(self, team_data: Dict):
        """Save team statistics to database."""
        columns = [
            'team', 'competition', 'season', 'matches_played', 'possession',
            'touches', 'touches_def_3rd', 'touches_mid_3rd', 'touches_att_3rd',
            'passes_completed', 'passes_attempted', 'pass_accuracy',
            'progressive_passes', 'progressive_carries', 'pressures',
            'successful_pressures', 'pressure_success_rate', 'blocks',
            'interceptions', 'tackles_won', 'sca', 'gca', 'npxg', 'xag', 'npxg_xa'
        ]
        
        # Filter only existing columns
        filtered_data = {k: team_data.get(k) for k in columns if k in team_data}
        
        # Build dynamic INSERT query
        cols = ', '.join(filtered_data.keys())
        vals = ', '.join([f'%({k})s' for k in filtered_data.keys()])
        update_clause = ', '.join([f"{k} = EXCLUDED.{k}" for k in filtered_data.keys()])
        
        query = f"""
            INSERT INTO fbref_team_stats ({cols})
            VALUES ({vals})
            ON CONFLICT (team, competition, season) DO UPDATE SET
            {update_clause}
        """
        
        try:
            self.cur.execute(query, filtered_data)
            self.conn.commit()
        except Exception as e:
            logger.error(f"Error saving team stats: {e}")
            self.conn.rollback()
    
    def get_advanced_features(self, home_team: str, away_team: str) -> Dict:
        """Get FBref advanced features for prediction."""
        query = """
            SELECT 
                team,
                AVG(possession) as avg_possession,
                AVG(progressive_passes) as avg_prog_passes,
                AVG(pressure_success_rate) as avg_pressure_success,
                AVG(sca) as avg_sca,
                AVG(gca) as avg_gca,
                AVG(npxg) as avg_npxg
            FROM fbref_team_stats
            WHERE team IN (%(home)s, %(away)s)
            GROUP BY team
        """
        
        self.cur.execute(query, {'home': home_team, 'away': away_team})
        results = self.cur.fetchall()
        
        features = {}
        for row in results:
            prefix = 'home_' if row['team'] == home_team else 'away_'
            features[f'{prefix}possession'] = row['avg_possession'] or 0
            features[f'{prefix}prog_passes'] = row['avg_prog_passes'] or 0
            features[f'{prefix}pressure_success'] = row['avg_pressure_success'] or 0
            features[f'{prefix}sca'] = row['avg_sca'] or 0
            features[f'{prefix}gca'] = row['avg_gca'] or 0
            features[f'{prefix}npxg'] = row['avg_npxg'] or 0
        
        return features
    
    async def close(self):
        """Clean up connections."""
        if self.session:
            await self.session.close()
        self.cur.close()
        self.conn.close()

async def main():
    """Main function to fetch FBref data."""
    scraper = FBrefScraper()
    
    try:
        # Fetch stats for major competitions
        for competition in ["Premier League", "La Liga", "Serie A"]:
            await scraper.fetch_all_competition_stats(competition)
            await asyncio.sleep(5)  # Rate limiting between competitions
        
        # Example: Get advanced features
        features = scraper.get_advanced_features("Liverpool", "Manchester City")
        logger.info(f"\nExample advanced features: {features}")
        
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())