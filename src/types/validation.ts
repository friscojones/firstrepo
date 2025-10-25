/**
 * Data validation functions for user inputs and game data
 * Requirements: 1.1, 3.3, 4.4
 */

/**
 * Validates that a string is a single alphabetic letter
 */
export function isValidLetter(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Must be exactly one character and alphabetic
  return input.length === 1 && /^[A-Za-z]$/.test(input);
}

/**
 * Validates player name for leaderboard submission
 */
export function isValidPlayerName(name: string): boolean {
  if (typeof name !== 'string') {
    return false;
  }
  
  // Trim whitespace for validation
  const trimmed = name.trim();
  
  // Must be between 1 and 20 characters, alphanumeric plus spaces and basic punctuation
  return trimmed.length >= 1 && 
         trimmed.length <= 20 && 
         /^[A-Za-z0-9\s\-_.]+$/.test(trimmed);
}

/**
 * Validates that a date string is in YYYY-MM-DD format
 */
export function isValidGameDate(date: string): boolean {
  if (typeof date !== 'string') {
    return false;
  }
  
  // Check format with regex
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  
  // Validate it's a real date
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && 
         !isNaN(parsedDate.getTime()) && 
         parsedDate.toISOString().slice(0, 10) === date;
}

/**
 * Validates that a score is a valid non-negative integer
 */
export function isValidScore(score: number): boolean {
  return typeof score === 'number' && 
         Number.isInteger(score) && 
         score >= 0 && 
         score <= 999999; // Reasonable upper limit
}

/**
 * Validates that a sentence is appropriate for the game
 */
export function isValidSentence(sentence: string): boolean {
  if (typeof sentence !== 'string') {
    return false;
  }
  
  const trimmed = sentence.trim();
  
  // Must be between 10 and 200 characters
  if (trimmed.length < 10 || trimmed.length > 200) {
    return false;
  }
  
  // Must contain at least some alphabetic characters
  if (!/[A-Za-z]/.test(trimmed)) {
    return false;
  }
  
  // Should not contain inappropriate characters (basic validation)
  return /^[A-Za-z0-9\s\-.,!?'"()]+$/.test(trimmed);
}

/**
 * Validates multiplier value is within expected range
 */
export function isValidMultiplier(multiplier: number): boolean {
  return typeof multiplier === 'number' && 
         multiplier >= 1.0 && 
         multiplier <= 10.0 && // Reasonable upper limit
         Number.isFinite(multiplier);
}

/**
 * Sanitizes player name by trimming whitespace and limiting length
 */
export function sanitizePlayerName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }
  
  return name.trim().slice(0, 20);
}

/**
 * Normalizes a letter to uppercase for consistent processing
 */
export function normalizeLetter(letter: string): string {
  if (!isValidLetter(letter)) {
    throw new Error('Invalid letter input');
  }
  
  return letter.toUpperCase();
}

/**
 * Gets today's date in YYYY-MM-DD format for game sessions
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}