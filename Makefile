# Decisivis Core Makefile
# Simple commands for development and deployment

.PHONY: help install setup fetch-data train test predict deploy clean

help:
	@echo "Decisivis Core - Football Prediction (80/20 Principle)"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install Python dependencies"
	@echo "  make setup        - Setup database tables"
	@echo "  make fetch-data   - Fetch all StatsBomb matches (3500+)"
	@echo "  make train        - Train LogisticRegression model"
	@echo "  make test         - Run all tests"
	@echo "  make predict      - Start prediction API server"
	@echo "  make deploy       - Deploy to Vercel"
	@echo "  make clean        - Remove cache and temp files"

install:
	pip install -r requirements.txt
	@echo "✅ Dependencies installed"

setup:
	python src/data/statsbomb.py --setup-only
	@echo "✅ Database tables created"

fetch-data:
	@echo "📡 Fetching StatsBomb data (this will take ~10-15 minutes)..."
	python src/data/statsbomb.py
	@echo "✅ Data fetched successfully"

train:
	python src/models/train.py
	@echo "✅ Model trained"

test:
	pytest tests/ -v
	@echo "✅ All tests passed"

test-accuracy:
	pytest tests/test_model.py::test_accuracy -v

test-api:
	pytest tests/test_api.py::test_response_time -v

predict:
	uvicorn src.api.server:app --reload --host 0.0.0.0 --port 8000

deploy:
	@echo "📦 Deploying to Vercel..."
	vercel --prod
	@echo "✅ Deployed successfully"

monitor:
	python src/utils/monitoring.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	@echo "✅ Cleaned cache files"

# Development shortcuts
dev: install setup fetch-data train test
	@echo "✅ Development environment ready"

quick-test:
	python -c "from src.data.statsbomb import StatsBombFetcher; f = StatsBombFetcher(); f.setup_database(); print('✅ Database connection working')"

check-accuracy:
	@python -c "import psycopg2; conn = psycopg2.connect('$(DATABASE_URL)'); cur = conn.cursor(); cur.execute('SELECT COUNT(*) FROM matches WHERE home_shots_on_target IS NOT NULL'); print(f'Matches with shots data: {cur.fetchone()[0]}')"

# Production commands
prod-stats:
	@python src/utils/stats.py

prod-retrain:
	python src/models/self_learning.py --retrain

prod-backup:
	pg_dump $(DATABASE_URL) > backup_$(shell date +%Y%m%d).sql
	@echo "✅ Database backed up"