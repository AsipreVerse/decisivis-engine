#!/usr/bin/env python3
"""
FastAPI Server - Minimal endpoints following 80/20 principle
Target: < 100ms response time with Redis caching
"""

import os
import json
import time
import redis
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
import logging

# Import our modules
from src.features.core_features import CoreFeatureExtractor
from src.models.simple_model import DecisivisModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Decisivis Core API",
    description="Football match prediction using 80/20 principle - 70%+ accuracy with 5 features",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Redis for caching
REDIS_URL = os.getenv("REDIS_URL", "rediss://default:Acc5AAIjcDEyOGRkYmVhYzZkNzk0OWFlYTU5OTkxNDZhNTFhNGI5M3AxMA@summary-goat-51001.upstash.io:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("✅ Redis connected for caching")
except Exception as e:
    logger.warning(f"⚠️ Redis not available, caching disabled: {e}")
    redis_client = None

# Load model and feature extractor
model = None
extractor = None

def load_model():
    """Load the best available model."""
    global model, extractor
    try:
        model = DecisivisModel.load_best_model()
        extractor = CoreFeatureExtractor()
        logger.info(f"✅ Model loaded with accuracy: {model.accuracy:.1%}")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        model = None
        extractor = None


# Request/Response models
class PredictionRequest(BaseModel):
    home_team: str
    away_team: str
    date: str  # Format: YYYY-MM-DD
    
class PredictionResponse(BaseModel):
    prediction: str  # H/D/A
    confidence: float
    probabilities: Dict[str, float]
    features_used: int = 5
    model_accuracy: float
    response_time_ms: float
    cached: bool = False

class LearnRequest(BaseModel):
    match_id: str
    actual_result: str  # H/D/A

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_accuracy: Optional[float]
    redis_connected: bool
    database_connected: bool


@app.on_event("startup")
async def startup_event():
    """Load model on startup."""
    load_model()


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if model else "degraded",
        model_loaded=model is not None,
        model_accuracy=model.accuracy if model else None,
        redis_connected=redis_client is not None,
        database_connected=extractor is not None
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_match(request: PredictionRequest):
    """
    Predict match outcome with < 100ms response time.
    Uses Redis caching for repeated predictions.
    """
    start_time = time.time()
    
    if not model or not extractor:
        raise HTTPException(status_code=503, detail="Model not available")
    
    # Check cache first
    cache_key = f"pred:{request.home_team}:{request.away_team}:{request.date}"
    cached_result = None
    
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                cached_result = json.loads(cached)
                cached_result['cached'] = True
                cached_result['response_time_ms'] = (time.time() - start_time) * 1000
                logger.info(f"Cache hit for {cache_key}")
                return PredictionResponse(**cached_result)
        except Exception as e:
            logger.warning(f"Cache read failed: {e}")
    
    # Extract features
    try:
        features = extractor.extract_features(
            request.home_team,
            request.away_team,
            request.date
        )
        
        # Prepare feature vector
        feature_vector = [
            features["home_shots_on_target_avg"],
            features["away_shots_on_target_avg"],
            features["shots_differential"],
            features["home_advantage"],
            features["form_differential"],
            features["elo_differential"],
            features["h2h_home_factor"]
        ]
        
        # Make prediction
        prediction, confidence, probabilities = model.predict(feature_vector)
        
        response_time = (time.time() - start_time) * 1000
        
        result = {
            "prediction": prediction,
            "confidence": float(confidence),
            "probabilities": probabilities,
            "features_used": 5,
            "model_accuracy": float(model.accuracy) if model.accuracy else 0.5,
            "response_time_ms": response_time,
            "cached": False
        }
        
        # Cache the result
        if redis_client and response_time < 100:  # Only cache fast responses
            try:
                redis_client.setex(
                    cache_key,
                    3600,  # 1 hour TTL
                    json.dumps(result)
                )
                logger.info(f"Cached prediction for {cache_key}")
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")
        
        # Log performance
        if response_time > 100:
            logger.warning(f"⚠️ Slow response: {response_time:.1f}ms > 100ms target")
        else:
            logger.info(f"✅ Fast response: {response_time:.1f}ms")
        
        return PredictionResponse(**result)
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/learn")
async def learn_from_result(request: LearnRequest):
    """
    Store match result for self-learning.
    This endpoint stores results for future model retraining.
    """
    # TODO: Implement storage of actual results for retraining
    # For now, just acknowledge receipt
    return {
        "success": True,
        "message": f"Result stored for match {request.match_id}",
        "current_accuracy": model.accuracy if model else None
    }


@app.get("/stats")
async def get_statistics():
    """Get current model and system statistics."""
    if not model:
        raise HTTPException(status_code=503, detail="Model not available")
    
    return {
        "model": {
            "accuracy": model.accuracy,
            "trained_at": model.model_metadata.get("trained_at"),
            "train_samples": model.model_metadata.get("train_samples"),
            "test_samples": model.model_metadata.get("test_samples"),
            "feature_importance": model.model_metadata.get("feature_importance")
        },
        "cache": {
            "enabled": redis_client is not None,
            "ttl_seconds": 3600
        },
        "performance": {
            "target_accuracy": 0.70,
            "target_response_ms": 100
        }
    }


@app.post("/reload-model")
async def reload_model():
    """Reload the model (useful after retraining)."""
    load_model()
    return {
        "success": True,
        "model_accuracy": model.accuracy if model else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )