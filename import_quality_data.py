#!/usr/bin/env python3
"""
Import Quality Football Data
Replaces fake data with 40,000+ real matches from Football-Data.co.uk
"""

import pandas as pd
import numpy as np
import psycopg2
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"

def import_quality_data():
    """Import quality football data with real shots on target."""
    
    logger.info("="*60)
    logger.info("IMPORTING QUALITY FOOTBALL DATA")
    logger.info("="*60)
    
    # Load data
    logger.info("Loading CSV data...")
    df = pd.read_csv('football-data/data/Matches.csv', low_memory=False)
    logger.info(f"Raw data: {len(df):,} matches")
    
    # QUALITY FILTERING
    logger.info("\nApplying quality filters...")
    
    # 1. Only matches with shots on target
    df_quality = df[df['HomeTarget'].notna() & df['AwayTarget'].notna()].copy()
    logger.info(f"With shots data: {len(df_quality):,}")
    
    # 2. Remove impossible data (goals > shots on target)
    df_quality = df_quality[
        (df_quality['FTHome'] <= df_quality['HomeTarget']) & 
        (df_quality['FTAway'] <= df_quality['AwayTarget'])
    ]
    logger.info(f"After removing impossible: {len(df_quality):,}")
    
    # 3. Remove estimated data (shots = goals + 2)
    df_quality = df_quality[
        ~((df_quality['HomeTarget'] == df_quality['FTHome'] + 2) | 
          (df_quality['AwayTarget'] == df_quality['FTAway'] + 2))
    ]
    logger.info(f"After removing estimated: {len(df_quality):,}")
    
    # 4. Only recent data (2015+)
    df_quality['MatchDate'] = pd.to_datetime(df_quality['MatchDate'])
    df_quality = df_quality[df_quality['MatchDate'] >= '2015-01-01']
    logger.info(f"After 2015+ filter: {len(df_quality):,}")
    
    # 5. Only leagues with sufficient data
    league_counts = df_quality.groupby('Division').size()
    good_leagues = league_counts[league_counts >= 500].index
    df_quality = df_quality[df_quality['Division'].isin(good_leagues)]
    logger.info(f"Final quality dataset: {len(df_quality):,}")
    
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Create new table
    logger.info("\nCreating new table structure...")
    cur.execute("""
        DROP TABLE IF EXISTS quality_matches CASCADE;
        
        CREATE TABLE quality_matches (
            id SERIAL PRIMARY KEY,
            division VARCHAR(10),
            match_date DATE,
            home_team VARCHAR(100),
            away_team VARCHAR(100),
            home_goals INTEGER,
            away_goals INTEGER,
            result VARCHAR(1),
            half_time_home_goals INTEGER,
            half_time_away_goals INTEGER,
            home_shots INTEGER,
            away_shots INTEGER,
            home_shots_on_target INTEGER,
            away_shots_on_target INTEGER,
            home_fouls INTEGER,
            away_fouls INTEGER,
            home_corners INTEGER,
            away_corners INTEGER,
            home_yellow INTEGER,
            away_yellow INTEGER,
            home_red INTEGER,
            away_red INTEGER,
            home_elo FLOAT,
            away_elo FLOAT,
            home_form_3 FLOAT,
            home_form_5 FLOAT,
            away_form_3 FLOAT,
            away_form_5 FLOAT,
            bet365_home_odds FLOAT,
            bet365_draw_odds FLOAT,
            bet365_away_odds FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes
    cur.execute("""
        CREATE INDEX idx_quality_date ON quality_matches(match_date);
        CREATE INDEX idx_quality_teams ON quality_matches(home_team, away_team);
        CREATE INDEX idx_quality_division ON quality_matches(division);
    """)
    
    conn.commit()
    
    # Import data
    logger.info("\nImporting matches to database...")
    
    imported = 0
    skipped = 0
    
    for _, row in df_quality.iterrows():
        try:
            # Determine result
            if row['FTHome'] > row['FTAway']:
                result = 'H'
            elif row['FTAway'] > row['FTHome']:
                result = 'A'
            else:
                result = 'D'
            
            cur.execute("""
                INSERT INTO quality_matches (
                    division, match_date, home_team, away_team,
                    home_goals, away_goals, result,
                    half_time_home_goals, half_time_away_goals,
                    home_shots, away_shots,
                    home_shots_on_target, away_shots_on_target,
                    home_fouls, away_fouls,
                    home_corners, away_corners,
                    home_yellow, away_yellow,
                    home_red, away_red,
                    home_elo, away_elo,
                    home_form_3, home_form_5,
                    away_form_3, away_form_5,
                    bet365_home_odds, bet365_draw_odds, bet365_away_odds
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
            """, (
                row['Division'], row['MatchDate'], 
                row['HomeTeam'], row['AwayTeam'],
                int(row['FTHome']) if pd.notna(row['FTHome']) else 0, 
                int(row['FTAway']) if pd.notna(row['FTAway']) else 0, 
                result,
                int(row['HTHome']) if pd.notna(row['HTHome']) else None,
                int(row['HTAway']) if pd.notna(row['HTAway']) else None,
                row['HomeShots'] if pd.notna(row['HomeShots']) else None,
                row['AwayShots'] if pd.notna(row['AwayShots']) else None,
                int(row['HomeTarget']) if pd.notna(row['HomeTarget']) else 0, 
                int(row['AwayTarget']) if pd.notna(row['AwayTarget']) else 0,
                row['HomeFouls'] if pd.notna(row['HomeFouls']) else None,
                row['AwayFouls'] if pd.notna(row['AwayFouls']) else None,
                row['HomeCorners'] if pd.notna(row['HomeCorners']) else None,
                row['AwayCorners'] if pd.notna(row['AwayCorners']) else None,
                row['HomeYellow'] if pd.notna(row['HomeYellow']) else None,
                row['AwayYellow'] if pd.notna(row['AwayYellow']) else None,
                row['HomeRed'] if pd.notna(row['HomeRed']) else None,
                row['AwayRed'] if pd.notna(row['AwayRed']) else None,
                row['HomeElo'] if pd.notna(row['HomeElo']) else None,
                row['AwayElo'] if pd.notna(row['AwayElo']) else None,
                row['Form3Home'] if pd.notna(row['Form3Home']) else None,
                row['Form5Home'] if pd.notna(row['Form5Home']) else None,
                row['Form3Away'] if pd.notna(row['Form3Away']) else None,
                row['Form5Away'] if pd.notna(row['Form5Away']) else None,
                row['B365Home'] if pd.notna(row['B365Home']) else None,
                row['B365Draw'] if pd.notna(row['B365Draw']) else None,
                row['B365Away'] if pd.notna(row['B365Away']) else None
            ))
            
            imported += 1
            
            if imported % 1000 == 0:
                conn.commit()
                logger.info(f"  Imported {imported:,} matches...")
                
        except Exception as e:
            skipped += 1
            if skipped <= 5:
                logger.warning(f"  Skipped match: {e}")
            continue
    
    conn.commit()
    
    # Final statistics
    cur.execute("SELECT COUNT(*) FROM quality_matches")
    final_count = cur.fetchone()[0]
    
    cur.execute("""
        SELECT 
            COUNT(DISTINCT division) as leagues,
            COUNT(DISTINCT home_team || ' ' || away_team) as teams,
            MIN(match_date) as earliest,
            MAX(match_date) as latest,
            SUM(CASE WHEN home_elo IS NOT NULL THEN 1 ELSE 0 END) as with_elo,
            SUM(CASE WHEN bet365_home_odds IS NOT NULL THEN 1 ELSE 0 END) as with_odds
        FROM quality_matches
    """)
    
    stats = cur.fetchone()
    
    logger.info("\n" + "="*60)
    logger.info("IMPORT COMPLETE")
    logger.info("="*60)
    logger.info(f"Total imported: {final_count:,} matches")
    logger.info(f"Skipped: {skipped:,}")
    logger.info(f"Leagues: {stats[0]}")
    logger.info(f"Teams: {stats[1]}")
    logger.info(f"Date range: {stats[2]} to {stats[3]}")
    if final_count > 0:
        logger.info(f"With Elo ratings: {stats[4] or 0:,} ({(stats[4] or 0)/final_count*100:.1f}%)")
        logger.info(f"With betting odds: {stats[5] or 0:,} ({(stats[5] or 0)/final_count*100:.1f}%)")
    logger.info("="*60)
    
    cur.close()
    conn.close()
    
    return final_count

if __name__ == "__main__":
    count = import_quality_data()
    
    if count > 30000:
        logger.info("\n✅ Successfully replaced fake data with 30,000+ real matches!")
        logger.info("🎯 Ready to train model with quality data!")