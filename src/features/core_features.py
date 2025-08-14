#!/usr/bin/env python3
"""
Core Features Extraction - The 5 features that provide 53.7% predictive power
Following the 80/20 principle: maximum accuracy with minimum complexity
"""

import os
import psycopg2
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require")


class CoreFeatureExtractor:
    """Extract the 5 features that matter for 70%+ accuracy."""
    
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor()
        self.temporal_weights = [2.0, 1.5, 1.0, 1.0, 1.0]  # Recent matches weighted more
        
    def extract_features(self, home_team: str, away_team: str, date: str) -> Dict:
        """
        Extract all 5 core features for a match prediction.
        
        Returns:
            Dict with all features and metadata
        """
        match_date = datetime.strptime(date, "%Y-%m-%d")
        
        # 1. SHOTS ON TARGET (14.2% importance) - Average from recent matches
        home_shots_avg, away_shots_avg = self.get_shots_on_target_averages(
            home_team, away_team, match_date
        )
        
        # 2. HOME ADVANTAGE (13.5% importance) - Simple binary
        home_advantage = 1.0
        
        # 3. RECENT FORM (11% importance) - Last 5 games with temporal decay
        home_form = self.calculate_recent_form(home_team, match_date)
        away_form = self.calculate_recent_form(away_team, match_date)
        
        # 4. TEAM STRENGTH (9% importance) - ELO rating or win rate
        home_elo = self.get_team_strength(home_team, match_date)
        away_elo = self.get_team_strength(away_team, match_date)
        
        # 5. H2H HISTORY (6% importance) - Last 3-5 meetings
        h2h_factor = self.get_h2h_factor(home_team, away_team, match_date)
        
        # Compile features
        features = {
            # Raw features
            "home_shots_on_target_avg": home_shots_avg,
            "away_shots_on_target_avg": away_shots_avg,
            "home_advantage": home_advantage,
            "home_recent_form": home_form,
            "away_recent_form": away_form,
            "home_elo": home_elo,
            "away_elo": away_elo,
            "h2h_home_factor": h2h_factor,
            
            # Differential features (often more predictive)
            "shots_differential": home_shots_avg - away_shots_avg,
            "form_differential": home_form - away_form,
            "elo_differential": (home_elo - away_elo) / 100,
            
            # Metadata
            "home_team": home_team,
            "away_team": away_team,
            "match_date": date
        }
        
        return features
    
    def get_shots_on_target_averages(self, home_team: str, away_team: str, 
                                     match_date: datetime) -> Tuple[float, float]:
        """
        Get average shots on target from recent matches.
        This is the MOST IMPORTANT feature (14.2% predictive power).
        """
        # Get home team's recent home matches
        self.cur.execute("""
            SELECT AVG(home_shots_on_target) 
            FROM (
                SELECT home_shots_on_target 
                FROM matches 
                WHERE home_team = %s 
                    AND match_date < %s 
                    AND home_shots_on_target IS NOT NULL
                ORDER BY match_date DESC
                LIMIT 5
            ) AS recent_matches
        """, (home_team, match_date))
        
        home_avg = self.cur.fetchone()[0]
        if home_avg is None:
            # Fallback to overall average
            self.cur.execute("""
                SELECT AVG(home_shots_on_target) 
                FROM matches 
                WHERE home_shots_on_target IS NOT NULL
            """)
            home_avg = self.cur.fetchone()[0] or 5.0
        
        # Get away team's recent away matches
        self.cur.execute("""
            SELECT AVG(away_shots_on_target) 
            FROM (
                SELECT away_shots_on_target 
                FROM matches 
                WHERE away_team = %s 
                    AND match_date < %s 
                    AND away_shots_on_target IS NOT NULL
                ORDER BY match_date DESC
                LIMIT 5
            ) AS recent_matches
        """, (away_team, match_date))
        
        away_avg = self.cur.fetchone()[0]
        if away_avg is None:
            # Fallback to overall average
            self.cur.execute("""
                SELECT AVG(away_shots_on_target) 
                FROM matches 
                WHERE away_shots_on_target IS NOT NULL
            """)
            away_avg = self.cur.fetchone()[0] or 4.0
        
        return float(home_avg), float(away_avg)
    
    def calculate_recent_form(self, team: str, match_date: datetime) -> float:
        """
        Calculate recent form from last 5 games with temporal decay.
        Recent matches weighted 2x more than older ones.
        """
        # Get last 5 matches (home or away)
        self.cur.execute("""
            SELECT 
                CASE 
                    WHEN home_team = %s AND home_goals > away_goals THEN 3
                    WHEN away_team = %s AND away_goals > home_goals THEN 3
                    WHEN home_goals = away_goals THEN 1
                    ELSE 0
                END as points,
                match_date
            FROM matches
            WHERE (home_team = %s OR away_team = %s)
                AND match_date < %s
            ORDER BY match_date DESC
            LIMIT 5
        """, (team, team, team, team, match_date))
        
        results = self.cur.fetchall()
        
        if not results:
            return 0.5  # Neutral form if no history
        
        # Apply temporal decay weights
        weighted_sum = 0
        weight_sum = 0
        
        for i, (points, _) in enumerate(results):
            if i < len(self.temporal_weights):
                weight = self.temporal_weights[i]
                weighted_sum += points * weight
                weight_sum += weight
        
        # Normalize to 0-1 scale
        max_possible = weight_sum * 3  # Maximum points per game is 3
        form = weighted_sum / max_possible if max_possible > 0 else 0.5
        
        return form
    
    def get_team_strength(self, team: str, match_date: datetime) -> float:
        """
        Get team strength (ELO rating based on historical performance).
        """
        # Calculate simple ELO based on win rate
        self.cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE 
                    WHEN (home_team = %s AND home_goals > away_goals) OR 
                         (away_team = %s AND away_goals > home_goals) 
                    THEN 1 ELSE 0 
                END) as wins,
                SUM(CASE 
                    WHEN home_goals = away_goals 
                    THEN 1 ELSE 0 
                END) as draws
            FROM matches
            WHERE (home_team = %s OR away_team = %s)
                AND match_date < %s
                AND match_date > %s
        """, (team, team, team, team, match_date, match_date - timedelta(days=365)))
        
        result = self.cur.fetchone()
        
        if result and result[0] > 0:
            total, wins, draws = result
            win_rate = (wins + draws * 0.5) / total
            # Convert to ELO-like rating
            elo = 1500 + (win_rate - 0.5) * 400
        else:
            elo = 1500  # Default ELO
        
        return elo
    
    def get_h2h_factor(self, home_team: str, away_team: str, match_date: datetime) -> float:
        """
        Get head-to-head factor from last 3-5 meetings.
        Returns home team's win rate in recent H2H matches.
        """
        self.cur.execute("""
            SELECT 
                CASE 
                    WHEN home_goals > away_goals THEN 1.0
                    WHEN home_goals = away_goals THEN 0.5
                    ELSE 0.0
                END as home_points
            FROM matches
            WHERE home_team = %s AND away_team = %s
                AND match_date < %s
            ORDER BY match_date DESC
            LIMIT 5
        """, (home_team, away_team, match_date))
        
        h2h_results = [row[0] for row in self.cur.fetchall()]
        
        # Also check reverse fixtures
        self.cur.execute("""
            SELECT 
                CASE 
                    WHEN away_goals > home_goals THEN 1.0
                    WHEN home_goals = away_goals THEN 0.5
                    ELSE 0.0
                END as away_points
            FROM matches
            WHERE home_team = %s AND away_team = %s
                AND match_date < %s
            ORDER BY match_date DESC
            LIMIT 5
        """, (away_team, home_team, match_date))
        
        h2h_results.extend([row[0] for row in self.cur.fetchall()])
        
        if not h2h_results:
            return 0.5  # Neutral if no H2H history
        
        # Take only the 5 most recent H2H matches
        h2h_results = h2h_results[:5]
        
        return np.mean(h2h_results)
    
    def prepare_training_data(self, limit: Optional[int] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare all historical data for model training.
        Returns X (features) and y (labels).
        """
        # Get all matches with shots data
        query = """
            SELECT 
                home_team, away_team, match_date, 
                home_shots_on_target, away_shots_on_target,
                home_goals, away_goals, result
            FROM matches
            WHERE home_shots_on_target IS NOT NULL
            ORDER BY match_date
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        self.cur.execute(query)
        matches = self.cur.fetchall()
        
        logger.info(f"Preparing features for {len(matches)} matches...")
        
        X = []
        y = []
        
        for i, match in enumerate(matches):
            home_team, away_team, match_date, home_sot, away_sot, home_goals, away_goals, result = match
            
            # Skip early matches (need history for features)
            if i < 10:
                continue
            
            # Extract features for this match
            features = self.extract_features(
                home_team, 
                away_team, 
                match_date.strftime("%Y-%m-%d")
            )
            
            # Create feature vector (7 features as per research)
            feature_vector = [
                features["home_shots_on_target_avg"],
                features["away_shots_on_target_avg"],
                features["shots_differential"],
                features["home_advantage"],
                features["form_differential"],
                features["elo_differential"],
                features["h2h_home_factor"]
            ]
            
            X.append(feature_vector)
            
            # Label encoding: H=2, D=1, A=0
            if result == 'H':
                y.append(2)
            elif result == 'D':
                y.append(1)
            else:
                y.append(0)
            
            if (i + 1) % 100 == 0:
                logger.info(f"  Processed {i + 1}/{len(matches)} matches...")
        
        X = np.array(X)
        y = np.array(y)
        
        logger.info(f"✅ Prepared {len(X)} training samples with {X.shape[1]} features")
        
        return X, y
    
    def get_feature_names(self) -> List[str]:
        """Get names of all features for model interpretation."""
        return [
            "home_shots_on_target_avg",
            "away_shots_on_target_avg", 
            "shots_differential",
            "home_advantage",
            "form_differential",
            "elo_differential",
            "h2h_home_factor"
        ]
    
    def close(self):
        """Close database connection."""
        self.cur.close()
        self.conn.close()


def main():
    """Test feature extraction."""
    extractor = CoreFeatureExtractor()
    
    try:
        # Test on a specific match
        features = extractor.extract_features(
            "Bayern Munich",
            "Borussia Dortmund", 
            "2024-12-15"
        )
        
        logger.info("Sample features extracted:")
        for key, value in features.items():
            if isinstance(value, float):
                logger.info(f"  {key}: {value:.2f}")
            else:
                logger.info(f"  {key}: {value}")
        
        # Prepare training data
        X, y = extractor.prepare_training_data(limit=100)
        logger.info(f"\nTraining data shape: X={X.shape}, y={y.shape}")
        logger.info(f"Label distribution: H={np.sum(y==2)}, D={np.sum(y==1)}, A={np.sum(y==0)}")
        
    finally:
        extractor.close()


if __name__ == "__main__":
    main()