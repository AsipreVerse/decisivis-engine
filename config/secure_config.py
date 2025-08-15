#!/usr/bin/env python3
"""
Secure Configuration Management
Handles all environment variables and credentials securely
NO HARDCODED SECRETS
"""

import os
import sys
from typing import Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ConfigurationError(Exception):
    """Raised when required configuration is missing"""
    pass

class SecureConfig:
    """Secure configuration management with validation"""
    
    def __init__(self):
        self.load_env_file()
        self.validate_required_vars()
    
    def load_env_file(self):
        """Load .env file if it exists"""
        env_path = Path(__file__).parent.parent / '.env'
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        # Only set if not already in environment
                        if key not in os.environ:
                            os.environ[key] = value.strip('"').strip("'")
    
    def validate_required_vars(self):
        """Validate that required environment variables are set"""
        required = [
            'DATABASE_URL',
            'API_KEY'
            # NEXTAUTH_SECRET is only for frontend, not needed in Python API
        ]
        
        missing = []
        for var in required:
            if not os.getenv(var):
                missing.append(var)
        
        if missing and not os.getenv('ALLOW_MISSING_ENV'):
            logger.error(f"Missing required environment variables: {missing}")
            logger.error("Please set these in your .env file or environment")
            raise ConfigurationError(f"Missing required environment variables: {missing}")
    
    @property
    def database_url(self) -> str:
        """Get database URL securely"""
        url = os.getenv('DATABASE_URL')
        if not url:
            raise ConfigurationError("DATABASE_URL not configured")
        return url
    
    @property
    def api_key(self) -> str:
        """Get API key securely"""
        key = os.getenv('API_KEY')
        if not key:
            # Generate a secure random key if not set
            import secrets
            key = secrets.token_urlsafe(32)
            logger.warning("API_KEY not set, using generated key (set in production!)")
        return key
    
    @property
    def redis_url(self) -> Optional[str]:
        """Get Redis URL if configured"""
        return os.getenv('REDIS_URL') or os.getenv('KV_REST_API_URL')
    
    @property
    def football_api_key(self) -> Optional[str]:
        """Get Football API key"""
        return os.getenv('FOOTBALL_API_KEY') or os.getenv('API_FOOTBALL_KEY')
    
    @property
    def odds_api_key(self) -> Optional[str]:
        """Get Odds API key"""
        return os.getenv('ODDS_API_KEY') or os.getenv('THE_ODDS_API_KEY')
    
    @property
    def jwt_secret(self) -> str:
        """Get JWT secret for token generation"""
        secret = os.getenv('JWT_SECRET')
        if not secret:
            import secrets
            secret = secrets.token_urlsafe(64)
            logger.warning("JWT_SECRET not set, using generated secret (set in production!)")
        return secret
    
    @property
    def environment(self) -> str:
        """Get environment (development/production)"""
        return os.getenv('ENVIRONMENT', 'development')
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() == 'production'
    
    @property
    def debug(self) -> bool:
        """Check if debug mode is enabled"""
        return os.getenv('DEBUG', 'False').lower() == 'true' and not self.is_production
    
    def get_safe_database_url(self) -> str:
        """Get database URL with password masked for logging"""
        url = self.database_url
        if '@' in url:
            # Mask password in connection string
            parts = url.split('@')
            if ':' in parts[0]:
                user_pass = parts[0].split('://')[-1]
                if ':' in user_pass:
                    user = user_pass.split(':')[0]
                    masked = f"{parts[0].split('://')[0]}://{user}:****@{parts[1]}"
                    return masked
        return "DATABASE_URL_CONFIGURED"

# Global config instance
config = SecureConfig() if os.getenv('SKIP_CONFIG_INIT') != 'true' else None

def get_config() -> SecureConfig:
    """Get or create config instance"""
    global config
    if config is None:
        config = SecureConfig()
    return config