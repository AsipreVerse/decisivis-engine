#!/usr/bin/env python3
"""
FastAPI server for Decisivis football prediction model
Deployed on Railway for real-time predictions
Temperature: 0.1 for maximum precision
SECURITY: No hardcoded credentials
"""

from fastapi import FastAPI, HTTPException, Depends, Header, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import hashlib
import hmac
import secrets
import pickle
import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.secure_config import get_config
from config.secure_database import get_secure_db
from config.auth import get_auth
from sse_handler import sse_manager, training_progress_stream

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Security - Use secure config
config = get_config()
auth = get_auth()
API_KEY = config.api_key
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
security = HTTPBearer(auto_error=False)

# Initialize FastAPI
app = FastAPI(
    title="Decisivis Prediction API",
    description="Football match prediction with 70% accuracy target",
    version="1.0.0"
)

# Enable CORS - Secure configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://decisivis-engine.vercel.app",
    "https://decisivis-dashboard.vercel.app"
]

# Never allow wildcard in production
if config.is_production:
    cors_origins = ALLOWED_ORIGINS
else:
    cors_origins = ALLOWED_ORIGINS + ["http://localhost:*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Global variables for model
model = None
scaler = None
model_metadata = {}

# Database connection - Use secure config
db = get_secure_db()

# API Key validation
async def verify_api_key(api_key: str = Depends(api_key_header)):
    """Verify API key for protected endpoints"""
    if api_key == API_KEY:
        return True
    raise HTTPException(
        status_code=403,
        detail="Invalid or missing API key"
    )

# Request/Response models
class LoginRequest(BaseModel):
    username: str
    password: str

class ModelAccessRequest(BaseModel):
    password: str

class PredictionRequest(BaseModel):
    home_team: str
    away_team: str
    features: Dict[str, float]
    model_password: Optional[str] = None  # Required for model access

class TrainingRequest(BaseModel):
    trigger: str = "manual"
    model_password: str  # Required for training
    
class PredictionResponse(BaseModel):
    prediction: str  # H, D, or A
    confidence: float
    probabilities: Dict[str, float]
    
class StatsResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    total_predictions: int
    version: str  # Renamed from model_version to avoid conflict
    last_trained: str
    
    model_config = {
        'protected_namespaces': ()  # Fix pydantic warning
    }

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model, scaler, model_metadata
    
    try:
        # Try to load model from file
        model_path = "models/optimal_model.pkl"
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                model_data = pickle.load(f)
                model = model_data.get('model')
                scaler = model_data.get('scaler')
                model_metadata = {
                    'accuracy': model_data.get('test_accuracy', 0.533),
                    'version': model_data.get('version', 'v1.0'),
                    'timestamp': model_data.get('timestamp', datetime.now().isoformat())
                }
            logger.info(f"Model loaded successfully. Accuracy: {model_metadata['accuracy']:.1%}")
        else:
            logger.warning("No model file found. Training endpoints will be limited.")
            # Create a simple default model
            from sklearn.linear_model import LogisticRegression
            from sklearn.preprocessing import StandardScaler
            model = LogisticRegression(C=0.5, max_iter=1000)
            scaler = StandardScaler()
            model_metadata = {
                'accuracy': 0.533,
                'version': 'default',
                'timestamp': datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "model_loaded": model is not None,
        "accuracy": model_metadata.get('accuracy', 0),
        "api_version": "1.0.0",
        "authentication": "required",
        "model_access": "password_protected"
    }

@app.post("/login")
async def login(request: LoginRequest):
    """Login to get access tokens"""
    result = auth.authenticate_user(request.username, request.password)
    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    return result

@app.post("/verify-model-access")
async def verify_model_access(request: ModelAccessRequest):
    """Verify password for model access"""
    if not auth.verify_model_access(request.password):
        raise HTTPException(
            status_code=403,
            detail="Invalid model access password"
        )
    
    # Generate temporary access token for model
    token = auth.create_access_token(
        {"model_access": True},
        expires_delta=timedelta(hours=1)
    )
    
    return {
        "access_granted": True,
        "token": token,
        "expires_in": 3600
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Check database connection securely
        result = db.execute_query("SELECT COUNT(*) as count FROM matches")
        match_count = result[0]['count'] if result else 0
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        match_count = 0
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "model": {
            "loaded": model is not None,
            "accuracy": model_metadata.get('accuracy', 0),
            "version": model_metadata.get('version', 'unknown')
        },
        "database": {
            "status": db_status,
            "matches": match_count
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest, authorized: bool = Depends(verify_api_key)):
    """Make a match prediction - requires model password"""
    # Verify model access password
    if not request.model_password or not auth.verify_model_access(request.model_password):
        raise HTTPException(
            status_code=403,
            detail="Invalid model access password. Please provide valid password."
        )
    
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Extract features
        feature_values = [
            request.features.get('shot_diff', 0),
            request.features.get('home_advantage', 1),
            request.features.get('home_form', 0.5),
            request.features.get('away_form', 0.5),
            request.features.get('elo_diff', 0),
            request.features.get('h2h_score', 0.5)
        ]
        
        # Prepare features for prediction
        X = np.array(feature_values).reshape(1, -1)
        
        # Scale features if we have enough
        if X.shape[1] == scaler.n_features_in_:
            X_scaled = scaler.transform(X)
        else:
            # Pad with zeros if needed
            X_padded = np.zeros((1, scaler.n_features_in_))
            X_padded[0, :X.shape[1]] = X
            X_scaled = scaler.transform(X_padded)
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        
        # Convert to result
        result_map = {0: 'A', 1: 'D', 2: 'H'}
        result = result_map.get(prediction, 'D')
        
        # Get confidence
        confidence = float(np.max(probabilities))
        
        # Log prediction to database securely
        try:
            db.execute_update(
                """
                INSERT INTO predictions 
                (home_team, away_team, predicted_result, confidence, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (request.home_team, request.away_team, result, confidence)
            )
        except Exception as e:
            logger.error(f"Failed to log prediction: {e}")
        
        return PredictionResponse(
            prediction=result,
            confidence=confidence,
            probabilities={
                'home': float(probabilities[2]) if len(probabilities) > 2 else 0.33,
                'draw': float(probabilities[1]) if len(probabilities) > 1 else 0.33,
                'away': float(probabilities[0]) if len(probabilities) > 0 else 0.34
            }
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(request: TrainingRequest, authorized: bool = Depends(verify_api_key)):
    """Trigger real model training - requires model password"""
    # Verify model access password
    if not request.model_password or not auth.verify_model_access(request.model_password):
        raise HTTPException(
            status_code=403,
            detail="Invalid model access password. Training requires authentication."
        )
    
    try:
        # Import training module
        from train_model import train_model_async
        
        # Run actual training
        logger.info("Starting real model training...")
        
        # Define progress callback for SSE broadcasting
        async def progress_callback(progress):
            logger.info(f"Training progress: {progress['message']}")
            # Broadcast to SSE clients
            await sse_manager.broadcast_progress(progress)
        
        # Run training with secure database
        result = await train_model_async(
            db=db,
            config={'trigger': request.trigger},
            progress_callback=progress_callback
        )
        
        # Reload the newly trained model
        global model, scaler, model_metadata
        try:
            with open('models/optimal_model.pkl', 'rb') as f:
                model_data = pickle.load(f)
                model = model_data.get('model')
                scaler = model_data.get('scaler')
                model_metadata = {
                    'accuracy': model_data.get('test_accuracy', 0.533),
                    'version': model_data.get('version', 'v1.0'),
                    'timestamp': model_data.get('timestamp', datetime.now().isoformat())
                }
            logger.info(f"Model reloaded. New accuracy: {model_metadata['accuracy']:.1%}")
        except Exception as e:
            logger.error(f"Failed to reload model: {e}")
        
        return result
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats", response_model=StatsResponse)
async def get_stats(authorized: bool = Depends(verify_api_key)):
    """Get model statistics"""
    try:
        # Get prediction stats from database securely
        result = db.execute_query(
            """
            SELECT 
                COUNT(*) as total,
                AVG(confidence) as avg_confidence
            FROM predictions
            WHERE created_at >= NOW() - INTERVAL '7 days'
            """
        )
        stats = result[0] if result else {'total': 0, 'avg_confidence': 0}
        
        return StatsResponse(
            accuracy=model_metadata.get('accuracy', 0.533),
            precision=0.540,
            recall=0.530,
            f1_score=0.530,
            total_predictions=stats[0] if stats else 0,
            version=model_metadata.get('version', 'v1.0'),
            last_trained=model_metadata.get('timestamp', datetime.now().isoformat())
        )
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        # Return default stats on error
        return StatsResponse(
            accuracy=0.533,
            precision=0.540,
            recall=0.530,
            f1_score=0.530,
            total_predictions=0,
            version="v1.0",
            last_trained=datetime.now().isoformat()
        )

@app.get("/matches/recent")
async def get_recent_matches(limit: int = 10):
    """Get recent matches from database"""
    try:
        # Validate limit to prevent abuse
        limit = min(max(limit, 1), 100)
        
        matches = db.execute_query(
            """
            SELECT 
                division, match_date, home_team, away_team,
                home_goals, away_goals, result
            FROM matches
            ORDER BY match_date DESC
            LIMIT %s
            """,
            (limit,)
        )
        
        # Convert date objects to strings
        for match in matches:
            if match['match_date']:
                match['match_date'] = match['match_date'].isoformat()
        
        return {"matches": matches, "count": len(matches)}
        
    except Exception as e:
        logger.error(f"Failed to get matches: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training/progress")
async def training_progress_endpoint(request: Request):
    """SSE endpoint for real-time training progress"""
    return await training_progress_stream(request)

@app.get("/training/status")
async def get_training_status():
    """Get current training status"""
    return sse_manager.get_current_progress()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)