/**
 * Type definitions for Cloudflare Workers environment
 */

export interface Env {
  SENTENCES_KV: KVNamespace;
  GAME_DB: D1Database;
  ALLOWED_ORIGINS: string;
  MAX_LEADERBOARD_ENTRIES: string;
  MAX_PLAYER_NAME_LENGTH: string;
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW: string;
  GAME_ANALYTICS?: AnalyticsEngineDataset;
}

export interface SentenceData {
  sentence: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SentenceResponse {
  sentence: string;
  date: string;
  difficulty: string;
  success?: boolean;
}

export interface ScoreSubmissionRequest {
  playerName: string;
  dailyScore: number;
  gameDate: string;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  message?: string;
  playerName?: string;
  dailyScore?: number;
  gameDate?: string;
  cumulativeScore?: number;
  gamesPlayed?: number;
  error?: string;
}

export interface LeaderboardEntry {
  playerName: string;
  cumulativeScore: number;
  gamesPlayed: number;
  lastPlayedDate: string;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  totalPlayers?: number;
  lastUpdated?: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}