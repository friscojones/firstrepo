-- Database schema for Guess the Sentence Game
-- This file should be executed to set up the D1 database

-- Players table for storing cumulative scores and player information
CREATE TABLE IF NOT EXISTS players (
    player_name TEXT PRIMARY KEY,
    cumulative_score INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    last_played TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Daily scores table for tracking individual game sessions
CREATE TABLE IF NOT EXISTS daily_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    game_date TEXT NOT NULL,
    daily_score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_name) REFERENCES players(player_name),
    UNIQUE(player_name, game_date)
);

-- Indexes for efficient leaderboard queries
-- Primary index for leaderboard ranking (most important)
CREATE INDEX IF NOT EXISTS idx_players_cumulative_score ON players(cumulative_score DESC);

-- Index for player lookup and updates
CREATE INDEX IF NOT EXISTS idx_players_last_played ON players(last_played);

-- Indexes for daily scores queries
CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(game_date);
CREATE INDEX IF NOT EXISTS idx_daily_scores_player ON daily_scores(player_name);
CREATE INDEX IF NOT EXISTS idx_daily_scores_player_date ON daily_scores(player_name, game_date);

-- Composite index for leaderboard with game count filtering
CREATE INDEX IF NOT EXISTS idx_players_score_games ON players(cumulative_score DESC, games_played);

-- Add constraints for data integrity and security
ALTER TABLE players ADD CONSTRAINT chk_cumulative_score CHECK (cumulative_score >= 0);
ALTER TABLE players ADD CONSTRAINT chk_games_played CHECK (games_played >= 0);
ALTER TABLE players ADD CONSTRAINT chk_player_name_length CHECK (length(player_name) <= 50 AND length(player_name) > 0);

ALTER TABLE daily_scores ADD CONSTRAINT chk_daily_score CHECK (daily_score >= 0 AND daily_score <= 1000);

-- Create view for safe leaderboard access (limits data exposure)
CREATE VIEW IF NOT EXISTS leaderboard_view AS
SELECT 
    player_name,
    cumulative_score,
    games_played,
    last_played
FROM players
WHERE games_played > 0
ORDER BY cumulative_score DESC;

-- Sample data for testing and demonstration (remove in production)
-- INSERT OR IGNORE INTO players (player_name, cumulative_score, games_played, last_played) 
-- VALUES 
--     ('TestPlayer1', 450, 8, '2024-10-25'),
--     ('TestPlayer2', 380, 6, '2024-10-25');