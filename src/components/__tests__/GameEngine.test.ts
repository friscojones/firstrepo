/**
 * Unit tests for GameEngine component
 * Requirements: 1.1, 1.2, 2.1, 2.4, 3.3, 5.1, 5.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import type { GameState } from '../../types/game.js';

// Mock fetch for testing API calls
const mockFetch = vi.fn();
(globalThis as typeof globalThis & { fetch: typeof mockFetch }).fetch = mockFetch;

describe('GameEngine', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    vi.clearAllMocks();
    
    // Setup default mock response for sentence loading
    const mockResponse = {
      success: true,
      sentence: 'Hello World!',
      date: '2024-01-01',
      difficulty: 'easy'
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });
  });

  describe('Game initialization', () => {
    it('should initialize game with provided date', async () => {
      await gameEngine.initializeGame('2024-01-01');
      
      const gameState = gameEngine.getGameState();
      expect(gameState.gameDate).toBe('2024-01-01');
      expect(gameState.currentSentence).toBe('Hello World!');
      expect(gameState.score).toBe(0);
      expect(gameState.streakMultiplier).toBe(1.0);
      expect(gameState.consecutiveCorrect).toBe(0);
      expect(gameState.isComplete).toBe(false);
      expect(gameState.guessedLetters.size).toBe(0);
      expect(gameState.revealedLetters.size).toBe(0);
    });

    it('should initialize game with current date when no date provided', async () => {
      await gameEngine.initializeGame();
      
      const gameState = gameEngine.getGameState();
      // Should use today's date in YYYY-MM-DD format
      expect(gameState.gameDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should reset state when initializing new game', async () => {
      // Set up some initial state
      await gameEngine.initializeGame('2024-01-01');
      gameEngine.processGuess('H');
      gameEngine.processGuess('E');
      
      expect(gameEngine.getCurrentScore()).toBeGreaterThan(0);
      expect(gameEngine.getGuessedLetters().size).toBeGreaterThan(0);
      
      // Initialize new game
      await gameEngine.initializeGame('2024-01-02');
      
      const gameState = gameEngine.getGameState();
      expect(gameState.score).toBe(0);
      expect(gameState.guessedLetters.size).toBe(0);
      expect(gameState.revealedLetters.size).toBe(0);
      expect(gameState.gameDate).toBe('2024-01-02');
    });
  });

  describe('Letter guess processing', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame('2024-01-01');
    });

    it('should process correct letter guess successfully', () => {
      const result = gameEngine.processGuess('H');
      
      expect(result.letter).toBe('H');
      expect(result.isCorrect).toBe(true);
      expect(result.letterInstances).toBe(1); // 'H' appears once in "Hello World!"
      expect(result.scoreResult.pointsEarned).toBe(10);
      expect(result.scoreResult.newTotal).toBe(10);
      expect(result.scoreResult.multiplierUsed).toBe(1.0);
      expect(result.gameComplete).toBe(false);
      expect(result.displaySentence).toBe('H____ _____!');
    });

    it('should process incorrect letter guess successfully', () => {
      const result = gameEngine.processGuess('Z');
      
      expect(result.letter).toBe('Z');
      expect(result.isCorrect).toBe(false);
      expect(result.letterInstances).toBe(0);
      expect(result.scoreResult.pointsEarned).toBe(-10);
      expect(result.scoreResult.newTotal).toBe(0); // Can't go below 0
      expect(result.scoreResult.multiplierUsed).toBe(1.0);
      expect(result.gameComplete).toBe(false);
      expect(result.displaySentence).toBe('_____ _____!');
    });

    it('should handle case-insensitive letter guessing', () => {
      const result1 = gameEngine.processGuess('h');
      const result2 = gameEngine.processGuess('L'); // Should work since 'h' was already guessed as 'H'
      
      expect(result1.letter).toBe('H');
      expect(result1.isCorrect).toBe(true);
      
      expect(result2.letter).toBe('L');
      expect(result2.isCorrect).toBe(true);
      expect(result2.letterInstances).toBe(3); // 'L' appears 3 times in "Hello World!"
    });

    it('should prevent duplicate letter guesses', () => {
      gameEngine.processGuess('H');
      
      expect(() => gameEngine.processGuess('H')).toThrow('Letter has already been guessed');
      expect(() => gameEngine.processGuess('h')).toThrow('Letter has already been guessed');
    });

    it('should validate letter input', () => {
      expect(() => gameEngine.processGuess('')).toThrow('Invalid letter provided');
      expect(() => gameEngine.processGuess('12')).toThrow('Invalid letter provided');
      expect(() => gameEngine.processGuess('AB')).toThrow('Invalid letter provided');
    });

    it('should prevent guesses after game completion', async () => {
      // Complete the game by guessing all letters
      const uniqueLetters = ['H', 'E', 'L', 'O', 'W', 'R', 'D']; // Unique letters in "Hello World!"
      
      for (const letter of uniqueLetters) {
        gameEngine.processGuess(letter);
      }
      
      expect(gameEngine.isComplete()).toBe(true);
      expect(() => gameEngine.processGuess('A')).toThrow('Game is already complete');
    });
  });

  describe('Integration between scoring and sentence management', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame('2024-01-01');
    });

    it('should apply multiplier progression correctly', () => {
      // First correct guess - no multiplier
      const result1 = gameEngine.processGuess('H');
      expect(result1.scoreResult.multiplierUsed).toBe(1.0);
      expect(result1.scoreResult.pointsEarned).toBe(10);
      expect(gameEngine.getCurrentMultiplier()).toBe(1.5);
      
      // Second correct guess - 1.5x multiplier
      const result2 = gameEngine.processGuess('L');
      expect(result2.scoreResult.multiplierUsed).toBe(1.5);
      expect(result2.scoreResult.pointsEarned).toBe(45); // 10 * 3 * 1.5 = 45
      expect(gameEngine.getCurrentMultiplier()).toBe(2.25);
      
      // Third correct guess - 2.25x multiplier
      const result3 = gameEngine.processGuess('O');
      expect(result3.scoreResult.multiplierUsed).toBe(2.25);
      expect(result3.scoreResult.pointsEarned).toBe(45); // 10 * 2 * 2.25 = 45
    });

    it('should reset multiplier on incorrect guess', () => {
      // Build up multiplier
      gameEngine.processGuess('H');
      gameEngine.processGuess('L');
      expect(gameEngine.getCurrentMultiplier()).toBe(2.25);
      
      // Make incorrect guess
      const result = gameEngine.processGuess('Z');
      expect(result.scoreResult.multiplierUsed).toBe(1.0);
      expect(gameEngine.getCurrentMultiplier()).toBe(1.0);
      expect(gameEngine.getConsecutiveCorrect()).toBe(0);
      
      // Next correct guess should use 1.0 multiplier
      const nextResult = gameEngine.processGuess('E');
      expect(nextResult.scoreResult.multiplierUsed).toBe(1.0);
    });

    it('should track game completion correctly', () => {
      expect(gameEngine.isComplete()).toBe(false);
      
      // Guess some letters but not all
      gameEngine.processGuess('H');
      gameEngine.processGuess('E');
      expect(gameEngine.isComplete()).toBe(false);
      
      // Complete the game
      const uniqueLetters = ['L', 'O', 'W', 'R', 'D']; // Remaining unique letters
      for (const letter of uniqueLetters) {
        const result = gameEngine.processGuess(letter);
        if (letter === 'D') { // Last letter
          expect(result.gameComplete).toBe(true);
        }
      }
      
      expect(gameEngine.isComplete()).toBe(true);
    });

    it('should update display sentence correctly', () => {
      expect(gameEngine.getDisplaySentence()).toBe('_____ _____!');
      
      gameEngine.processGuess('H');
      expect(gameEngine.getDisplaySentence()).toBe('H____ _____!');
      
      gameEngine.processGuess('L');
      expect(gameEngine.getDisplaySentence()).toBe('H_ll_ ___l_!');
      
      gameEngine.processGuess('O');
      expect(gameEngine.getDisplaySentence()).toBe('H_llo _o_l_!');
    });
  });

  describe('Game state management', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame('2024-01-01');
    });

    it('should provide complete game state', () => {
      gameEngine.processGuess('H');
      gameEngine.processGuess('L');
      
      const gameState = gameEngine.getGameState();
      
      expect(gameState.currentSentence).toBe('Hello World!');
      expect(gameState.revealedLetters.has('H')).toBe(true);
      expect(gameState.revealedLetters.has('L')).toBe(true);
      expect(gameState.guessedLetters.has('H')).toBe(true);
      expect(gameState.guessedLetters.has('L')).toBe(true);
      expect(gameState.score).toBe(55); // 10 + 45 (with 1.5x multiplier)
      expect(gameState.streakMultiplier).toBe(2.25);
      expect(gameState.consecutiveCorrect).toBe(2);
      expect(gameState.isComplete).toBe(false);
      expect(gameState.gameDate).toBe('2024-01-01');
    });

    it('should track guessed letters correctly', () => {
      expect(gameEngine.hasBeenGuessed('H')).toBe(false);
      expect(gameEngine.getGuessedLetters().size).toBe(0);
      
      gameEngine.processGuess('H');
      expect(gameEngine.hasBeenGuessed('H')).toBe(true);
      expect(gameEngine.hasBeenGuessed('h')).toBe(true); // Case insensitive
      expect(gameEngine.getGuessedLetters().has('H')).toBe(true);
      expect(gameEngine.getGuessedLetters().size).toBe(1);
      
      gameEngine.processGuess('Z');
      expect(gameEngine.hasBeenGuessed('Z')).toBe(true);
      expect(gameEngine.getGuessedLetters().size).toBe(2);
    });

    it('should provide remaining letters', () => {
      const initialRemaining = gameEngine.getRemainingLetters();
      expect(initialRemaining.size).toBe(26);
      
      gameEngine.processGuess('H');
      gameEngine.processGuess('L');
      
      const remaining = gameEngine.getRemainingLetters();
      expect(remaining.size).toBe(24);
      expect(remaining.has('H')).toBe(false);
      expect(remaining.has('L')).toBe(false);
      expect(remaining.has('A')).toBe(true);
    });
  });

  describe('Game state persistence and restoration', () => {
    it('should restore game state correctly', async () => {
      // Create a game state to restore
      const gameStateToRestore: GameState = {
        currentSentence: 'Hello World!',
        revealedLetters: new Set(['H', 'L']),
        guessedLetters: new Set(['H', 'L', 'Z']),
        score: 45,
        streakMultiplier: 2.25,
        consecutiveCorrect: 2,
        isComplete: false,
        gameDate: '2024-01-01'
      };
      
      await gameEngine.restoreGameState(gameStateToRestore);
      
      const restoredState = gameEngine.getGameState();
      expect(restoredState.currentSentence).toBe('Hello World!');
      expect(restoredState.revealedLetters.has('H')).toBe(true);
      expect(restoredState.revealedLetters.has('L')).toBe(true);
      expect(restoredState.guessedLetters.has('H')).toBe(true);
      expect(restoredState.guessedLetters.has('L')).toBe(true);
      expect(restoredState.guessedLetters.has('Z')).toBe(true);
      expect(restoredState.score).toBe(45);
      expect(restoredState.streakMultiplier).toBe(2.25);
      expect(restoredState.consecutiveCorrect).toBe(2);
      expect(restoredState.isComplete).toBe(false);
      expect(restoredState.gameDate).toBe('2024-01-01');
      
      // Verify display sentence is correct
      expect(gameEngine.getDisplaySentence()).toBe('H_ll_ ___l_!');
    });

    it('should handle complete game state restoration', async () => {
      const completeGameState: GameState = {
        currentSentence: 'Hello World!',
        revealedLetters: new Set(['H', 'E', 'L', 'O', 'W', 'R', 'D']),
        guessedLetters: new Set(['H', 'E', 'L', 'O', 'W', 'R', 'D']),
        score: 200,
        streakMultiplier: 11.39,
        consecutiveCorrect: 7,
        isComplete: true,
        gameDate: '2024-01-01'
      };
      
      await gameEngine.restoreGameState(completeGameState);
      
      expect(gameEngine.isComplete()).toBe(true);
      expect(gameEngine.getDisplaySentence()).toBe('Hello World!');
      expect(() => gameEngine.processGuess('A')).toThrow('Game is already complete');
    });
  });

  describe('Daily reset functionality', () => {
    it('should reset game state completely', async () => {
      // Set up some game state
      await gameEngine.initializeGame('2024-01-01');
      gameEngine.processGuess('H');
      gameEngine.processGuess('L');
      
      expect(gameEngine.getCurrentScore()).toBeGreaterThan(0);
      expect(gameEngine.getGuessedLetters().size).toBeGreaterThan(0);
      
      // Reset the game
      gameEngine.reset();
      
      expect(gameEngine.getCurrentScore()).toBe(0);
      expect(gameEngine.getGuessedLetters().size).toBe(0);
      expect(gameEngine.getDisplaySentence()).toBe('');
      expect(gameEngine.getGameDate()).toBe('');
      expect(gameEngine.isComplete()).toBe(false);
    });

    it('should allow new game after reset', async () => {
      // Play a game
      await gameEngine.initializeGame('2024-01-01');
      gameEngine.processGuess('H');
      
      // Reset and start new game
      gameEngine.reset();
      await gameEngine.initializeGame('2024-01-02');
      
      // Should be able to guess same letter again
      const result = gameEngine.processGuess('H');
      expect(result.isCorrect).toBe(true);
      expect(gameEngine.getCurrentScore()).toBe(10);
    });
  });

  describe('Edge cases and error handling', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame('2024-01-01');
    });

    it('should handle invalid letter validation', () => {
      expect(gameEngine.hasBeenGuessed('')).toBe(false);
      expect(gameEngine.hasBeenGuessed('12')).toBe(false);
      expect(gameEngine.hasBeenGuessed('AB')).toBe(false);
    });

    it('should handle sentence loading failures gracefully', async () => {
      // Import the API client to clear its cache
      const { apiClient } = await import('../../services/apiClient.js');
      
      // Create a fresh GameEngine instance to avoid cached state
      const freshGameEngine = new GameEngine();
      
      // Clear existing mocks, API cache, and set up failure
      vi.clearAllMocks();
      apiClient.clearCache();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Should still initialize with fallback sentence
      await freshGameEngine.initializeGame('2024-01-01');
      
      const gameState = freshGameEngine.getGameState();
      expect(gameState.currentSentence).toBe('Reading books helps students learn new words and ideas.');
    });

    it('should maintain state consistency during gameplay', () => {
      // Process multiple guesses and verify state remains consistent
      const letters = ['H', 'E', 'L', 'Z', 'O', 'X', 'W'];
      
      for (const letter of letters) {
        const result = gameEngine.processGuess(letter);
        const gameState = gameEngine.getGameState();
        
        // Verify consistency
        expect(gameState.guessedLetters.has(letter)).toBe(true);
        expect(gameEngine.hasBeenGuessed(letter)).toBe(true);
        
        if (result.isCorrect) {
          expect(gameState.revealedLetters.has(letter)).toBe(true);
        }
      }
    });
  });
});