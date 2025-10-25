/**
 * ScoreCalculator component for handling game scoring logic
 * Implements compounding multiplier system for consecutive correct guesses
 * Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
 */

import type { ScoreResult } from '../types/game.js';

export class ScoreCalculator {
  private currentScore: number = 0;
  private nextMultiplier: number = 1.0;
  private consecutiveCorrect: number = 0;
  private basePointsPerLetter: number = 10;
  private incorrectGuessDeduction: number = 10;
  private multiplierIncrement: number = 1.5;

  /**
   * Calculate points for a letter guess
   * Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
   */
  calculatePoints(letterInstances: number, isCorrect: boolean): ScoreResult {
    let pointsEarned = 0;
    let multiplierUsed = 1.0;

    if (isCorrect) {
      // Use current multiplier for this guess
      multiplierUsed = this.nextMultiplier;
      pointsEarned = Math.round(this.basePointsPerLetter * letterInstances * multiplierUsed);
      
      // Update streak for next guess
      this.consecutiveCorrect++;
      this.nextMultiplier = this.nextMultiplier * this.multiplierIncrement;
    } else {
      // For incorrect guesses, deduct points and reset streak
      pointsEarned = -this.incorrectGuessDeduction;
      multiplierUsed = 1.0;
      this.resetStreak();
    }

    // Update total score, ensuring it doesn't go below 0
    this.currentScore = Math.max(0, this.currentScore + pointsEarned);

    return {
      pointsEarned,
      newTotal: this.currentScore,
      multiplierUsed,
      letterInstances,
      isCorrect
    };
  }

  /**
   * Reset the streak multiplier and consecutive correct count
   * Requirements: 4.3
   */
  resetStreak(): void {
    this.nextMultiplier = 1.0;
    this.consecutiveCorrect = 0;
  }

  /**
   * Get the current multiplier value
   * Requirements: 4.2, 4.4
   */
  getCurrentMultiplier(): number {
    return this.nextMultiplier;
  }

  /**
   * Get the current score
   * Requirements: 3.3
   */
  getCurrentScore(): number {
    return this.currentScore;
  }

  /**
   * Get the current consecutive correct count
   * Requirements: 4.1, 4.2
   */
  getConsecutiveCorrect(): number {
    return this.consecutiveCorrect;
  }

  /**
   * Set the current score (for game initialization)
   * Requirements: 3.3
   */
  setScore(score: number): void {
    this.currentScore = Math.max(0, score);
  }

  /**
   * Initialize or restore calculator state
   * Requirements: 3.3, 4.1, 4.2
   */
  initializeState(score: number = 0, consecutiveCorrect: number = 0, multiplier: number = 1.0): void {
    this.currentScore = Math.max(0, score);
    this.consecutiveCorrect = Math.max(0, consecutiveCorrect);
    this.nextMultiplier = Math.max(1.0, multiplier);
  }
}