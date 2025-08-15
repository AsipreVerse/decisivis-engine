# CLAUDE.md - Decisivis Engine Repository

## 🎯 Repository Context
**Repository**: decisivis-engine  
**URL**: https://github.com/AsipreVerse/decisivis-engine  
**Deployment**: Not deployed (ML engine & utilities)  
**Purpose**: Machine learning models, training scripts, and data processing  
**Framework**: Python ML stack + Next.js dashboard

## 📁 Current Directory
You are in: `/Users/evanuelrodrigues/Desktop/Project EV/decisivis-engine`

## 🚀 Key Features
- Reinforcement learning football prediction model
- 80/20 principle feature engineering
- Historical data collection (100k+ matches)
- Model training and evaluation
- Dashboard for monitoring (Next.js)
- FBRef data scraping

## 📂 Project Structure
```
python-engine/
├── engine.py                      # Core prediction engine
├── rl_predictor.py               # RL prediction logic
├── feature_engineering_v2.py     # Feature extraction
├── self_learning_system.py       # Self-improving ML
├── data_collector.py             # Data acquisition
├── fbref_crawler.py              # FBRef scraper
└── train_rl_historical.py       # RL training

models/
├── rl_model.json                 # Current RL model (43% accuracy)
├── ensemble_v2_model.json        # Ensemble model
├── enhanced_ensemble_model.pkl   # Enhanced version
└── optimal_model.pkl             # Best performing model

lib/
├── prediction-engine.ts          # TypeScript prediction interface
├── incremental-learner.ts        # Incremental learning
├── football-api-client.ts        # API integrations
├── fbref-scraper.ts             # Web scraping
└── universal-predictor.ts        # Universal prediction system

app/                              # Next.js Dashboard
├── page.tsx                      # Main dashboard
├── testing/page.tsx              # API testing interface
├── oddsight-landing/            # Landing page demo
├── privacy/page.tsx             # Privacy policy
├── terms/page.tsx               # Terms of service
└── pricing/page.tsx             # Pricing tiers
```

## 🔧 Environment Variables
```env
# Python Engine
GEMINI_API_KEY=your-api-key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Next.js Dashboard
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
PYTHON_API_URL=https://web-production-8eb98.up.railway.app
```

## 📝 Common Commands
```bash
# Python ML Engine
cd python-engine
python train_rl_historical.py     # Train RL model
python engine.py                  # Run prediction engine
python data_collector.py          # Collect match data

# Model Evaluation
python comprehensive_tests.py     # Run all tests
python rl_predictor.py            # Test predictions

# Next.js Dashboard (from root)
npm run dev                       # Start dashboard
npm run build                     # Build for production

# Data Collection
python collect_100k_matches.py    # Collect historical data
python fbref_crawler.py           # Scrape FBRef data
```

## 🧠 ML Models

### Current Models
- **RL Model**: 43% accuracy (needs improvement)
- **Ensemble V2**: Combined approach
- **80/20 Model**: 5 key features for 53.7% predictive power

### Key Features (80/20 Principle)
1. Recent form (last 5 matches)
2. Head-to-head history
3. Home/away performance
4. Goals scored/conceded ratio
5. League position difference

## 📊 Data Sources
- FBRef.com (primary)
- Football-API
- Historical CSV files
- StatsBomb open data

## ⚠️ Important Notes
1. This repo contains BOTH ML engine AND dashboard
2. Models need retraining for better accuracy
3. Dashboard deployed separately via Vercel
4. Use temperature 0.1 for ML improvements
5. Always validate data quality

## 🐛 Known Issues
- RL model at 43% accuracy (target: 70%)
- Some data collection scripts need optimization
- Dashboard build error fixed in testing/page.tsx

## 📈 Improvement Plan
1. Expand training data to 500k+ matches
2. Implement deep learning models
3. Add real-time odds integration
4. Improve feature engineering
5. Add ensemble voting system

## 🚨 DO NOT
- Train models on fake/synthetic data
- Deploy models below 60% accuracy
- Mix training and test datasets
- Ignore data quality issues

## 💡 ML Tips
- Always validate on unseen data
- Use cross-validation for robustness
- Monitor for data drift
- Keep feature importance logs
- Document model versions

## 📚 Research Notes
- xG (expected goals) improves accuracy
- Weather data has minimal impact
- Injuries/suspensions critical but hard to track
- Betting odds contain valuable signals

---
Last Updated: 2025-08-15
Temperature: 0.1
Current Model Accuracy: 43% (improving)