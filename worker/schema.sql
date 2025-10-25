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

-- Sample data for testing and demonstration
INSERT OR IGNORE INTO players (player_name, cumulative_score, games_played, last_played) 
VALUES 
    ('Alice', 450, 8, '2024-10-25'),
    ('Bob', 380, 6, '2024-10-25'),
    ('Charlie', 520, 10, '2024-10-24'),
    ('Diana', 290, 5, '2024-10-23'),
    ('Emma', 610, 12, '2024-10-25'),
    ('Frank', 340, 7, '2024-10-22'),
    ('Grace', 475, 9, '2024-10-24'),
    ('Henry', 220, 4, '2024-10-21'),
    ('Ivy', 395, 8, '2024-10-25'),
    ('Jack', 180, 3, '2024-10-20');

-- Sample daily scores to show score progression
INSERT OR IGNORE INTO daily_scores (player_name, game_date, daily_score) 
VALUES 
    ('Alice', '2024-10-20', 45),
    ('Alice', '2024-10-21', 52),
    ('Alice', '2024-10-22', 48),
    ('Bob', '2024-10-20', 38),
    ('Bob', '2024-10-21', 42),
    ('Charlie', '2024-10-19', 55),
    ('Charlie', '2024-10-20', 48),
    ('Charlie', '2024-10-21', 62),
    ('Emma', '2024-10-18', 58),
    ('Emma', '2024-10-19', 51),
    ('Emma', '2024-10-20', 49);