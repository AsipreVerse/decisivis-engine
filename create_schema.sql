-- Clean Database Schema for Quality Football Matches
-- Designed for 11,669 matches with complete data

CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    
    -- Core match data
    division VARCHAR(10) NOT NULL,
    match_date DATE NOT NULL,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    home_goals INTEGER NOT NULL,
    away_goals INTEGER NOT NULL,
    result CHAR(1) NOT NULL CHECK (result IN ('H', 'D', 'A')),
    
    -- Real shots on target (validated, not estimated)
    home_shots_on_target INTEGER NOT NULL,
    away_shots_on_target INTEGER NOT NULL,
    home_shots INTEGER,
    away_shots INTEGER,
    
    -- Dual Elo system
    home_elo_external FLOAT,  -- From CSV (11,669 matches have this)
    away_elo_external FLOAT,  
    home_elo_custom FLOAT,     -- Our calculation (all 15,102 will have this)
    away_elo_custom FLOAT,
    
    -- Form data (100% coverage in our dataset)
    home_form_3 FLOAT NOT NULL,
    home_form_5 FLOAT NOT NULL,
    away_form_3 FLOAT NOT NULL,
    away_form_5 FLOAT NOT NULL,
    
    -- Additional stats
    home_corners INTEGER,
    away_corners INTEGER,
    home_fouls INTEGER,
    away_fouls INTEGER,
    home_yellow INTEGER,
    away_yellow INTEGER,
    home_red INTEGER,
    away_red INTEGER,
    
    -- Calculated features
    h2h_score FLOAT,
    shot_diff INTEGER GENERATED ALWAYS AS (home_shots_on_target - away_shots_on_target) STORED,
    elo_diff_external FLOAT GENERATED ALWAYS AS (home_elo_external - away_elo_external) STORED,
    elo_diff_custom FLOAT GENERATED ALWAYS AS (home_elo_custom - away_elo_custom) STORED,
    form5_diff FLOAT GENERATED ALWAYS AS (home_form_5 - away_form_5) STORED,
    
    -- Metadata
    data_quality VARCHAR(20) DEFAULT 'verified',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_shots CHECK (home_goals <= home_shots_on_target AND away_goals <= away_shots_on_target),
    CONSTRAINT not_estimated CHECK (
        home_shots_on_target != home_goals + 2 AND 
        away_shots_on_target != away_goals + 2
    )
);

-- Indexes for performance
CREATE INDEX idx_match_date ON matches(match_date);
CREATE INDEX idx_teams ON matches(home_team, away_team);
CREATE INDEX idx_division ON matches(division);
CREATE INDEX idx_result ON matches(result);
CREATE INDEX idx_elo_external ON matches(home_elo_external, away_elo_external);
CREATE INDEX idx_elo_custom ON matches(home_elo_custom, away_elo_custom);

-- Elo ratings table for tracking
CREATE TABLE elo_ratings (
    id SERIAL PRIMARY KEY,
    team VARCHAR(100) NOT NULL,
    rating FLOAT NOT NULL DEFAULT 1500,
    games_played INTEGER DEFAULT 0,
    last_updated DATE,
    rating_source VARCHAR(20) DEFAULT 'custom', -- 'external' or 'custom'
    UNIQUE(team)
);

CREATE INDEX idx_elo_team ON elo_ratings(team);
CREATE INDEX idx_elo_rating ON elo_ratings(rating);

-- Predictions table for tracking model performance
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id),
    predicted_result CHAR(1),
    home_prob FLOAT,
    draw_prob FLOAT,
    away_prob FLOAT,
    confidence FLOAT,
    actual_result CHAR(1),
    is_correct BOOLEAN,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pred_match ON predictions(match_id);
CREATE INDEX idx_pred_correct ON predictions(is_correct);
CREATE INDEX idx_pred_confidence ON predictions(confidence);

-- View for easy querying
CREATE VIEW quality_matches AS
SELECT 
    m.*,
    COALESCE(m.home_elo_external, m.home_elo_custom) as home_elo_best,
    COALESCE(m.away_elo_external, m.away_elo_custom) as away_elo_best,
    CASE 
        WHEN m.home_elo_external IS NOT NULL THEN 'external'
        ELSE 'custom'
    END as elo_source
FROM matches m
WHERE m.data_quality = 'verified';

-- Summary statistics view
CREATE VIEW match_statistics AS
SELECT 
    division,
    COUNT(*) as total_matches,
    AVG(CASE WHEN result = 'H' THEN 1 ELSE 0 END) as home_win_rate,
    AVG(CASE WHEN result = 'D' THEN 1 ELSE 0 END) as draw_rate,
    AVG(CASE WHEN result = 'A' THEN 1 ELSE 0 END) as away_win_rate,
    AVG(home_goals + away_goals) as avg_total_goals,
    AVG(home_shots_on_target + away_shots_on_target) as avg_total_shots_on_target,
    COUNT(DISTINCT home_team) + COUNT(DISTINCT away_team) as unique_teams,
    MIN(match_date) as earliest_match,
    MAX(match_date) as latest_match
FROM matches
GROUP BY division;