#!/usr/bin/env python3
"""
Enhanced Feature Engineering for 70%+ Accuracy
Temperature: 0.1 for maximum precision
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EnhancedFeatureEngineer:
    """Advanced feature engineering with exponential decay and interaction terms"""
    
    def __init__(self):
        # Exponential decay for form (more recent matches matter more)
        self.form_decay_weights = np.array([2.5, 2.0, 1.5, 1.0, 0.5])
        self.form_decay_weights = self.form_decay_weights / self.form_decay_weights.sum()
        
        # Venue-specific Elo adjustments
        self.home_elo_boost = 100  # Standard home advantage
        self.neutral_venue_factor = 0.5  # For cup finals etc.
        
        # Fatigue thresholds
        self.fatigue_threshold_days = 3
        self.fatigue_penalty = 0.05
        
    def extract_enhanced_features(self, match: Dict, history: List[Dict]) -> np.ndarray:
        """Extract enhanced feature set for improved accuracy"""
        
        features = []
        
        # 1. SHOTS ON TARGET (14.2% importance) - Enhanced
        shot_features = self._extract_shot_features(match)
        features.extend(shot_features)
        
        # 2. HOME ADVANTAGE (13.5% importance) - Enhanced
        home_features = self._extract_home_features(match, history)
        features.extend(home_features)
        
        # 3. RECENT FORM (11% importance) - Enhanced with exponential decay
        form_features = self._extract_form_features(match, history)
        features.extend(form_features)
        
        # 4. TEAM STRENGTH (9% importance) - Enhanced with venue adjustment
        strength_features = self._extract_strength_features(match, history)
        features.extend(strength_features)
        
        # 5. HEAD-TO-HEAD (6% importance) - Enhanced with recency
        h2h_features = self._extract_h2h_features(match, history)
        features.extend(h2h_features)
        
        # 6. NEW: Momentum features
        momentum_features = self._extract_momentum_features(match, history)
        features.extend(momentum_features)
        
        # 7. NEW: Fatigue features
        fatigue_features = self._extract_fatigue_features(match, history)
        features.extend(fatigue_features)
        
        # 8. NEW: Pressure index
        pressure_features = self._extract_pressure_features(match)
        features.extend(pressure_features)
        
        # 9. NEW: Advanced interaction terms
        interaction_features = self._extract_interaction_features(features)
        features.extend(interaction_features)
        
        return np.array(features)
    
    def _extract_shot_features(self, match: Dict) -> List[float]:
        """Enhanced shot features with efficiency metrics"""
        home_sot = float(match.get('home_shots_on_target', 0))
        away_sot = float(match.get('away_shots_on_target', 0))
        home_shots = float(match.get('home_shots', 1))
        away_shots = float(match.get('away_shots', 1))
        
        # Basic features
        shot_diff = home_sot - away_sot
        shot_ratio = home_sot / max(away_sot, 1.0)
        
        # Shot efficiency (shots on target / total shots)
        home_efficiency = home_sot / max(home_shots, 1.0)
        away_efficiency = away_sot / max(away_shots, 1.0)
        efficiency_diff = home_efficiency - away_efficiency
        
        # Shot dominance (percentage of total shots)
        total_sot = max(home_sot + away_sot, 1.0)
        home_sot_pct = home_sot / total_sot
        
        return [
            shot_diff,
            shot_ratio,
            home_efficiency,
            away_efficiency,
            efficiency_diff,
            home_sot_pct
        ]
    
    def _extract_home_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Enhanced home advantage features"""
        # Basic home advantage
        is_home = 1.0
        
        # Home team's home form (last 5 home games)
        home_team = match['home_team']
        home_games = [m for m in history 
                     if m['home_team'] == home_team 
                     and m['match_date'] < match['match_date']][-5:]
        
        if home_games:
            home_wins = sum(1 for m in home_games if m['result'] == 'H')
            home_form_at_home = home_wins / len(home_games)
        else:
            home_form_at_home = 0.5
        
        # Away team's away form (last 5 away games)
        away_team = match['away_team']
        away_games = [m for m in history 
                     if m['away_team'] == away_team 
                     and m['match_date'] < match['match_date']][-5:]
        
        if away_games:
            away_wins = sum(1 for m in away_games if m['result'] == 'A')
            away_form_away = away_wins / len(away_games)
        else:
            away_form_away = 0.3
        
        # Venue factor (1.0 for home, 0.5 for neutral, 0.0 for away)
        venue_factor = 1.0  # Could be adjusted for cup finals
        
        return [
            is_home,
            home_form_at_home,
            away_form_away,
            home_form_at_home - away_form_away,
            venue_factor
        ]
    
    def _extract_form_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Form features with exponential decay"""
        home_team = match['home_team']
        away_team = match['away_team']
        
        # Get recent matches with exponential weighting
        home_recent = self._get_team_matches(history, home_team, match['match_date'], 5)
        away_recent = self._get_team_matches(history, away_team, match['match_date'], 5)
        
        # Calculate weighted form
        home_form = self._calculate_weighted_form(home_recent, home_team)
        away_form = self._calculate_weighted_form(away_recent, away_team)
        
        # Form momentum (trend)
        home_momentum = self._calculate_momentum(home_recent, home_team)
        away_momentum = self._calculate_momentum(away_recent, away_team)
        
        # Goal difference form
        home_gd = self._calculate_weighted_gd(home_recent, home_team)
        away_gd = self._calculate_weighted_gd(away_recent, away_team)
        
        return [
            home_form,
            away_form,
            home_form - away_form,
            home_momentum,
            away_momentum,
            home_momentum - away_momentum,
            home_gd,
            away_gd,
            home_gd - away_gd
        ]
    
    def _extract_strength_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Team strength with venue-adjusted Elo"""
        # Get Elo ratings
        home_elo = float(match.get('home_elo_custom', 1500))
        away_elo = float(match.get('away_elo_custom', 1500))
        
        # Apply venue adjustment
        adjusted_home_elo = home_elo + self.home_elo_boost
        
        # Calculate Elo difference and probability
        elo_diff = adjusted_home_elo - away_elo
        elo_prob = 1 / (1 + 10**(-elo_diff / 400))
        
        # Elo categories (weak, medium, strong)
        home_strength_category = 1.0 if home_elo > 1600 else 0.5 if home_elo > 1400 else 0.0
        away_strength_category = 1.0 if away_elo > 1600 else 0.5 if away_elo > 1400 else 0.0
        
        return [
            elo_diff,
            elo_prob,
            home_strength_category,
            away_strength_category,
            home_strength_category - away_strength_category,
            elo_diff / 100  # Normalized Elo difference
        ]
    
    def _extract_h2h_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Head-to-head features with recency weighting"""
        home_team = match['home_team']
        away_team = match['away_team']
        
        # Get H2H matches
        h2h = [m for m in history 
               if ((m['home_team'] == home_team and m['away_team'] == away_team) or
                   (m['home_team'] == away_team and m['away_team'] == home_team))
               and m['match_date'] < match['match_date']][-5:]
        
        if not h2h:
            return [0.5, 0.5, 0.0, 0.5]
        
        # Calculate weighted H2H
        weights = self.form_decay_weights[:len(h2h)]
        weights = weights / weights.sum()
        
        home_points = 0
        total_goals_h2h = 0
        home_wins = 0
        
        for i, m in enumerate(h2h):
            weight = weights[i]
            if m['home_team'] == home_team:
                if m['result'] == 'H':
                    home_points += weight * 1.0
                    home_wins += weight
                elif m['result'] == 'D':
                    home_points += weight * 0.5
                total_goals_h2h += weight * (m['home_goals'] + m['away_goals'])
            else:
                if m['result'] == 'A':
                    home_points += weight * 1.0
                    home_wins += weight
                elif m['result'] == 'D':
                    home_points += weight * 0.5
                total_goals_h2h += weight * (m['home_goals'] + m['away_goals'])
        
        h2h_score = home_points
        avg_goals_h2h = total_goals_h2h / len(h2h)
        
        return [
            h2h_score,
            home_wins,
            avg_goals_h2h,
            float(len(h2h)) / 5  # H2H data completeness
        ]
    
    def _extract_momentum_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Momentum and trend features"""
        home_team = match['home_team']
        away_team = match['away_team']
        
        # Get last 10 matches for trend analysis
        home_matches = self._get_team_matches(history, home_team, match['match_date'], 10)
        away_matches = self._get_team_matches(history, away_team, match['match_date'], 10)
        
        # Calculate momentum (form in last 3 vs previous 3)
        if len(home_matches) >= 6:
            home_recent_form = self._calculate_points(home_matches[:3], home_team) / 9
            home_previous_form = self._calculate_points(home_matches[3:6], home_team) / 9
            home_momentum = home_recent_form - home_previous_form
        else:
            home_momentum = 0.0
        
        if len(away_matches) >= 6:
            away_recent_form = self._calculate_points(away_matches[:3], away_team) / 9
            away_previous_form = self._calculate_points(away_matches[3:6], away_team) / 9
            away_momentum = away_recent_form - away_previous_form
        else:
            away_momentum = 0.0
        
        # Win streaks
        home_streak = self._calculate_streak(home_matches, home_team)
        away_streak = self._calculate_streak(away_matches, away_team)
        
        return [
            home_momentum,
            away_momentum,
            home_momentum - away_momentum,
            home_streak,
            away_streak
        ]
    
    def _extract_fatigue_features(self, match: Dict, history: List[Dict]) -> List[float]:
        """Fatigue based on days since last match"""
        home_team = match['home_team']
        away_team = match['away_team']
        match_date = match['match_date']
        
        # Find last match for each team
        home_last = self._get_last_match(history, home_team, match_date)
        away_last = self._get_last_match(history, away_team, match_date)
        
        # Calculate days since last match
        if home_last:
            home_days = (match_date - home_last['match_date']).days
            home_fatigue = 1.0 if home_days < self.fatigue_threshold_days else 0.0
        else:
            home_days = 7
            home_fatigue = 0.0
        
        if away_last:
            away_days = (match_date - away_last['match_date']).days
            away_fatigue = 1.0 if away_days < self.fatigue_threshold_days else 0.0
        else:
            away_days = 7
            away_fatigue = 0.0
        
        # Fatigue difference (positive = home team more rested)
        fatigue_diff = away_fatigue - home_fatigue
        
        return [
            home_fatigue,
            away_fatigue,
            fatigue_diff,
            min(home_days / 7, 1.0),  # Normalized rest days
            min(away_days / 7, 1.0)
        ]
    
    def _extract_pressure_features(self, match: Dict) -> List[float]:
        """Pressure index based on fouls and cards"""
        home_fouls = float(match.get('home_fouls', 10))
        away_fouls = float(match.get('away_fouls', 10))
        home_yellow = float(match.get('home_yellow', 1))
        away_yellow = float(match.get('away_yellow', 1))
        home_red = float(match.get('home_red', 0))
        away_red = float(match.get('away_red', 0))
        
        # Pressure index (fouls + yellows*2 + reds*5)
        home_pressure = home_fouls + home_yellow * 2 + home_red * 5
        away_pressure = away_fouls + away_yellow * 2 + away_red * 5
        
        # Discipline index (cards per foul)
        home_discipline = (home_yellow + home_red * 2) / max(home_fouls, 1)
        away_discipline = (away_yellow + away_red * 2) / max(away_fouls, 1)
        
        return [
            home_pressure,
            away_pressure,
            home_pressure - away_pressure,
            home_discipline,
            away_discipline
        ]
    
    def _extract_interaction_features(self, base_features: List[float]) -> List[float]:
        """Advanced interaction terms between features"""
        # Ensure we have enough features
        if len(base_features) < 20:
            return []
        
        interactions = []
        
        # Key interactions
        shot_diff = base_features[0]
        elo_prob = base_features[21] if len(base_features) > 21 else 0.5
        home_form = base_features[10] if len(base_features) > 10 else 0.5
        momentum_diff = base_features[32] if len(base_features) > 32 else 0.0
        
        # Interaction: shots * elo probability
        interactions.append(shot_diff * elo_prob)
        
        # Interaction: form * home advantage
        interactions.append(home_form * 1.0)  # home_advantage is always 1
        
        # Interaction: momentum * elo difference
        interactions.append(momentum_diff * (elo_prob - 0.5))
        
        # Triple interaction: shots * form * elo
        interactions.append(shot_diff * home_form * elo_prob)
        
        return interactions
    
    # Helper methods
    def _get_team_matches(self, history: List[Dict], team: str, before_date, limit: int) -> List[Dict]:
        """Get team's recent matches before a date"""
        matches = [m for m in history 
                  if (m['home_team'] == team or m['away_team'] == team)
                  and m['match_date'] < before_date]
        return sorted(matches, key=lambda x: x['match_date'], reverse=True)[:limit]
    
    def _calculate_weighted_form(self, matches: List[Dict], team: str) -> float:
        """Calculate form with exponential decay weights"""
        if not matches:
            return 0.5
        
        weights = self.form_decay_weights[:len(matches)]
        weights = weights / weights.sum()
        
        points = 0
        for i, m in enumerate(matches):
            if m['home_team'] == team:
                if m['result'] == 'H':
                    points += weights[i] * 3
                elif m['result'] == 'D':
                    points += weights[i] * 1
            else:
                if m['result'] == 'A':
                    points += weights[i] * 3
                elif m['result'] == 'D':
                    points += weights[i] * 1
        
        return points / 3  # Normalize to 0-1
    
    def _calculate_momentum(self, matches: List[Dict], team: str) -> float:
        """Calculate form trend"""
        if len(matches) < 2:
            return 0.0
        
        recent_points = self._calculate_points(matches[:min(2, len(matches))], team)
        older_points = self._calculate_points(matches[min(2, len(matches)):min(4, len(matches))], team)
        
        if older_points == 0:
            return recent_points / 6
        
        return (recent_points - older_points) / 6
    
    def _calculate_weighted_gd(self, matches: List[Dict], team: str) -> float:
        """Calculate weighted goal difference"""
        if not matches:
            return 0.0
        
        weights = self.form_decay_weights[:len(matches)]
        weights = weights / weights.sum()
        
        gd = 0
        for i, m in enumerate(matches):
            if m['home_team'] == team:
                gd += weights[i] * (m['home_goals'] - m['away_goals'])
            else:
                gd += weights[i] * (m['away_goals'] - m['home_goals'])
        
        return gd
    
    def _calculate_points(self, matches: List[Dict], team: str) -> int:
        """Calculate total points for a team in matches"""
        points = 0
        for m in matches:
            if m['home_team'] == team:
                if m['result'] == 'H':
                    points += 3
                elif m['result'] == 'D':
                    points += 1
            else:
                if m['result'] == 'A':
                    points += 3
                elif m['result'] == 'D':
                    points += 1
        return points
    
    def _calculate_streak(self, matches: List[Dict], team: str) -> float:
        """Calculate current win/unbeaten streak"""
        streak = 0
        for m in matches:
            if m['home_team'] == team:
                if m['result'] == 'H':
                    streak += 1
                else:
                    break
            else:
                if m['result'] == 'A':
                    streak += 1
                else:
                    break
        return min(streak / 5, 1.0)  # Normalize to 0-1
    
    def _get_last_match(self, history: List[Dict], team: str, before_date) -> Dict:
        """Get team's last match before a date"""
        matches = [m for m in history 
                  if (m['home_team'] == team or m['away_team'] == team)
                  and m['match_date'] < before_date]
        return max(matches, key=lambda x: x['match_date']) if matches else None


if __name__ == "__main__":
    # Test enhanced features
    engineer = EnhancedFeatureEngineer()
    logger.info("Enhanced Feature Engineer initialized")
    logger.info(f"Form decay weights: {engineer.form_decay_weights}")
    logger.info(f"Home Elo boost: {engineer.home_elo_boost}")
    logger.info(f"Fatigue threshold: {engineer.fatigue_threshold_days} days")