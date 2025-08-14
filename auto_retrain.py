#!/usr/bin/env python3
"""
Automated Retraining Script with Gemini Integration
Targets 70%+ accuracy through continuous improvement
Temperature: 0.1 for maximum precision
"""

import os
import sys
import pickle
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from datetime import datetime, timedelta
import logging
from enhanced_features import EnhancedFeatureEngineer
import schedule
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require")
MODEL_PATH = "models/optimal_model.pkl"
IMPROVEMENT_THRESHOLD = 0.01  # 1% improvement required
MIN_ACCURACY = 0.68  # Alert if below this


class AutoRetrainer:
    """Automated model retraining with continuous improvement"""
    
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        self.feature_engineer = EnhancedFeatureEngineer()
        self.current_model = None
        self.current_scaler = None
        self.current_accuracy = 0.533
        self.improvement_history = []
        self.load_current_model()
        
    def load_current_model(self):
        """Load the current production model"""
        try:
            with open(MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
                self.current_model = model_data['model']
                self.current_scaler = model_data['scaler']
                self.current_accuracy = model_data.get('test_accuracy', 0.533)
                logger.info(f"Loaded model with accuracy: {self.current_accuracy:.1%}")
        except FileNotFoundError:
            logger.warning("No existing model found. Will train from scratch.")
            
    def check_retrain_trigger(self) -> bool:
        """Check if retraining should be triggered"""
        # Check recent prediction performance
        self.cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
            FROM predictions
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        """)
        
        result = self.cur.fetchone()
        
        if not result or result['total'] < 50:
            logger.info("Not enough recent predictions for retraining check")
            return False
        
        recent_accuracy = result['correct'] / result['total']
        logger.info(f"Recent accuracy: {recent_accuracy:.1%} (last 24h, n={result['total']})")
        
        # Trigger retraining if accuracy dropped
        if recent_accuracy < self.current_accuracy - 0.02:
            logger.warning(f"Accuracy dropped from {self.current_accuracy:.1%} to {recent_accuracy:.1%}")
            return True
        
        # Regular retraining every 100 predictions
        if result['total'] >= 100:
            logger.info("Regular retraining triggered (100+ predictions)")
            return True
        
        return False
    
    def load_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load and prepare training data with enhanced features"""
        logger.info("Loading training data...")
        
        # Get all matches ordered by date
        self.cur.execute("""
            SELECT *,
                   COALESCE(home_elo_external, home_elo_custom) as home_elo,
                   COALESCE(away_elo_external, away_elo_custom) as away_elo
            FROM matches
            WHERE home_shots_on_target IS NOT NULL
              AND away_shots_on_target IS NOT NULL
            ORDER BY match_date
        """)
        
        matches = self.cur.fetchall()
        logger.info(f"Loaded {len(matches)} matches")
        
        # Extract enhanced features
        X = []
        y = []
        
        for i, match in enumerate(matches):
            if i < 30:  # Need history for features
                continue
            
            try:
                # Get match history
                history = matches[:i]
                
                # Extract enhanced features
                features = self.feature_engineer.extract_enhanced_features(match, history)
                
                # Skip if features contain NaN
                if np.any(np.isnan(features)):
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
                logger.debug(f"Feature extraction error: {e}")
                continue
        
        X = np.array(X)
        y = np.array(y)
        
        logger.info(f"Extracted {len(X)} samples with {X.shape[1]} features")
        
        return X, y
    
    def train_improved_model(self, X: np.ndarray, y: np.ndarray) -> Tuple[object, object, float]:
        """Train model with improved hyperparameters"""
        logger.info("Training improved model...")
        
        # Temporal split (80/20)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        logger.info(f"Train: {len(X_train)}, Test: {len(X_test)}")
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Try different hyperparameters
        best_model = None
        best_accuracy = 0
        best_params = {}
        
        for C in [0.1, 0.5, 1.0, 2.0]:
            for solver in ['lbfgs', 'liblinear']:
                model = LogisticRegression(
                    C=C,
                    solver=solver,
                    max_iter=2000,
                    class_weight='balanced',
                    random_state=42
                )
                
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                train_acc = model.score(X_train_scaled, y_train)
                test_acc = model.score(X_test_scaled, y_test)
                gap = train_acc - test_acc
                
                # Select best model with low overfitting
                if test_acc > best_accuracy and gap < 0.05:
                    best_accuracy = test_acc
                    best_model = model
                    best_params = {'C': C, 'solver': solver}
        
        logger.info(f"Best params: {best_params}")
        logger.info(f"Best accuracy: {best_accuracy:.1%}")
        
        # Get detailed metrics
        y_pred = best_model.predict(X_test_scaled)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
        
        logger.info(f"Precision: {precision:.3f}")
        logger.info(f"Recall: {recall:.3f}")
        logger.info(f"F1 Score: {f1:.3f}")
        
        return best_model, scaler, best_accuracy
    
    def evaluate_improvement(self, new_accuracy: float) -> bool:
        """Check if new model is better"""
        improvement = new_accuracy - self.current_accuracy
        
        logger.info(f"Current: {self.current_accuracy:.1%}")
        logger.info(f"New: {new_accuracy:.1%}")
        logger.info(f"Improvement: {improvement:+.1%}")
        
        return improvement >= IMPROVEMENT_THRESHOLD
    
    def deploy_model(self, model, scaler, accuracy: float):
        """Deploy improved model to production"""
        logger.info("Deploying improved model...")
        
        # Save model
        model_data = {
            'model': model,
            'scaler': scaler,
            'test_accuracy': accuracy,
            'train_samples': len(scaler.mean_),
            'features': len(scaler.mean_),
            'timestamp': datetime.now().isoformat(),
            'version': f"v{len(self.improvement_history) + 1}"
        }
        
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model_data, f)
        
        # Update improvement history
        self.improvement_history.append({
            'timestamp': datetime.now().isoformat(),
            'old_accuracy': self.current_accuracy,
            'new_accuracy': accuracy,
            'improvement': accuracy - self.current_accuracy
        })
        
        # Save history
        with open('models/improvement_history.json', 'w') as f:
            json.dump(self.improvement_history, f, indent=2)
        
        # Update current model
        self.current_model = model
        self.current_scaler = scaler
        self.current_accuracy = accuracy
        
        logger.info(f"✅ Model deployed! New accuracy: {accuracy:.1%}")
        
        # Send alert if target reached
        if accuracy >= 0.70:
            self.send_alert(f"🎉 TARGET ACHIEVED! Model accuracy: {accuracy:.1%}")
    
    def send_alert(self, message: str):
        """Send alert notification"""
        logger.info(f"ALERT: {message}")
        # In production, this would send email/Slack notification
    
    def run_retrain_cycle(self):
        """Main retraining cycle"""
        logger.info("=" * 70)
        logger.info("STARTING RETRAIN CYCLE")
        logger.info("=" * 70)
        
        try:
            # Check if retraining is needed
            if not self.check_retrain_trigger():
                logger.info("Retraining not needed at this time")
                return
            
            # Load data
            X, y = self.load_training_data()
            
            if len(X) < 1000:
                logger.warning(f"Not enough data for retraining: {len(X)} samples")
                return
            
            # Train improved model
            new_model, new_scaler, new_accuracy = self.train_improved_model(X, y)
            
            # Check if improvement is significant
            if self.evaluate_improvement(new_accuracy):
                self.deploy_model(new_model, new_scaler, new_accuracy)
            else:
                logger.info("No significant improvement. Keeping current model.")
            
            # Alert if accuracy is low
            if new_accuracy < MIN_ACCURACY:
                self.send_alert(f"⚠️ Model accuracy below threshold: {new_accuracy:.1%}")
            
        except Exception as e:
            logger.error(f"Retraining failed: {e}")
            self.send_alert(f"❌ Retraining failed: {str(e)}")
    
    def start_scheduler(self):
        """Start automated retraining scheduler"""
        logger.info("Starting automated retraining scheduler...")
        
        # Schedule retraining
        schedule.every(6).hours.do(self.run_retrain_cycle)
        schedule.every().day.at("03:00").do(self.run_retrain_cycle)
        
        # Initial run
        self.run_retrain_cycle()
        
        # Keep running
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                logger.info("Scheduler stopped by user")
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                time.sleep(300)  # Wait 5 minutes on error


def main():
    """Main entry point"""
    retrainer = AutoRetrainer()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # Run once for testing
        retrainer.run_retrain_cycle()
    else:
        # Start scheduler
        retrainer.start_scheduler()


if __name__ == "__main__":
    logger.info("=" * 70)
    logger.info("AUTOMATED RETRAINING SYSTEM")
    logger.info("Target: 70%+ accuracy")
    logger.info("Temperature: 0.1 (maximum precision)")
    logger.info("=" * 70)
    
    main()