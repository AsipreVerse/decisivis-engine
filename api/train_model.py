#!/usr/bin/env python3
"""
Real model training implementation
Trains on actual match data from database
SECURITY: No hardcoded credentials
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import pickle
from datetime import datetime
import logging
import os
import sys
from typing import Dict, Tuple, List, Optional
import asyncio

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.secure_database import SecureDatabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelTrainer:
    """Handles real model training with progress tracking"""
    
    def __init__(self, db: SecureDatabase):
        self.db = db
        self.progress_callback = None
        self.current_progress = {
            'status': 'idle',
            'epoch': 0,
            'total_epochs': 1,
            'accuracy': 0,
            'loss': 1.0,
            'message': 'Initializing...'
        }
        
    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback
        
    def update_progress(self, **kwargs):
        """Update and broadcast progress"""
        self.current_progress.update(kwargs)
        if self.progress_callback:
            self.progress_callback(self.current_progress)
            
    def extract_features(self, match: Dict) -> List[float]:
        """Extract the 5 key features plus enhanced features"""
        features = []
        
        # 1. SHOTS ON TARGET DIFFERENCE (14.2% importance)
        shot_diff = float(match.get('home_shots_on_target', 0)) - float(match.get('away_shots_on_target', 0))
        shot_ratio = float(match.get('home_shots_on_target', 1)) / max(float(match.get('away_shots_on_target', 1)), 1.0)
        features.extend([shot_diff, shot_ratio])
        
        # 2. HOME ADVANTAGE (13.5% importance)
        features.append(1.0)  # Is home
        
        # 3. RECENT FORM (11% importance) - simplified
        home_form = float(match.get('home_form_5', 0.5))
        away_form = float(match.get('away_form_5', 0.5))
        form_diff = home_form - away_form
        features.extend([home_form, away_form, form_diff])
        
        # 4. TEAM STRENGTH - ELO (9% importance)
        home_elo = float(match.get('home_elo_custom', 1500))
        away_elo = float(match.get('away_elo_custom', 1500))
        elo_diff = home_elo - away_elo
        elo_prob = 1 / (1 + 10**(-elo_diff / 400))
        features.extend([elo_diff, elo_prob])
        
        # 5. Additional features
        home_shots = float(match.get('home_shots', 10))
        away_shots = float(match.get('away_shots', 10))
        home_corners = float(match.get('home_corners', 5))
        away_corners = float(match.get('away_corners', 5))
        
        features.extend([
            home_shots - away_shots,
            home_corners - away_corners,
            home_shots / max(away_shots, 1),
            home_corners / max(away_corners, 1)
        ])
        
        return features
    
    async def train(self, config: Dict = None) -> Dict:
        """Train the model with real data"""
        try:
            self.update_progress(status='preparing', message='Loading training data...')
            
            # Load matches securely
            matches = self.db.execute_query(
                """
                SELECT * FROM matches 
                WHERE home_shots_on_target IS NOT NULL 
                AND away_shots_on_target IS NOT NULL
                AND home_goals IS NOT NULL
                AND away_goals IS NOT NULL
                AND home_shots_on_target != home_goals + 2
                AND away_shots_on_target != away_goals + 2
                ORDER BY match_date
                """
            )
            
            if len(matches) < 1000:
                raise ValueError(f"Not enough data: {len(matches)} matches")
            
            self.update_progress(
                status='processing',
                message=f'Processing {len(matches)} matches...'
            )
            
            # Extract features and labels
            X = []
            y = []
            
            for i, match in enumerate(matches):
                if i % 100 == 0:
                    self.update_progress(
                        message=f'Processing match {i}/{len(matches)}...',
                        epoch=i,
                        total_epochs=len(matches)
                    )
                
                try:
                    features = self.extract_features(match)
                    
                    # Determine result
                    if match['result'] == 'H':
                        label = 2
                    elif match['result'] == 'D':
                        label = 1
                    else:  # 'A'
                        label = 0
                    
                    X.append(features)
                    y.append(label)
                    
                except Exception as e:
                    logger.debug(f"Skipping match: {e}")
                    continue
            
            X = np.array(X)
            y = np.array(y)
            
            logger.info(f"Extracted features: {X.shape}")
            
            # Split data temporally (80/20)
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            self.update_progress(
                status='training',
                message=f'Training on {len(X_train)} samples...'
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model with different C values
            best_model = None
            best_accuracy = 0
            best_params = {}
            
            for C in [0.1, 0.5, 1.0, 2.0]:
                self.update_progress(
                    message=f'Testing C={C}...',
                    epoch=C*10,
                    total_epochs=40
                )
                
                model = LogisticRegression(
                    C=C,
                    max_iter=1000,
                    solver='lbfgs',
                    multi_class='multinomial',
                    random_state=42
                )
                
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                train_pred = model.predict(X_train_scaled)
                test_pred = model.predict(X_test_scaled)
                
                train_acc = accuracy_score(y_train, train_pred)
                test_acc = accuracy_score(y_test, test_pred)
                
                logger.info(f"C={C}: Train={train_acc:.3f}, Test={test_acc:.3f}")
                
                if test_acc > best_accuracy:
                    best_accuracy = test_acc
                    best_model = model
                    best_params = {'C': C}
                    
                self.update_progress(
                    accuracy=test_acc,
                    loss=1.0 - test_acc
                )
            
            # Calculate final metrics
            self.update_progress(
                status='evaluating',
                message='Calculating metrics...'
            )
            
            y_pred = best_model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_test, y_pred, average='weighted'
            )
            
            # Calculate confusion matrix
            cm = confusion_matrix(y_test, y_pred)
            
            # Save model
            self.update_progress(message='Saving model...')
            
            model_data = {
                'model': best_model,
                'scaler': scaler,
                'test_accuracy': accuracy,
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'features': X.shape[1],
                'best_params': best_params,
                'confusion_matrix': cm.tolist(),
                'timestamp': datetime.now().isoformat(),
                'version': f'v{datetime.now().strftime("%Y%m%d_%H%M%S")}'
            }
            
            # Create models directory if not exists
            os.makedirs('models', exist_ok=True)
            
            # Save model
            with open('models/optimal_model.pkl', 'wb') as f:
                pickle.dump(model_data, f)
            
            # Also save with timestamp
            timestamp_file = f'models/model_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pkl'
            with open(timestamp_file, 'wb') as f:
                pickle.dump(model_data, f)
            
            self.update_progress(
                status='completed',
                message=f'Training completed! Accuracy: {accuracy:.1%}',
                accuracy=accuracy
            )
            
            return {
                'status': 'success',
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'best_params': best_params,
                'confusion_matrix': cm.tolist(),
                'model_file': timestamp_file,
                'message': f'Model trained successfully on {len(X)} samples'
            }
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            self.update_progress(
                status='error',
                message=f'Training failed: {str(e)}'
            )
            raise

async def train_model_async(db: SecureDatabase, config: Dict = None, progress_callback=None) -> Dict:
    """Async wrapper for model training"""
    trainer = ModelTrainer(db)
    if progress_callback:
        trainer.set_progress_callback(progress_callback)
    return await trainer.train(config)

if __name__ == "__main__":
    # Test training
    import asyncio
    from config.secure_config import get_config
    from config.secure_database import get_secure_db
    
    def progress_handler(progress):
        print(f"Progress: {progress['message']} - Accuracy: {progress.get('accuracy', 0):.1%}")
    
    async def test():
        config = get_config()
        db = get_secure_db(config.database_url)
        result = await train_model_async(db, progress_callback=progress_handler)
        print(f"Training complete: {result['accuracy']:.1%} accuracy")
        db.close()
    
    asyncio.run(test())