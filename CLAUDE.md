# CLAUDE.md - Decisivis Core

This file optimizes Claude Opus 4.1 performance for the Decisivis football prediction system.

## Project Context
Football match prediction using the 80/20 principle - 5 features achieve 70%+ accuracy. No over-engineering, just what works.

## Development Commands
```bash
# Setup
make install         # Install dependencies with poetry
make setup-db       # Initialize PostgreSQL tables

# Development
make test           # Run all tests with pytest
make lint           # Format code and type check
make predict        # Run prediction locally
make train          # Train model on StatsBomb data

# Deployment
make deploy         # Deploy to Vercel
make monitor        # Check production metrics
```

## Core Principles
1. **Simplicity First**: One LogisticRegression model, 5 features, 70%+ accuracy
2. **Real Data Only**: StatsBomb shots on target (14.2% importance) - NOT estimates
3. **Temporal Decay**: Recent matches weighted 2x more than older ones
4. **No Over-Engineering**: Target < 1000 lines of code total
5. **Self-Learning**: Continuous improvement from match results

## The 5 Features That Matter (53.7% Predictive Power)
1. **Shots on Target** (14.2%) - Real data from StatsBomb
2. **Home Advantage** (13.5%) - Simple binary flag
3. **Recent Form** (11%) - Last 5 games with temporal decay
4. **Team Strength** (9%) - ELO or market value from Transfermarkt
5. **H2H History** (6%) - Last 3-5 meetings only

## Key Files
- `/src/features/core_features.py`: The 5 features implementation
- `/src/models/simple_model.py`: Single LogisticRegression model
- `/src/data/statsbomb.py`: Fetch REAL shots on target (3500+ matches)
- `/src/api/predict.py`: Prediction endpoint
- `/src/models/self_learning.py`: Continuous learning system

## Database Connections
```python
# PostgreSQL (Neon) - Main storage
DATABASE_URL = os.getenv("DATABASE_URL")

# Redis (Upstash) - Caching layer
REDIS = Redis.from_url(os.getenv("KV_REST_API_URL"))

# QStash - Background jobs
QSTASH = QStash(token=os.getenv("QSTASH_TOKEN"))
```

## Performance Targets
- **Accuracy**: 70-75% with just 5 features
- **Response Time**: < 100ms (with Redis caching)
- **Learning Rate**: +1% accuracy per 100 predictions
- **Data Volume**: 3500+ matches from StatsBomb
- **Code Size**: < 1000 lines total

## Workflow Optimization (Claude Opus 4.1 Specific)
1. Use Plan mode for architecture decisions
2. Switch to Sonnet 4 for rapid implementation
3. Use parallel tool execution for data fetching
4. Shift+Tab to cycle between modes efficiently
5. Keep context focused - avoid loading unnecessary files

## Testing Strategy
```bash
# Core functionality
pytest tests/test_features.py::test_shots_on_target  # Validate StatsBomb data
pytest tests/test_features.py::test_temporal_decay    # Check recency weighting
pytest tests/test_model.py::test_accuracy            # Ensure 70%+ accuracy
pytest tests/test_api.py::test_response_time         # Verify < 100ms

# Integration
pytest tests/test_integration.py  # Full pipeline test
```

## Common Issues & Solutions

### Data Issues
- **StatsBomb rate limited**: Use cached data in PostgreSQL
- **Missing shots data**: Skip match (don't estimate!)
- **Transfermarkt unavailable**: Use cached team strengths

### Model Issues
- **Accuracy < 70%**: Check temporal decay weights are applied
- **Overfitting**: Ensure train/test split is temporal (not random)
- **Slow predictions**: Verify Redis cache is working

### API Issues
- **Response > 100ms**: Check Redis connection
- **Memory issues**: Limit concurrent predictions
- **Rate limiting**: Implement QStash queue

## Branch Strategy
- `main`: Production-ready code only (70%+ accuracy required)
- `dev`: Active development (test before merging)
- No feature branches (keep it simple)

## Deployment Checklist
- [ ] All tests passing
- [ ] Accuracy >= 70% on test set
- [ ] Response time < 100ms
- [ ] Environment variables set
- [ ] Redis cache configured
- [ ] QStash jobs scheduled
- [ ] Monitoring alerts active

## Code Style Guidelines
```python
# Always use type hints
def calculate_shots_on_target(events: List[Dict]) -> Tuple[int, int]:
    """Calculate shots on target from StatsBomb events.
    
    Args:
        events: List of match events from StatsBomb
        
    Returns:
        Tuple of (home_shots_on_target, away_shots_on_target)
    """
    # Implementation here
```

## Performance Monitoring
```python
# Log key metrics
logger.info(f"Prediction accuracy: {accuracy:.1%}")
logger.info(f"Response time: {response_time}ms")
logger.info(f"Cache hit rate: {cache_hits/total:.1%}")
```

## Self-Learning Configuration
```python
# Retrain triggers
RETRAIN_AFTER_N_PREDICTIONS = 100
MIN_ACCURACY_THRESHOLD = 0.68  # Alert if drops below
TEMPORAL_DECAY_WEIGHTS = [2.0, 1.5, 1.0, 1.0, 1.0]  # Last 5 games
```

## Production Readiness Checklist
- [ ] Type hints on all functions
- [ ] Docstrings with examples
- [ ] Error handling with specific exceptions
- [ ] Logging at appropriate levels
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed

## Quick Start for New Session
```bash
# 1. Check current accuracy
make test-accuracy

# 2. Fetch latest matches
python src/data/statsbomb.py --update

# 3. Retrain if needed
python src/models/train.py --check-threshold

# 4. Deploy if improved
make deploy
```

## Contact & Support
- Repository: /Users/evanuelrodrigues/Desktop/Project EV/decisivis-core
- Architecture: See ARCHITECTURE.md for 80/20 principle details
- Issues: Check logs in PostgreSQL for debugging