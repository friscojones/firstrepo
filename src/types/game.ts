/**
 * Core game data models and interfaces for the Guess the Sentence game
 * Requirements: 1.1, 3.3, 4.4
 */

/**
 * Represents the complete state of a game session
 */
export interface GameState {
  /** The current sentence being guessed */
  currentSentence: string;
  /** Set of letters that have been revealed in the sentence */
  revealedLetters: Set<string>;
  /** Set of all letters that have been guessed by the player */
  guessedLetters: Set<string>;
  /** Current score for this game session */
  score: number;
  /** Current streak multiplier (starts at 1.0, increases by 1.5x for consecutive correct guesses) */
  streakMultiplier: number;
  /** Number of consecutive correct guesses */
  consecutiveCorrect: number;
  /** Whether the game has been completed (all letters revealed) */
  isComplete: boolean;
  /** The date this game session is for (YYYY-MM-DD format) */
  gameDate: string;
}

/**
 * Result of processing a letter guess, including score calculation details
 */
export interface ScoreResult {
  /** Points earned from this guess (can be negative for incorrect guesses) */
  pointsEarned: number;
  /** New total score after applying this guess */
  newTotal: number;
  /** The multiplier that was applied to this guess */
  multiplierUsed: number;
  /** Number of instances of the guessed letter found in the sentence */
  letterInstances: number;
  /** Whether the guess was correct (letter found in sentence) */
  isCorrect: boolean;
}

/**
 * Entry in the global leaderboard showing cumulative player performance
 */
export interface LeaderboardEntry {
  /** Player's chosen display name */
  playerName: string;
  /** Total cumulative score across all games played */
  cumulativeScore: number;
  /** Total number of games completed by this player */
  gamesPlayed: number;
  /** Date of the player's most recent game (YYYY-MM-DD format) */
  lastPlayedDate: string;
}