#!/usr/bin/env python3
"""
Secure Authentication System
Handles user authentication and JWT tokens
"""

import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional, Dict
import jwt
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

class AuthenticationError(Exception):
    """Raised when authentication fails"""
    pass

class SecureAuth:
    """Secure authentication with JWT and password hashing"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', secrets.token_urlsafe(64))
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
        self.model_access_password = os.getenv('MODEL_ACCESS_PASSWORD')
        
        # Default secure password if not set
        if not self.model_access_password:
            self.model_access_password = self.hash_password("Decisivis2025!Secure")
            logger.warning("Using default model password. Change in production!")
        elif not self.model_access_password.startswith('$'):
            # Hash plain text password from env
            self.model_access_password = self.hash_password(self.model_access_password)
    
    def hash_password(self, password: str) -> str:
        """Hash password using Argon2"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False
    
    def verify_model_access(self, password: str) -> bool:
        """Verify password for model access"""
        return self.verify_password(password, self.model_access_password)
    
    def create_access_token(self, data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt
    
    def decode_token(self, token: str) -> Dict:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError as e:
            raise AuthenticationError(f"Invalid token: {e}")
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user and return tokens"""
        # Check admin credentials
        admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        admin_password_hash = os.getenv('ADMIN_PASSWORD_HASH')
        
        if not admin_password_hash:
            # Default admin password (change in production!)
            admin_password_hash = self.hash_password('Decisivis2025!Admin')
        
        if username == admin_username and self.verify_password(password, admin_password_hash):
            # Create tokens
            user_data = {"username": username, "role": "admin"}
            access_token = self.create_access_token(user_data)
            refresh_token = self.create_refresh_token(user_data)
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": user_data
            }
        
        return None
    
    def generate_api_key(self) -> str:
        """Generate secure API key"""
        return secrets.token_urlsafe(32)
    
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key"""
        stored_key = os.getenv('API_KEY')
        if not stored_key:
            return False
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(api_key, stored_key)

# Global auth instance
auth = SecureAuth()

def get_auth() -> SecureAuth:
    """Get auth instance"""
    return auth