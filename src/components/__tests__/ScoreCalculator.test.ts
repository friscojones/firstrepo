/**
 * Unit tests for ScoreCalculator component
 * Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreCalculator } from '../ScoreCalculator.js';

describe('ScoreCalculator', () => {
  let calculator: ScoreCalculator;

  beforeEach(() => {
    calculator = new ScoreCalculator();
  });

  describe('Basic scoring functionality', () => {
    it('should award 10 points per letter instance for first correct guess', () => {
      const result = calculator.calculatePoints(3, true);
      
      expect(result.pointsEarned).toBe(30);
      expect(result.newTotal).toBe(30);
      expect(result.multiplierUsed).toBe(1.0);
      expect(result.letterInstances).toBe(3);
      expect(result.isCorrect).toBe(true);
    });

    it('should deduct 10 points for incorrect guesses', () => {
      calculator.setScore(50);
      const result = calculator.calculatePoints(0, false);
      
      expect(result.pointsEarned).toBe(-10);
      expect(result.newTotal).toBe(40);
      expect(result.multiplierUsed).toBe(1.0);
      expect(result.letterInstances).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it('should not allow score to go below 0', () => {
      calculator.setScore(5);
      const result = calculator.calculatePoints(0, false);
      
      expect(result.pointsEarned).toBe(-10);
      expect(result.newTotal).toBe(0);
    });
  });

  describe('Multiplier progression for consecutive correct guesses', () => {
    it('should apply 1.5x multiplier on second consecutive correct guess', () => {
      // First correct guess - no multiplier
      calculator.calculatePoints(2, true);
      expect(calculator.getCurrentMultiplier()).toBe(1.5);
      
      // Second correct guess - 1.5x multiplier
      const result = calculator.calculatePoints(1, true);
      expect(result.multiplierUsed).toBe(1.5);
      expect(result.pointsEarned).toBe(15); // 10 * 1 * 1.5 = 15
      expect(calculator.getCurrentMultiplier()).toBe(2.25); // 1.5 * 1.5 = 2.25
    });

    it('should continue compounding multiplier for consecutive correct guesses', () => {
      // First guess: 1.0x multiplier
      calculator.calculatePoints(1, true);
      expect(calculator.getCurrentMultiplier()).toBe(1.5);
      
      // Second guess: 1.5x multiplier  
      calculator.calculatePoints(1, true);
      expect(calculator.getCurrentMultiplier()).toBe(2.25);
      
      // Third guess: 2.25x multiplier
      const result = calculator.calculatePoints(2, true);
      expect(result.multiplierUsed).toBe(2.25);
      expect(result.pointsEarned).toBe(45); // 10 * 2 * 2.25 = 45
      expect(calculator.getCurrentMultiplier()).toBe(3.375); // 2.25 * 1.5 = 3.375
    });

    it('should round streak calculations to nearest whole number', () => {
      // Set up for a multiplier that will create fractional points
      calculator.calculatePoints(1, true); // uses 1.0, next becomes 1.5
      
      const result = calculator.calculatePoints(3, true); // uses 1.5, next becomes 2.25
      expect(result.multiplierUsed).toBe(1.5);
      expect(result.pointsEarned).toBe(45); // 10 * 3 * 1.5 = 45 (already whole)
      
      // Test with a multiplier that creates fractions
      const result2 = calculator.calculatePoints(1, true); // uses 2.25, next becomes 3.375
      expect(result2.multiplierUsed).toBe(2.25);
      expect(result2.pointsEarned).toBe(23); // 10 * 1 * 2.25 = 22.5, rounded to 23
    });
  });

  describe('Streak reset behavior', () => {
    it('should reset multiplier to 1.0 after incorrect guess', () => {
      // Build up a streak
      calculator.calculatePoints(1, true);
      calculator.calculatePoints(1, true);
      expect(calculator.getCurrentMultiplier()).toBe(2.25);
      expect(calculator.getConsecutiveCorrect()).toBe(2);
      
      // Make incorrect guess
      calculator.calculatePoints(0, false);
      expect(calculator.getCurrentMultiplier()).toBe(1.0);
      expect(calculator.getConsecutiveCorrect()).toBe(0);
      
      // Next correct guess should use 1.0 multiplier
      const result = calculator.calculatePoints(1, true);
      expect(result.multiplierUsed).toBe(1.0);
      expect(result.pointsEarned).toBe(10);
    });

    it('should track consecutive correct count accurately', () => {
      expect(calculator.getConsecutiveCorrect()).toBe(0);
      
      calculator.calculatePoints(1, true);
      expect(calculator.getConsecutiveCorrect()).toBe(1);
      
      calculator.calculatePoints(2, true);
      expect(calculator.getConsecutiveCorrect()).toBe(2);
      
      calculator.calculatePoints(0, false);
      expect(calculator.getConsecutiveCorrect()).toBe(0);
    });
  });

  describe('State management', () => {
    it('should initialize with default values', () => {
      expect(calculator.getCurrentScore()).toBe(0);
      expect(calculator.getCurrentMultiplier()).toBe(1.0);
      expect(calculator.getConsecutiveCorrect()).toBe(0);
    });

    it('should allow state initialization with custom values', () => {
      calculator.initializeState(100, 3, 3.375);
      
      expect(calculator.getCurrentScore()).toBe(100);
      expect(calculator.getConsecutiveCorrect()).toBe(3);
      expect(calculator.getCurrentMultiplier()).toBe(3.375);
    });

    it('should enforce minimum values during initialization', () => {
      calculator.initializeState(-50, -2, 0.5);
      
      expect(calculator.getCurrentScore()).toBe(0);
      expect(calculator.getConsecutiveCorrect()).toBe(0);
      expect(calculator.getCurrentMultiplier()).toBe(1.0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero letter instances correctly', () => {
      const result = calculator.calculatePoints(0, true);
      
      expect(result.pointsEarned).toBe(0);
      expect(result.newTotal).toBe(0);
      expect(result.isCorrect).toBe(true);
      expect(calculator.getConsecutiveCorrect()).toBe(1);
    });

    it('should handle large multipliers without overflow', () => {
      // Build up a very large multiplier
      for (let i = 0; i < 10; i++) {
        calculator.calculatePoints(1, true);
      }
      
      const result = calculator.calculatePoints(1, true);
      expect(result.pointsEarned).toBeGreaterThan(0);
      expect(result.newTotal).toBeGreaterThan(0);
      expect(Number.isFinite(result.pointsEarned)).toBe(true);
    });
  });
});