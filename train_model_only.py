#!/usr/bin/env python3
"""
Train model on already imported data
"""

import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import logging
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"


class ModelTrainer:
    """Train model on existing database data"""
    
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        self.model = LogisticRegression(
            C=0.5,
            max_iter=2000,
            class_weight='balanced',
            solver='lbfgs',
            random_state=42
        )
        self.scaler = StandardScaler()
        
    def load_data(self):
        """Load matches from database"""
        query = """
            SELECT *,
                   COALESCE(home_elo_external, home_elo_custom) as home_elo,
                   COALESCE(away_elo_external, away_elo_custom) as away_elo
            FROM matches
            ORDER BY match_date
        """
        self.cur.execute(query)
        matches = self.cur.fetchall()
        logger.info(f"Loaded {len(matches):,} matches")
        return matches
    
    def calculate_h2h(self, matches, idx, home_team, away_team, max_h2h=5):
        """Calculate head-to-head score"""
        h2h_matches = []
        for i in range(idx):
            m = matches[i]
            if (m['home_team'] == home_team and m['away_team'] == away_team) or \
               (m['home_team'] == away_team and m['away_team'] == home_team):
                h2h_matches.append(m)
                if len(h2h_matches) >= max_h2h:
                    break
        
        if not h2h_matches:
            return 0.5
        
        home_points = 0
        for m in h2h_matches:
            if m['home_team'] == home_team:
                home_points += 1.0 if m['result'] == 'H' else 0.5 if m['result'] == 'D' else 0.0
            else:
                home_points += 1.0 if m['result'] == 'A' else 0.5 if m['result'] == 'D' else 0.0
        
        return home_points / len(h2h_matches)
    
    def extract_features(self, matches):
        """Extract features with NaN handling"""
        X = []
        y = []
        skipped = 0
        
        for idx, match in enumerate(matches):
            if idx < 10:  # Need history
                continue
            
            try:
                # Validate essential fields
                if not all([
                    match['home_shots_on_target'] is not None,
                    match['away_shots_on_target'] is not None,
                    match['home_elo'] is not None,
                    match['away_elo'] is not None,
                    match['result'] is not None
                ]):
                    skipped += 1
                    continue
                
                # 1. Shots on target
                shot_diff = float(match['home_shots_on_target']) - float(match['away_shots_on_target'])
                shot_ratio = float(match['home_shots_on_target']) / max(float(match['away_shots_on_target']), 1.0)
                
                # 2. Elo difference  
                elo_diff = float(match['home_elo']) - float(match['away_elo'])
                elo_prob = 1 / (1 + 10**(-elo_diff / 400))
                
                # 3. Form (with fallback to 0)
                form5_diff = 0.0
                form3_diff = 0.0
                if match['home_form_5'] is not None and match['away_form_5'] is not None:
                    form5_diff = float(match['home_form_5']) - float(match['away_form_5'])
                if match['home_form_3'] is not None and match['away_form_3'] is not None:
                    form3_diff = float(match['home_form_3']) - float(match['away_form_3'])
                
                # 4. Home advantage
                home_advantage = 1.0
                
                # 5. Head-to-head
                h2h_score = self.calculate_h2h(matches, idx, match['home_team'], match['away_team'])
                
                # Feature vector
                features = [
                    shot_diff,
                    shot_ratio,
                    elo_diff,
                    elo_prob,
                    form5_diff,
                    form3_diff,
                    home_advantage,
                    h2h_score,
                    # Interaction terms
                    shot_diff * elo_prob,
                    form5_diff * home_advantage,
                    elo_diff * h2h_score
                ]
                
                # Validate no NaN
                if any(np.isnan(f) if isinstance(f, (float, np.float64)) else False for f in features):
                    skipped += 1
                    continue
                
                X.append(features)
                
                # Target
                if match['result'] == 'H':
                    y.append(2)
                elif match['result'] == 'D':
                    y.append(1)
                else:
                    y.append(0)
                    
            except Exception as e:
                skipped += 1
                if skipped <= 5:
                    logger.warning(f"Skipped match {idx}: {e}")
                continue
        
        logger.info(f"Extracted {len(X)} features, skipped {skipped} matches")
        return np.array(X), np.array(y)
    
    def train(self):
        """Train and evaluate model"""
        logger.info("=" * 70)
        logger.info("TRAINING MODEL")
        logger.info("=" * 70)
        
        # Load data
        matches = self.load_data()
        
        # Extract features
        logger.info("Extracting features...")
        X, y = self.extract_features(matches)
        logger.info(f"Dataset: {len(X)} samples, {X.shape[1]} features")
        
        # Check class distribution
        unique, counts = np.unique(y, return_counts=True)
        logger.info("\nClass distribution:")
        for cls, count in zip(unique, counts):
            label = ['Away', 'Draw', 'Home'][cls]
            logger.info(f"  {label}: {count} ({count/len(y)*100:.1f}%)")
        
        # Temporal split
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        logger.info(f"\nTemporal split:")
        logger.info(f"  Train: {len(X_train)} matches")
        logger.info(f"  Test: {len(X_test)} matches")
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        logger.info("\nTraining LogisticRegression...")
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_pred = self.model.predict(X_train_scaled)
        test_pred = self.model.predict(X_test_scaled)
        
        train_acc = accuracy_score(y_train, train_pred)
        test_acc = accuracy_score(y_test, test_pred)
        
        logger.info("\n" + "=" * 70)
        logger.info("RESULTS")
        logger.info("=" * 70)
        logger.info(f"Training accuracy: {train_acc:.1%}")
        logger.info(f"Test accuracy: {test_acc:.1%}")
        logger.info(f"Overfitting gap: {train_acc - test_acc:.1%}")
        
        if train_acc - test_acc > 0.05:
            logger.warning("⚠️ Overfitting detected!")
        else:
            logger.info("✅ No significant overfitting")
        
        # Classification report
        logger.info("\nDetailed Performance:")
        print(classification_report(y_test, test_pred, 
                                   target_names=['Away', 'Draw', 'Home']))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, test_pred)
        logger.info("\nConfusion Matrix:")
        logger.info("     Predicted:")
        logger.info("       A    D    H")
        for i, row in enumerate(cm):
            label = ['A', 'D', 'H'][i]
            logger.info(f"  {label}  {row[0]:4d} {row[1]:4d} {row[2]:4d}")
        
        # High confidence predictions
        if hasattr(self.model, 'predict_proba'):
            probs = self.model.predict_proba(X_test_scaled)
            high_conf = probs.max(axis=1) > 0.6
            if high_conf.sum() > 0:
                high_conf_acc = accuracy_score(y_test[high_conf], test_pred[high_conf])
                logger.info(f"\nHigh confidence (>60%): {high_conf_acc:.1%}")
                logger.info(f"  ({high_conf.sum()} of {len(y_test)} predictions)")
        
        # Save model
        os.makedirs('models', exist_ok=True)
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'train_accuracy': train_acc,
            'test_accuracy': test_acc,
            'features': X.shape[1],
            'train_samples': len(X_train),
            'test_samples': len(X_test)
        }
        
        with open('models/optimal_model.pkl', 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info("\n" + "=" * 70)
        if test_acc >= 0.70:
            logger.info(f"🎉 SUCCESS! Achieved {test_acc:.1%} accuracy")
        elif test_acc >= 0.68:
            logger.info(f"✅ Good result: {test_acc:.1%} accuracy")
        else:
            logger.info(f"📊 Result: {test_acc:.1%} accuracy")
        logger.info("=" * 70)
        
        return test_acc
    
    def close(self):
        self.cur.close()
        self.conn.close()


if __name__ == "__main__":
    trainer = ModelTrainer()
    accuracy = trainer.train()
    trainer.close()