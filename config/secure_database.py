#!/usr/bin/env python3
"""
Secure Database Connection Management
Prevents SQL injection and manages connection pooling
"""

import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor
import logging
from typing import Optional, Dict, List, Any, Tuple
from contextlib import contextmanager
import time

logger = logging.getLogger(__name__)

class SecureDatabase:
    """Secure database connection with parameterized queries"""
    
    def __init__(self, database_url: str, min_conn: int = 1, max_conn: int = 10):
        """Initialize connection pool"""
        self.database_url = database_url
        self.connection_pool = None
        self.init_pool(min_conn, max_conn)
    
    def init_pool(self, min_conn: int, max_conn: int):
        """Initialize connection pool"""
        try:
            self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                self.database_url
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get connection from pool with automatic cleanup"""
        conn = None
        try:
            conn = self.connection_pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                self.connection_pool.putconn(conn)
    
    @contextmanager
    def get_cursor(self, dict_cursor: bool = True):
        """Get cursor with automatic cleanup"""
        with self.get_connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cur = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cur
            finally:
                cur.close()
    
    def execute_query(self, query: str, params: Optional[Tuple] = None) -> List[Dict]:
        """Execute SELECT query with parameters"""
        with self.get_cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    
    def execute_update(self, query: str, params: Optional[Tuple] = None) -> int:
        """Execute INSERT/UPDATE/DELETE with parameters"""
        with self.get_cursor(dict_cursor=False) as cur:
            cur.execute(query, params)
            return cur.rowcount
    
    def execute_many(self, query: str, params_list: List[Tuple]) -> int:
        """Execute multiple statements efficiently"""
        with self.get_cursor(dict_cursor=False) as cur:
            cur.executemany(query, params_list)
            return cur.rowcount
    
    def insert_match(self, match_data: Dict) -> Optional[int]:
        """Insert match with SQL injection prevention"""
        query = """
            INSERT INTO matches (
                division, match_date, home_team, away_team,
                home_goals, away_goals, home_shots_on_target, 
                away_shots_on_target, result
            ) VALUES (
                %(division)s, %(match_date)s, %(home_team)s, %(away_team)s,
                %(home_goals)s, %(away_goals)s, %(home_shots_on_target)s,
                %(away_shots_on_target)s, %(result)s
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """
        
        with self.get_cursor() as cur:
            cur.execute(query, match_data)
            result = cur.fetchone()
            return result['id'] if result else None
    
    def get_recent_matches(self, team: str, limit: int = 5) -> List[Dict]:
        """Get recent matches for a team (SQL injection safe)"""
        query = """
            SELECT * FROM matches
            WHERE (home_team = %s OR away_team = %s)
                AND home_shots_on_target IS NOT NULL
                AND away_shots_on_target IS NOT NULL
            ORDER BY match_date DESC
            LIMIT %s
        """
        return self.execute_query(query, (team, team, limit))
    
    def get_head_to_head(self, home_team: str, away_team: str, limit: int = 5) -> List[Dict]:
        """Get H2H matches (SQL injection safe)"""
        query = """
            SELECT * FROM matches
            WHERE ((home_team = %s AND away_team = %s) 
                OR (home_team = %s AND away_team = %s))
                AND home_shots_on_target IS NOT NULL
            ORDER BY match_date DESC
            LIMIT %s
        """
        return self.execute_query(query, (home_team, away_team, away_team, home_team, limit))
    
    def validate_data_quality(self) -> Dict[str, int]:
        """Validate data quality (no fake shots on target)"""
        query = """
            WITH quality_check AS (
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE 
                        WHEN home_shots_on_target = home_goals + 2 
                        OR away_shots_on_target = away_goals + 2 
                        THEN 1 
                    END) as fake_data,
                    COUNT(CASE 
                        WHEN home_shots_on_target IS NOT NULL 
                        AND away_shots_on_target IS NOT NULL 
                        THEN 1 
                    END) as complete_data
                FROM matches
            )
            SELECT * FROM quality_check
        """
        
        result = self.execute_query(query)[0]
        return {
            'total_matches': result['total'],
            'fake_data_count': result['fake_data'],
            'complete_data_count': result['complete_data'],
            'data_quality_score': round(
                (result['complete_data'] - result['fake_data']) / max(result['total'], 1) * 100, 2
            )
        }
    
    def clean_fake_data(self) -> int:
        """Remove matches with fake shots on target data"""
        query = """
            DELETE FROM matches
            WHERE home_shots_on_target = home_goals + 2
               OR away_shots_on_target = away_goals + 2
        """
        return self.execute_update(query)
    
    def close(self):
        """Close all connections in pool"""
        if self.connection_pool:
            self.connection_pool.closeall()
            logger.info("Database connection pool closed")

# Singleton instance
_db_instance: Optional[SecureDatabase] = None

def get_secure_db(database_url: Optional[str] = None) -> SecureDatabase:
    """Get or create secure database instance"""
    global _db_instance
    
    if _db_instance is None:
        if database_url is None:
            from config.secure_config import get_config
            database_url = get_config().database_url
        
        _db_instance = SecureDatabase(database_url)
    
    return _db_instance

def close_db():
    """Close database connections"""
    global _db_instance
    if _db_instance:
        _db_instance.close()
        _db_instance = None