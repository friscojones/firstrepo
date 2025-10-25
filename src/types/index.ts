/**
 * Main exports for game types and validation functions
 * Requirements: 1.1, 3.3, 4.4
 */

// Game state and core interfaces
export type {
  GameState,
  ScoreResult,
  LeaderboardEntry
} from './game.js';

// API request/response interfaces
export type {
  SentenceResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  LeaderboardResponse,
  ApiError
} from './api.js';

// Validation functions
export {
  isValidLetter,
  isValidPlayerName,
  isValidGameDate,
  isValidScore,
  isValidSentence,
  isValidMultiplier,
  sanitizePlayerName,
  normalizeLetter,
  getTodayDateString
} from './validation.js';