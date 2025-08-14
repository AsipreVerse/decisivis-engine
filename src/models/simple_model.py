#!/usr/bin/env python3
"""
Simple LogisticRegression Model - Following 80/20 principle
One model, 5 features, 70%+ accuracy target
"""

import os
import json
import pickle
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from typing import Tuple, Dict, Optional
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)


class DecisivisModel:
    """Simple LogisticRegression for 70%+ accuracy with 5 features."""
    
    def __init__(self):
        # ONE model, not an ensemble
        self.model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            multi_class='multinomial',  # For H/D/A prediction
            solver='lbfgs'
        )
        self.feature_names = [
            "home_shots_on_target_avg",
            "away_shots_on_target_avg",
            "shots_differential",
            "home_advantage",
            "form_differential", 
            "elo_differential",
            "h2h_home_factor"
        ]
        self.accuracy = None
        self.model_metadata = {}
    
    def train(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Dict:
        """
        Train the model and return performance metrics.
        
        Args:
            X: Feature matrix (n_samples, 7)
            y: Labels (0=Away, 1=Draw, 2=Home)
            test_size: Fraction for test set
            
        Returns:
            Dict with training results
        """
        logger.info(f"Training on {len(X)} samples with {X.shape[1]} features...")
        
        # Temporal split (not random!) - More realistic for time series
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        logger.info(f"Train set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate on training set
        train_pred = self.model.predict(X_train)
        train_accuracy = accuracy_score(y_train, train_pred)
        
        # Evaluate on test set
        test_pred = self.model.predict(X_test)
        test_accuracy = accuracy_score(y_test, test_pred)
        
        self.accuracy = test_accuracy
        
        # Get feature importance (coefficients)
        feature_importance = {}
        for i, name in enumerate(self.feature_names):
            # Average absolute coefficient across classes
            importance = np.mean(np.abs(self.model.coef_[:, i]))
            feature_importance[name] = float(importance)
        
        # Sort by importance
        feature_importance = dict(sorted(
            feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
        
        # Classification report
        class_names = ['Away', 'Draw', 'Home']
        report = classification_report(
            y_test, test_pred, 
            target_names=class_names,
            output_dict=True
        )
        
        # Confusion matrix
        cm = confusion_matrix(y_test, test_pred)
        
        # Store metadata
        self.model_metadata = {
            "trained_at": datetime.now().isoformat(),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "train_accuracy": float(train_accuracy),
            "test_accuracy": float(test_accuracy),
            "feature_importance": feature_importance,
            "classification_report": report,
            "confusion_matrix": cm.tolist()
        }
        
        # Log results
        logger.info(f"\n{'='*50}")
        logger.info(f"TRAINING RESULTS")
        logger.info(f"{'='*50}")
        logger.info(f"Train Accuracy: {train_accuracy:.1%}")
        logger.info(f"Test Accuracy: {test_accuracy:.1%}")
        
        if test_accuracy >= 0.70:
            logger.info(f"✅ TARGET ACHIEVED! {test_accuracy:.1%} >= 70%")
        else:
            logger.warning(f"⚠️ Below target: {test_accuracy:.1%} < 70%")
        
        logger.info(f"\nFeature Importance:")
        for name, imp in feature_importance.items():
            logger.info(f"  {name}: {imp:.3f}")
        
        logger.info(f"\nConfusion Matrix:")
        logger.info(f"  Predicted: A  D  H")
        for i, row in enumerate(cm):
            logger.info(f"  Actual {class_names[i][0]}: {row}")
        
        logger.info(f"\nPer-class Performance:")
        for cls in class_names:
            precision = report[cls]['precision']
            recall = report[cls]['recall']
            f1 = report[cls]['f1-score']
            logger.info(f"  {cls}: Precision={precision:.2f}, Recall={recall:.2f}, F1={f1:.2f}")
        
        return self.model_metadata
    
    def predict(self, features: np.ndarray) -> Tuple[str, float, Dict[str, float]]:
        """
        Make a prediction with confidence scores.
        
        Args:
            features: Feature vector (7 values)
            
        Returns:
            Tuple of (prediction, confidence, probabilities)
        """
        if len(features) != len(self.feature_names):
            raise ValueError(f"Expected {len(self.feature_names)} features, got {len(features)}")
        
        # Reshape for single prediction
        features = np.array(features).reshape(1, -1)
        
        # Get probabilities
        proba = self.model.predict_proba(features)[0]
        
        # Get prediction
        prediction_idx = np.argmax(proba)
        outcomes = ['A', 'D', 'H']
        prediction = outcomes[prediction_idx]
        confidence = proba[prediction_idx]
        
        # Create probability dict
        probabilities = {
            'away': float(proba[0]),
            'draw': float(proba[1]),
            'home': float(proba[2])
        }
        
        return prediction, confidence, probabilities
    
    def save(self, name: Optional[str] = None):
        """Save model to disk."""
        if name is None:
            name = f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        model_path = os.path.join(MODEL_DIR, f"{name}.pkl")
        metadata_path = os.path.join(MODEL_DIR, f"{name}_metadata.json")
        
        # Save model
        with open(model_path, 'wb') as f:
            pickle.dump(self.model, f)
        
        # Save metadata
        with open(metadata_path, 'w') as f:
            json.dump(self.model_metadata, f, indent=2)
        
        logger.info(f"✅ Model saved to {model_path}")
        
        return model_path
    
    def load(self, name: str):
        """Load model from disk."""
        model_path = os.path.join(MODEL_DIR, f"{name}.pkl")
        metadata_path = os.path.join(MODEL_DIR, f"{name}_metadata.json")
        
        # Load model
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            self.model_metadata = json.load(f)
        
        self.accuracy = self.model_metadata.get('test_accuracy')
        
        logger.info(f"✅ Model loaded from {model_path}")
        logger.info(f"  Accuracy: {self.accuracy:.1%}")
    
    @classmethod
    def load_best_model(cls):
        """Load the best performing model."""
        instance = cls()
        
        # Find all saved models
        models = []
        for file in os.listdir(MODEL_DIR):
            if file.endswith('_metadata.json'):
                with open(os.path.join(MODEL_DIR, file), 'r') as f:
                    metadata = json.load(f)
                    model_name = file.replace('_metadata.json', '')
                    models.append((model_name, metadata.get('test_accuracy', 0)))
        
        if not models:
            raise ValueError("No saved models found")
        
        # Get best model
        best_model = max(models, key=lambda x: x[1])
        logger.info(f"Loading best model: {best_model[0]} (accuracy: {best_model[1]:.1%})")
        
        instance.load(best_model[0])
        return instance


def main():
    """Train and save the model."""
    from src.features.core_features import CoreFeatureExtractor
    
    # Extract features
    logger.info("Extracting features from database...")
    extractor = CoreFeatureExtractor()
    
    try:
        # Get training data
        X, y = extractor.prepare_training_data()
        
        # Train model
        model = DecisivisModel()
        results = model.train(X, y)
        
        # Save if accuracy is good
        if results['test_accuracy'] >= 0.68:  # Slightly below target is OK initially
            model_path = model.save("production_model")
            logger.info(f"✅ Model saved for production use")
        else:
            logger.warning("⚠️ Model accuracy too low for production")
        
    finally:
        extractor.close()


if __name__ == "__main__":
    main()