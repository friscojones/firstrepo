/**
 * API request and response type definitions for Cloudflare Workers integration
 * Requirements: 1.1, 3.3, 4.4
 */

/**
 * Response from the daily sentence API endpoint
 */
export interface SentenceResponse {
  /** The sentence content for the specified date */
  sentence: string;
  /** The date this sentence is for (YYYY-MM-DD format) */
  date: string;
  /** Difficulty level indicator for the sentence */
  difficulty: string;
  /** Success status of the API call */
  success: boolean;
  /** Optional error message if the request failed */
  error?: string;
}

/**
 * Request payload for submitting a daily score to the leaderboard
 */
export interface ScoreSubmissionRequest {
  /** Player's chosen display name */
  playerName: string;
  /** Score achieved for this daily game */
  dailyScore: number;
  /** Date of the game session (YYYY-MM-DD format) */
  gameDate: string;
}

/**
 * Response from the score submission API endpoint
 */
export interface ScoreSubmissionResponse {
  /** Success status of the submission */
  success: boolean;
  /** Updated cumulative score for the player */
  cumulativeScore?: number;
  /** Total number of games played by this player */
  gamesPlayed?: number;
  /** Optional error message if submission failed */
  error?: string;
}

/**
 * Response from the leaderboard API endpoint
 */
export interface LeaderboardResponse {
  /** Success status of the request */
  success: boolean;
  /** Array of top players sorted by cumulative score */
  leaderboard?: LeaderboardEntry[];
  /** Optional error message if the request failed */
  error?: string;
}

/**
 * Import LeaderboardEntry from game types
 */
import type { LeaderboardEntry } from './game.js';

/**
 * Generic API error response structure
 */
export interface ApiError {
  /** Error message describing what went wrong */
  message: string;
  /** HTTP status code */
  status: number;
  /** Optional error code for client-side handling */
  code?: string;
}