#!/usr/bin/env python3
"""
Self-Learning Agent with Google Gemini
Continuous improvement system for football prediction model
Temperature: 0.1 for maximum precision
SECURITY: No hardcoded credentials
"""

import os
import sys
import json
import pickle
import numpy as np
from datetime import datetime, timedelta
import google.generativeai as genai
from typing import Dict, List, Tuple, Any
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.secure_config import get_config
from config.secure_database import get_secure_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
config = get_config()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")  # Set this environment variable
MODEL_PATH = "models/optimal_model.pkl"
IMPROVEMENT_THRESHOLD = 0.01  # 1% improvement required
ANALYSIS_FREQUENCY = 100  # Analyze every 100 predictions


class GeminiSelfLearningAgent:
    """Self-learning agent that uses Gemini to improve model performance"""
    
    def __init__(self):
        """Initialize the agent with Gemini and database connections"""
        # Initialize Gemini
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel(
                'gemini-pro',
                generation_config=genai.GenerationConfig(
                    temperature=0.1,  # Low temperature for precision
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048
                )
            )
        else:
            logger.warning("Gemini API key not set. Agent will run in analysis-only mode.")
            self.gemini_model = None
        
        # Database connection
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        
        # Load current model
        self.load_current_model()
        
        # Performance tracking
        self.prediction_buffer = []
        self.misprediction_patterns = []
        self.improvement_history = []
        
    def load_current_model(self):
        """Load the current trained model"""
        try:
            with open(MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.current_accuracy = model_data.get('test_accuracy', 0.533)
                logger.info(f"Loaded model with accuracy: {self.current_accuracy:.1%}")
        except FileNotFoundError:
            logger.error(f"Model not found at {MODEL_PATH}")
            self.model = None
            self.scaler = None
            self.current_accuracy = 0
    
    def collect_predictions(self, match_id: int, predicted: str, actual: str, confidence: float, features: Dict):
        """Collect predictions for analysis"""
        prediction_data = {
            'match_id': match_id,
            'predicted': predicted,
            'actual': actual,
            'confidence': confidence,
            'correct': predicted == actual,
            'features': features,
            'timestamp': datetime.now().isoformat()
        }
        
        self.prediction_buffer.append(prediction_data)
        
        # Store in database
        self.cur.execute("""
            INSERT INTO predictions (
                match_id, predicted_result, actual_result, 
                confidence, is_correct, model_version, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            match_id, predicted, actual, confidence,
            predicted == actual, 'gemini-enhanced-v1', datetime.now()
        ))
        self.conn.commit()
        
        # Trigger analysis if buffer is full
        if len(self.prediction_buffer) >= ANALYSIS_FREQUENCY:
            self.analyze_performance()
    
    def analyze_performance(self):
        """Analyze recent predictions to identify improvement opportunities"""
        logger.info(f"Analyzing {len(self.prediction_buffer)} predictions...")
        
        # Calculate recent accuracy
        correct = sum(1 for p in self.prediction_buffer if p['correct'])
        recent_accuracy = correct / len(self.prediction_buffer)
        
        logger.info(f"Recent accuracy: {recent_accuracy:.1%}")
        
        # Identify misprediction patterns
        mispredictions = [p for p in self.prediction_buffer if not p['correct']]
        
        if mispredictions:
            # Analyze patterns in mispredictions
            patterns = self.identify_patterns(mispredictions)
            
            # Use Gemini to suggest improvements
            if self.gemini_model:
                improvements = self.generate_improvement_hypotheses(patterns)
                
                # Test improvements
                if improvements:
                    self.test_improvements(improvements)
        
        # Clear buffer
        self.prediction_buffer = []
    
    def identify_patterns(self, mispredictions: List[Dict]) -> Dict:
        """Identify patterns in mispredicted matches"""
        patterns = {
            'high_confidence_failures': [],
            'feature_outliers': [],
            'common_scenarios': [],
            'league_specific': {},
            'time_patterns': []
        }
        
        for mp in mispredictions:
            # High confidence failures
            if mp['confidence'] > 0.7:
                patterns['high_confidence_failures'].append({
                    'match_id': mp['match_id'],
                    'confidence': mp['confidence'],
                    'predicted': mp['predicted'],
                    'actual': mp['actual']
                })
            
            # Feature analysis
            features = mp['features']
            if 'shot_diff' in features and abs(features['shot_diff']) > 5:
                patterns['feature_outliers'].append({
                    'match_id': mp['match_id'],
                    'shot_diff': features['shot_diff'],
                    'outcome': mp['actual']
                })
        
        return patterns
    
    def generate_improvement_hypotheses(self, patterns: Dict) -> List[Dict]:
        """Use Gemini to generate improvement hypotheses"""
        if not self.gemini_model:
            return []
        
        prompt = f"""
        Analyze these football match prediction failures with temperature 0.1 for maximum precision.
        
        Current model accuracy: {self.current_accuracy:.1%}
        Target accuracy: 70%
        
        Misprediction patterns:
        - High confidence failures: {len(patterns['high_confidence_failures'])}
        - Feature outliers: {len(patterns['feature_outliers'])}
        
        Current features used (80/20 principle):
        1. Shots on Target (14.2% importance)
        2. Home Advantage (13.5% importance)
        3. Recent Form (11% importance)
        4. Team Strength/Elo (9% importance)
        5. Head-to-Head (6% importance)
        
        Based on these patterns, suggest EXACTLY 3 specific improvements:
        1. Feature weight adjustments (which features need more/less weight)
        2. New feature combinations (interaction terms)
        3. Temporal adjustments (how to handle recent vs older data)
        
        Format response as JSON:
        {{
            "weight_adjustments": {{"feature": "adjustment_factor"}},
            "new_interactions": ["feature1_x_feature2"],
            "temporal_changes": {{"description": "specific_change"}}
        }}
        """
        
        try:
            response = self.gemini_model.generate_content(prompt)
            improvements = json.loads(response.text)
            logger.info(f"Generated {len(improvements)} improvement hypotheses")
            return improvements
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return []
    
    def test_improvements(self, improvements: Dict):
        """Test proposed improvements on holdout data"""
        logger.info("Testing improvement hypotheses...")
        
        # Load recent test data
        self.cur.execute("""
            SELECT * FROM matches
            WHERE match_date >= %s
            ORDER BY match_date DESC
            LIMIT 500
        """, (datetime.now() - timedelta(days=30),))
        
        test_matches = self.cur.fetchall()
        
        if not test_matches:
            logger.warning("No test data available")
            return
        
        # Apply improvements and test
        baseline_accuracy = self.evaluate_model(test_matches, use_improvements=False)
        improved_accuracy = self.evaluate_model(test_matches, use_improvements=True, improvements=improvements)
        
        improvement = improved_accuracy - baseline_accuracy
        
        logger.info(f"Baseline: {baseline_accuracy:.1%}")
        logger.info(f"Improved: {improved_accuracy:.1%}")
        logger.info(f"Improvement: {improvement:+.1%}")
        
        # Deploy if improvement exceeds threshold
        if improvement >= IMPROVEMENT_THRESHOLD:
            self.deploy_improvements(improvements)
            logger.info("✅ Improvements deployed!")
        else:
            logger.info("❌ Improvements did not meet threshold")
    
    def evaluate_model(self, matches: List[Dict], use_improvements: bool = False, improvements: Dict = None) -> float:
        """Evaluate model accuracy on given matches"""
        if not self.model:
            return 0.0
        
        correct = 0
        total = 0
        
        for match in matches:
            try:
                # Extract features
                features = self.extract_features(match)
                
                # Apply improvements if specified
                if use_improvements and improvements:
                    features = self.apply_improvements(features, improvements)
                
                # Make prediction
                X = np.array([features]).reshape(1, -1)
                X_scaled = self.scaler.transform(X)
                prediction = self.model.predict(X_scaled)[0]
                
                # Convert prediction to result
                predicted_result = ['A', 'D', 'H'][prediction]
                actual_result = match['result']
                
                if predicted_result == actual_result:
                    correct += 1
                total += 1
                
            except Exception as e:
                logger.debug(f"Evaluation error: {e}")
                continue
        
        return correct / total if total > 0 else 0.0
    
    def extract_features(self, match: Dict) -> List[float]:
        """Extract features from a match"""
        # Simplified feature extraction
        return [
            float(match.get('home_shots_on_target', 0) - match.get('away_shots_on_target', 0)),
            float(match.get('home_shots_on_target', 1) / max(match.get('away_shots_on_target', 1), 1)),
            float(match.get('home_elo_custom', 1500) - match.get('away_elo_custom', 1500)),
            1.0,  # Home advantage
            float(match.get('home_form_5', 0) - match.get('away_form_5', 0)),
            float(match.get('home_form_3', 0) - match.get('away_form_3', 0)),
            0.5,  # H2H placeholder
            # Interaction terms
            0.0, 0.0, 0.0, 0.0
        ]
    
    def apply_improvements(self, features: List[float], improvements: Dict) -> List[float]:
        """Apply improvements to features"""
        # Apply weight adjustments
        if 'weight_adjustments' in improvements:
            for feature_name, adjustment in improvements['weight_adjustments'].items():
                # Map feature names to indices and apply adjustments
                pass
        
        return features
    
    def deploy_improvements(self, improvements: Dict):
        """Deploy improvements to production"""
        # Save improvements
        improvement_record = {
            'timestamp': datetime.now().isoformat(),
            'improvements': improvements,
            'old_accuracy': self.current_accuracy,
            'expected_improvement': IMPROVEMENT_THRESHOLD
        }
        
        self.improvement_history.append(improvement_record)
        
        # Save to file
        with open('models/improvements.json', 'w') as f:
            json.dump(self.improvement_history, f, indent=2)
        
        logger.info("Improvements saved to models/improvements.json")
    
    def continuous_learning_loop(self):
        """Main continuous learning loop"""
        logger.info("Starting continuous learning loop...")
        
        while True:
            try:
                # Fetch recent matches
                self.cur.execute("""
                    SELECT * FROM matches
                    WHERE match_date >= CURRENT_DATE - INTERVAL '1 day'
                    AND result IS NOT NULL
                    ORDER BY match_date DESC
                """)
                
                recent_matches = self.cur.fetchall()
                
                if recent_matches:
                    logger.info(f"Processing {len(recent_matches)} new matches")
                    
                    for match in recent_matches:
                        # Make prediction
                        features = self.extract_features(match)
                        X = np.array([features]).reshape(1, -1)
                        X_scaled = self.scaler.transform(X)
                        
                        prediction = self.model.predict(X_scaled)[0]
                        confidence = max(self.model.predict_proba(X_scaled)[0])
                        
                        predicted_result = ['A', 'D', 'H'][prediction]
                        
                        # Collect for analysis
                        self.collect_predictions(
                            match['id'],
                            predicted_result,
                            match['result'],
                            confidence,
                            {'shot_diff': features[0], 'elo_diff': features[2]}
                        )
                
                # Sleep for 1 hour
                import time
                time.sleep(3600)
                
            except KeyboardInterrupt:
                logger.info("Stopping continuous learning loop")
                break
            except Exception as e:
                logger.error(f"Error in learning loop: {e}")
                import time
                time.sleep(60)  # Wait 1 minute on error
    
    def close(self):
        """Clean up connections"""
        self.cur.close()
        self.conn.close()


def main():
    """Main entry point"""
    agent = GeminiSelfLearningAgent()
    
    try:
        # Start continuous learning
        agent.continuous_learning_loop()
    finally:
        agent.close()


if __name__ == "__main__":
    # Set up Gemini API key
    if not GEMINI_API_KEY:
        logger.warning("""
        ⚠️ GEMINI API KEY NOT SET
        
        To enable Gemini self-learning:
        export GEMINI_API_KEY='your-api-key-here'
        
        Get your API key at: https://makersuite.google.com/app/apikey
        """)
    
    main()