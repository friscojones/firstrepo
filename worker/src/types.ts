/**
 * Type definitions for the Guess the Sentence Game API
 */

// Request/Response interfaces
export interface SentenceResponse {
  sentence: string;
  date: string;
  difficulty: string;
}

export interface ScoreSubmissionRequest {
  playerName: string;
  dailyScore: number;
  gameDate: string;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  message: string;
  playerName: string;
  dailyScore: number;
  gameDate: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  cumulativeScore: number;
  gamesPlayed: number;
  lastPlayedDate: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
  lastUpdated: string;
}

// Database models
export interface PlayerRecord {
  player_name: string;
  cumulative_score: number;
  games_played: number;
  last_played: string;
  created_at: string;
}

export interface DailyScoreRecord {
  id: number;
  player_name: string;
  game_date: string;
  daily_score: number;
  created_at: string;
}

// KV Store models
export interface SentenceData {
  sentence: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at?: string;
  metadata?: {
    wordCount: number;
    letterCount: number;
    gradeLevel: number;
  };
}

// Error response interface
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}