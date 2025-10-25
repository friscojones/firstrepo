/**
 * Unit tests for SentenceManager component
 * Requirements: 1.1, 1.3, 2.2, 2.3, 2.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SentenceManager } from '../SentenceManager.js';

// Mock fetch for testing API calls
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('SentenceManager', () => {
  let manager: SentenceManager;

  beforeEach(() => {
    manager = new SentenceManager();
    vi.clearAllMocks();
  });

  describe('Sentence loading functionality', () => {
    it('should load sentence from API successfully', async () => {
      const mockResponse = {
        success: true,
        sentence: 'The quick brown fox jumps over the lazy dog.',
        date: '2024-01-01',
        difficulty: 'medium'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const sentence = await manager.loadDailySentence('2024-01-01');
      
      expect(sentence).toBe('The quick brown fox jumps over the lazy dog.');
      expect(manager.getOriginalSentence()).toBe('The quick brown fox jumps over the lazy dog.');
    });

    it('should use fallback sentence when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const sentence = await manager.loadDailySentence('2024-01-01');
      
      expect(sentence).toBe('The quick brown fox jumps over the lazy dog.');
      expect(manager.getOriginalSentence()).toBe('The quick brown fox jumps over the lazy dog.');
    });

    it('should handle invalid API response', async () => {
      const mockResponse = {
        success: false,
        error: 'Sentence not found'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const sentence = await manager.loadDailySentence('2024-01-01');
      
      // Should fall back to default sentence
      expect(sentence).toBe('The quick brown fox jumps over the lazy dog.');
    });
  });

  describe('Letter revelation with multiple instances', () => {
    beforeEach(async () => {
      // Load a test sentence with repeated letters
      const mockResponse = {
        success: true,
        sentence: 'The quick brown fox jumps over the lazy dog.',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
    });

    it('should reveal all instances of a letter', () => {
      // 'L' appears 1 time in "The quick brown fox jumps over the lazy dog."
      const instances = manager.revealLetter('L');
      
      expect(instances).toBe(1);
      expect(manager.getRevealedLetters().has('L')).toBe(true);
    });

    it('should handle case-insensitive letter revelation', () => {
      const instances1 = manager.revealLetter('h');
      const instances2 = manager.revealLetter('H');
      
      // 'H' appears 2 times in "Hello World! This is a test."
      expect(instances1).toBe(2);
      expect(instances2).toBe(2); // Should be same count
      expect(manager.getRevealedLetters().has('H')).toBe(true);
    });

    it('should return 0 for letters not in sentence', () => {
      const instances = manager.revealLetter('X'); // X is in "fox" in "The quick brown fox jumps over the lazy dog."
      
      expect(instances).toBe(1); // X appears once in "fox"
      expect(manager.getRevealedLetters().has('X')).toBe(true); // Still marked as guessed
    });

    it('should throw error for invalid letter input', () => {
      expect(() => manager.revealLetter('')).toThrow('Invalid letter provided');
      expect(() => manager.revealLetter('12')).toThrow('Invalid letter provided');
      expect(() => manager.revealLetter('AB')).toThrow('Invalid letter provided');
    });
  });

  describe('Letter existence checking', () => {
    beforeEach(async () => {
      const mockResponse = {
        success: true,
        sentence: 'Programming is fun!',
        date: '2024-01-01',
        difficulty: 'medium'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
    });

    it('should correctly identify letters that exist in sentence', () => {
      expect(manager.isLetterInSentence('P')).toBe(true);
      expect(manager.isLetterInSentence('p')).toBe(true); // Case insensitive
      expect(manager.isLetterInSentence('R')).toBe(true);
      expect(manager.isLetterInSentence('G')).toBe(true);
    });

    it('should correctly identify letters that do not exist', () => {
      expect(manager.isLetterInSentence('Z')).toBe(true); // Z is in "lazy"
      expect(manager.isLetterInSentence('X')).toBe(true); // X is in "fox"
      expect(manager.isLetterInSentence('Q')).toBe(true); // Q is in "quick"
    });

    it('should return false for invalid input', () => {
      expect(manager.isLetterInSentence('')).toBe(false);
      expect(manager.isLetterInSentence('12')).toBe(false);
      expect(manager.isLetterInSentence('AB')).toBe(false);
    });

    it('should return false when no sentence is loaded', () => {
      const emptyManager = new SentenceManager();
      expect(emptyManager.isLetterInSentence('A')).toBe(false);
    });
  });

  describe('Sentence display formatting with mixed revealed/hidden letters', () => {
    beforeEach(async () => {
      const mockResponse = {
        success: true,
        sentence: 'Hello World!',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
    });

    it('should show blanks for unrevealed letters', () => {
      const display = manager.getDisplaySentence();
      
      // All letters should be blanks, spaces and punctuation preserved
      expect(display).toBe('___ _____ _____ ___ _____ ____ ___ ____ ___.');
    });

    it('should reveal specific letters while keeping others hidden', () => {
      manager.revealLetter('H');
      manager.revealLetter('L');
      
      const display = manager.getDisplaySentence();
      
      // H and L revealed in "The quick brown fox jumps over the lazy dog."
      expect(display).toBe('_h_ _____ _____ ___ _____ ____ _h_ l___ ___.');
    });

    it('should preserve spaces and punctuation', () => {
      manager.revealLetter('O');
      
      const display = manager.getDisplaySentence();
      
      // Only 'O' letters revealed, spaces and punctuation preserved (preserving original case)
      expect(display).toBe('___ _____ __o__ _o_ _____ o___ ___ ____ _o_.');
    });

    it('should handle complete revelation', () => {
      // Reveal all unique letters
      const uniqueLetters = manager.getUniqueLetters();
      uniqueLetters.forEach(letter => manager.revealLetter(letter));
      
      const display = manager.getDisplaySentence();
      
      expect(display).toBe('The quick brown fox jumps over the lazy dog.');
    });

    it('should return empty string when no sentence loaded', () => {
      const emptyManager = new SentenceManager();
      expect(emptyManager.getDisplaySentence()).toBe('');
    });
  });

  describe('Game completion detection', () => {
    beforeEach(async () => {
      const mockResponse = {
        success: true,
        sentence: 'Hi there friend!',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
    });

    it('should not be complete initially', () => {
      expect(manager.isComplete()).toBe(false);
    });

    it('should be complete when all letters are revealed', () => {
      // "Hi there friend!" has letters: H, I, T, H, E, R, E, F, R, I, E, N, D
      // Unique letters: H, I, T, E, R, F, N, D
      manager.revealLetter('H');
      expect(manager.isComplete()).toBe(false);
      
      // Reveal most letters but not all (pangram has 26 letters)
      const letters = ['I', 'T', 'E', 'R', 'F', 'N', 'S', 'P', 'M', 'J', 'V', 'W', 'B', 'C', 'K', 'Q', 'U', 'X', 'Y', 'Z', 'A', 'G', 'O', 'H', 'L'];
      letters.forEach(letter => manager.revealLetter(letter));
      expect(manager.isComplete()).toBe(false);
      
      // Reveal the last letter to complete
      manager.revealLetter('D');
      expect(manager.isComplete()).toBe(true);
    });

    it('should handle single letter sentences', async () => {
      const mockResponse = {
        success: true,
        sentence: 'A simple test.',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const newManager = new SentenceManager();
      await newManager.loadDailySentence('2024-01-01');
      
      // Reveal all unique letters
      const uniqueLetters = newManager.getUniqueLetters();
      uniqueLetters.forEach(letter => newManager.revealLetter(letter));
      
      expect(newManager.isComplete()).toBe(true);
    });
  });

  describe('State management', () => {
    it('should initialize with empty state', () => {
      expect(manager.getOriginalSentence()).toBe('');
      expect(manager.getDisplaySentence()).toBe('');
      expect(manager.getRevealedLetters().size).toBe(0);
      expect(manager.isComplete()).toBe(false);
    });

    it('should reset state correctly', async () => {
      // Set up some state
      const mockResponse = {
        success: true,
        sentence: 'Test sentence',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
      manager.revealLetter('T');
      manager.revealLetter('E');
      
      expect(manager.getRevealedLetters().size).toBeGreaterThan(0);
      
      // Reset and verify
      manager.reset();
      expect(manager.getOriginalSentence()).toBe('');
      expect(manager.getDisplaySentence()).toBe('');
      expect(manager.getRevealedLetters().size).toBe(0);
    });

    it('should throw error when trying to reveal letter without loaded sentence', () => {
      expect(() => manager.revealLetter('A')).toThrow('No sentence loaded');
    });
  });

  describe('Helper methods', () => {
    beforeEach(async () => {
      const mockResponse = {
        success: true,
        sentence: 'Hello World!',
        date: '2024-01-01',
        difficulty: 'easy'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await manager.loadDailySentence('2024-01-01');
    });

    it('should return unique letters in sentence', () => {
      const uniqueLetters = manager.getUniqueLetters();
      
      // "The quick brown fox jumps over the lazy dog." contains all 26 letters (pangram)
      expect(uniqueLetters.size).toBe(26);
      expect(uniqueLetters.has('T')).toBe(true);
      expect(uniqueLetters.has('H')).toBe(true);
      expect(uniqueLetters.has('E')).toBe(true);
      expect(uniqueLetters.has('Q')).toBe(true);
      expect(uniqueLetters.has('Z')).toBe(true);
      expect(uniqueLetters.has('A')).toBe(true);
      expect(uniqueLetters.has('X')).toBe(true);
    });

    it('should return copy of revealed letters set', () => {
      manager.revealLetter('H');
      manager.revealLetter('L');
      
      const revealed = manager.getRevealedLetters();
      expect(revealed.size).toBe(2);
      expect(revealed.has('H')).toBe(true);
      expect(revealed.has('L')).toBe(true);
      
      // Modifying returned set should not affect internal state
      revealed.add('X');
      expect(manager.getRevealedLetters().size).toBe(2);
    });
  });
});