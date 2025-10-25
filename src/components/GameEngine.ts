/**
 * GameEngine component for central game state management and rule enforcement
 * Integrates ScoreCalculator and SentenceManager to provide complete game functionality
 * Requirements: 1.1, 1.2, 2.1, 2.4, 3.3, 5.1, 5.3
 */

import type { GameState, ScoreResult } from '../types/game.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import { SentenceManager } from './SentenceManager.js';
import { isValidLetter, getTodayDateString } from '../types/validation.js';

/**
 * Result of processing a letter guess in the game
 */
export interface GuessResult {
  /** The letter that was guessed */
  letter: string;
  /** Whether the letter exists in the sentence */
  isCorrect: boolean;
  /** Number of instances of the letter found */
  letterInstances: number;
  /** Score calculation details */
  scoreResult: ScoreResult;
  /** Whether the game is now complete */
  gameComplete: boolean;
  /** Current display sentence with revealed letters */
  displaySentence: string;
}

/**
 * Central game engine that manages game state and coordinates between components
 */
export class GameEngine {
  private scoreCalculator: ScoreCalculator;
  private sentenceManager: SentenceManager;
  private guessedLetters: Set<string> = new Set();
  private gameDate: string = '';
  private isGameComplete: boolean = false;

  constructor() {
    this.scoreCalculator = new ScoreCalculator();
    this.sentenceManager = new SentenceManager();
  }

  /**
   * Initialize a new game session for the specified date
   * Requirements: 1.1, 1.2, 2.4
   */
  async initializeGame(date?: string): Promise<void> {
    // Use provided date or default to today
    this.gameDate = date || getTodayDateString();
    
    // Reset all components to initial state
    this.scoreCalculator.initializeState();
    this.sentenceManager.reset();
    this.guessedLetters.clear();
    this.isGameComplete = false;

    // Load the daily sentence
    await this.sentenceManager.loadDailySentence(this.gameDate);
  }

  /**
   * Process a letter guess and update game state
   * Requirements: 2.1, 3.3, 5.1
   */
  processGuess(letter: string): GuessResult {
    if (!isValidLetter(letter)) {
      throw new Error('Invalid letter provided');
    }

    if (this.isGameComplete) {
      throw new Error('Game is already complete');
    }

    const normalizedLetter = letter.toUpperCase();

    // Check if letter was already guessed
    if (this.guessedLetters.has(normalizedLetter)) {
      throw new Error('Letter has already been guessed');
    }

    // Add letter to guessed set
    this.guessedLetters.add(normalizedLetter);

    // Check if letter exists in sentence and reveal it
    const isCorrect = this.sentenceManager.isLetterInSentence(normalizedLetter);
    const letterInstances = isCorrect ? this.sentenceManager.revealLetter(normalizedLetter) : 0;

    // Calculate score for this guess
    const scoreResult = this.scoreCalculator.calculatePoints(letterInstances, isCorrect);

    // Check if game is now complete
    this.isGameComplete = this.sentenceManager.isComplete();

    // Get current display sentence
    const displaySentence = this.sentenceManager.getDisplaySentence();

    return {
      letter: normalizedLetter,
      isCorrect,
      letterInstances,
      scoreResult,
      gameComplete: this.isGameComplete,
      displaySentence
    };
  }

  /**
   * Get the current game state
   * Requirements: 1.1, 2.4, 3.3, 5.3
   */
  getGameState(): GameState {
    return {
      currentSentence: this.sentenceManager.getOriginalSentence(),
      revealedLetters: this.sentenceManager.getRevealedLetters(),
      guessedLetters: new Set(this.guessedLetters),
      score: this.scoreCalculator.getCurrentScore(),
      streakMultiplier: this.scoreCalculator.getCurrentMultiplier(),
      consecutiveCorrect: this.scoreCalculator.getConsecutiveCorrect(),
      isComplete: this.isGameComplete,
      gameDate: this.gameDate
    };
  }

  /**
   * Check if the game is complete
   * Requirements: 5.1
   */
  isComplete(): boolean {
    return this.isGameComplete;
  }

  /**
   * Get the current score
   * Requirements: 3.3
   */
  getCurrentScore(): number {
    return this.scoreCalculator.getCurrentScore();
  }

  /**
   * Get the current display sentence
   * Requirements: 2.1
   */
  getDisplaySentence(): string {
    return this.sentenceManager.getDisplaySentence();
  }

  /**
   * Get the set of letters that have been guessed
   * Requirements: 2.1
   */
  getGuessedLetters(): Set<string> {
    return new Set(this.guessedLetters);
  }

  /**
   * Get the current streak multiplier
   * Requirements: 3.3
   */
  getCurrentMultiplier(): number {
    return this.scoreCalculator.getCurrentMultiplier();
  }

  /**
   * Get the number of consecutive correct guesses
   * Requirements: 3.3
   */
  getConsecutiveCorrect(): number {
    return this.scoreCalculator.getConsecutiveCorrect();
  }

  /**
   * Get the game date
   * Requirements: 1.2, 2.4
   */
  getGameDate(): string {
    return this.gameDate;
  }

  /**
   * Check if a letter has been guessed
   * Requirements: 2.1
   */
  hasBeenGuessed(letter: string): boolean {
    if (!isValidLetter(letter)) {
      return false;
    }
    return this.guessedLetters.has(letter.toUpperCase());
  }

  /**
   * Get remaining letters that haven't been guessed
   * Requirements: 2.1
   */
  getRemainingLetters(): Set<string> {
    const allLetters = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const remaining = new Set<string>();
    
    for (const letter of allLetters) {
      if (!this.guessedLetters.has(letter)) {
        remaining.add(letter);
      }
    }
    
    return remaining;
  }

  /**
   * Restore game state from a previous session (for persistence)
   * Requirements: 2.4, 5.3
   */
  async restoreGameState(gameState: GameState): Promise<void> {
    this.gameDate = gameState.gameDate;
    
    // Initialize sentence manager with the saved sentence
    await this.sentenceManager.loadDailySentence(this.gameDate);
    
    // Restore revealed letters by processing each one
    for (const letter of gameState.revealedLetters) {
      if (this.sentenceManager.isLetterInSentence(letter)) {
        this.sentenceManager.revealLetter(letter);
      }
    }
    
    // Restore score calculator state
    this.scoreCalculator.initializeState(
      gameState.score,
      gameState.consecutiveCorrect,
      gameState.streakMultiplier
    );
    
    // Restore guessed letters
    this.guessedLetters = new Set(gameState.guessedLetters);
    
    // Restore completion state
    this.isGameComplete = gameState.isComplete;
  }

  /**
   * Reset the game to initial state
   * Requirements: 1.2, 2.4
   */
  reset(): void {
    this.scoreCalculator.initializeState();
    this.sentenceManager.reset();
    this.guessedLetters.clear();
    this.isGameComplete = false;
    this.gameDate = '';
  }
}