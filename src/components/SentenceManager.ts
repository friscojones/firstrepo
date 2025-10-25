/**
 * SentenceManager component for handling sentence retrieval and letter revelation
 * Requirements: 1.1, 1.3, 2.2, 2.3, 2.5
 */

import type { SentenceResponse } from '../types/api.js';
import { isValidSentence, normalizeLetter, isValidLetter } from '../types/validation.js';
import { apiClient } from '../services/apiClient.js';

/**
 * Manages daily sentence loading, letter revelation, and display formatting
 */
export class SentenceManager {
  private currentSentence: string = '';
  private revealedLetters: Set<string> = new Set();
  private normalizedSentence: string = '';

  /**
   * Load the daily sentence from Cloudflare Workers API
   * Requirements: 1.1, 7.2, 7.4
   */
  async loadDailySentence(date: string): Promise<string> {
    try {
      const response = await apiClient.getSentence(date);
      
      if (!response.success || !response.sentence) {
        throw new Error(response.error || 'Invalid sentence response');
      }

      if (!isValidSentence(response.sentence)) {
        throw new Error('Received invalid sentence from API');
      }

      this.currentSentence = response.sentence.trim();
      this.normalizedSentence = this.currentSentence.toUpperCase();
      this.revealedLetters.clear();

      return this.currentSentence;
    } catch (error) {
      console.error('Failed to load daily sentence:', error);
      throw error; // Let the caller handle the error with proper UI feedback
    }
  }

  /**
   * Reveal all instances of a letter in the sentence
   * Requirements: 2.2, 2.5
   * @param letter The letter to reveal
   * @returns Number of instances of the letter found
   */
  revealLetter(letter: string): number {
    if (!isValidLetter(letter)) {
      throw new Error('Invalid letter provided');
    }

    if (!this.currentSentence) {
      throw new Error('No sentence loaded');
    }

    const normalizedLetter = normalizeLetter(letter);
    this.revealedLetters.add(normalizedLetter);

    // Count instances of the letter in the sentence
    let instances = 0;
    for (const char of this.normalizedSentence) {
      if (char === normalizedLetter) {
        instances++;
      }
    }

    return instances;
  }

  /**
   * Check if a letter exists in the current sentence
   * Requirements: 2.2, 2.3
   * @param letter The letter to check
   * @returns True if the letter exists in the sentence
   */
  isLetterInSentence(letter: string): boolean {
    if (!isValidLetter(letter)) {
      return false;
    }

    if (!this.currentSentence) {
      return false;
    }

    const normalizedLetter = normalizeLetter(letter);
    return this.normalizedSentence.includes(normalizedLetter);
  }

  /**
   * Get the current sentence with blanks for hidden letters
   * Requirements: 1.3, 2.5
   * @returns Formatted sentence with revealed letters and blanks for hidden ones
   */
  getDisplaySentence(): string {
    if (!this.currentSentence) {
      return '';
    }

    let displaySentence = '';
    
    for (const char of this.currentSentence) {
      const upperChar = char.toUpperCase();
      
      // If it's a letter and not revealed, show as blank
      if (/[A-Z]/.test(upperChar) && !this.revealedLetters.has(upperChar)) {
        displaySentence += '_';
      } else {
        // Show the original character (preserves spaces, punctuation, case)
        displaySentence += char;
      }
    }

    return displaySentence;
  }

  /**
   * Get the original sentence (for completion checking)
   * @returns The complete original sentence
   */
  getOriginalSentence(): string {
    return this.currentSentence;
  }

  /**
   * Get all revealed letters
   * @returns Set of revealed letters in uppercase
   */
  getRevealedLetters(): Set<string> {
    return new Set(this.revealedLetters);
  }

  /**
   * Check if all letters in the sentence have been revealed
   * Requirements: 5.1
   * @returns True if all alphabetic characters have been revealed
   */
  isComplete(): boolean {
    if (!this.currentSentence) {
      return false;
    }

    // Check if all alphabetic characters in the sentence have been revealed
    for (const char of this.normalizedSentence) {
      if (/[A-Z]/.test(char) && !this.revealedLetters.has(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Reset the sentence manager state
   */
  reset(): void {
    this.currentSentence = '';
    this.normalizedSentence = '';
    this.revealedLetters.clear();
  }

  /**
   * Get unique letters in the sentence (for testing/debugging)
   * @returns Set of unique letters in the sentence
   */
  getUniqueLetters(): Set<string> {
    const uniqueLetters = new Set<string>();
    
    for (const char of this.normalizedSentence) {
      if (/[A-Z]/.test(char)) {
        uniqueLetters.add(char);
      }
    }

    return uniqueLetters;
  }
}