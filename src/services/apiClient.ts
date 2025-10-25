/**
 * API Client for Guess the Sentence Game
 * Handles communication with Cloudflare Workers API endpoints
 * Requirements: 1.5, 6.2, 7.3, 7.5
 */

import type { 
  SentenceResponse, 
  ScoreSubmissionRequest, 
  ScoreSubmissionResponse, 
  LeaderboardResponse
} from '../types/api.js';
import type { LeaderboardEntry } from '../types/game.js';

/**
 * Configuration for API client behavior
 */
interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  retryMultiplier: number;
}

/**
 * Default configuration for API client
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: 'https://guess-the-sentence-api-production.therobinson.workers.dev',
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryMultiplier: 2
};

/**
 * Custom error class for API-related errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * API Client class with retry logic and error handling
 */
export class ApiClient {
  private config: ApiClientConfig;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make HTTP request with timeout, retry logic, and error handling
   * Requirements: 1.5, 7.3, 7.5
   */
  private async makeRequest<T>(
    url: string,
    options: globalThis.RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiClientError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiClientError('Request timeout', 408, 'TIMEOUT', error);
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new ApiClientError('Network error', 0, 'NETWORK_ERROR', error);
        }
      }

      // Retry logic for retryable errors
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateRetryDelay(retryCount);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries}):`, error);
        
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, retryCount + 1);
      }

      // Re-throw the error if not retryable or max retries exceeded
      throw error;
    }
  }

  /**
   * Determine if an error should trigger a retry
   * Requirements: 7.3, 7.5
   */
  private shouldRetry(error: unknown, retryCount: number): boolean {
    if (retryCount >= this.config.maxRetries) {
      return false;
    }

    // Retry on network errors, timeouts, and certain HTTP status codes
    if (error instanceof ApiClientError) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return error.status === 0 || // Network error
             error.status === undefined ||
             error.code === 'TIMEOUT' ||
             (error.status !== undefined && retryableStatuses.includes(error.status));
    }

    // Also retry on generic network errors
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   * Requirements: 7.3
   */
  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelay * Math.pow(this.config.retryMultiplier, retryCount);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cache management utilities
   * Requirements: 7.3 (graceful degradation with cached data)
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Retrieve daily sentence from API
   * Requirements: 1.1, 7.2, 7.4
   */
  async getSentence(date: string): Promise<SentenceResponse> {
    const cacheKey = `sentence:${date}`;
    
    // Try to get from cache first for offline scenarios
    const cached = this.getCachedData<SentenceResponse>(cacheKey);
    if (cached) {
      console.log('Using cached sentence for', date);
      return cached;
    }

    try {
      const url = `${this.config.baseUrl}/api/sentence/${date}`;
      const response = await this.makeRequest<SentenceResponse>(url);
      
      // Cache successful response for 1 hour
      this.setCachedData(cacheKey, response, 60 * 60 * 1000);
      
      return response;
    } catch (error) {
      console.error('Failed to fetch sentence from API:', error);
      
      // Try to return cached data even if expired as fallback
      const expiredCache = this.cache.get(cacheKey);
      if (expiredCache) {
        console.warn('Using expired cached sentence as fallback');
        return expiredCache.data as SentenceResponse;
      }
      
      // If no cache available, provide a fallback sentence
      console.warn('No cached data available, using fallback sentence');
      return this.getFallbackSentence(date);
    }
  }

  /**
   * Provide fallback sentence when API and cache are unavailable
   * Requirements: 7.3 (graceful degradation)
   */
  private getFallbackSentence(date: string): SentenceResponse {
    const fallbackSentences = [
      'Reading books helps students learn new words and ideas.',
      'Practice makes perfect when learning new skills.',
      'Science experiments help us understand how things work.',
      'Teamwork makes difficult projects much easier to complete.',
      'Exercise and healthy eating keep our bodies strong.'
    ];
    
    // Use date to deterministically select a fallback sentence
    const dateNum = new Date(date).getTime();
    const index = Math.abs(dateNum) % fallbackSentences.length;
    
    return {
      sentence: fallbackSentences[index],
      date,
      difficulty: 'medium',
      success: true
    };
  }

  /**
   * Submit player score to leaderboard
   * Requirements: 6.2
   */
  async submitScore(submission: ScoreSubmissionRequest): Promise<ScoreSubmissionResponse> {
    try {
      const url = `${this.config.baseUrl}/api/scores`;
      const response = await this.makeRequest<ScoreSubmissionResponse>(url, {
        method: 'POST',
        body: JSON.stringify(submission)
      });
      
      // Clear leaderboard cache after successful submission
      this.clearLeaderboardCache();
      
      return response;
    } catch (error) {
      console.error('Failed to submit score:', error);
      
      // Store submission locally as fallback
      this.storeScoreLocally(submission);
      
      // Return a success response to avoid breaking the UI
      return {
        success: true,
        cumulativeScore: submission.dailyScore,
        gamesPlayed: 1,
        error: 'Score saved locally. Will sync when connection is restored.'
      };
    }
  }

  /**
   * Store score locally when API is unavailable
   * Requirements: 7.3 (graceful degradation)
   */
  private storeScoreLocally(submission: ScoreSubmissionRequest): void {
    try {
      const localScores = this.getLocalScores();
      const existingPlayer = localScores.find(entry => entry.playerName === submission.playerName);
      
      if (existingPlayer) {
        existingPlayer.cumulativeScore += submission.dailyScore;
        existingPlayer.gamesPlayed += 1;
        existingPlayer.lastPlayedDate = submission.gameDate;
      } else {
        localScores.push({
          playerName: submission.playerName,
          cumulativeScore: submission.dailyScore,
          gamesPlayed: 1,
          lastPlayedDate: submission.gameDate
        });
      }
      
      // Sort by cumulative score and keep top 50
      localScores.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
      const topScores = localScores.slice(0, 50);
      
      localStorage.setItem('guessTheSentence_leaderboard', JSON.stringify(topScores));
      localStorage.setItem('guessTheSentence_pendingSubmissions', 
        JSON.stringify([...this.getPendingSubmissions(), submission]));
      
    } catch (error) {
      console.error('Failed to store score locally:', error);
    }
  }

  /**
   * Get pending score submissions for sync when online
   * Requirements: 7.3
   */
  private getPendingSubmissions(): ScoreSubmissionRequest[] {
    try {
      const stored = localStorage.getItem('guessTheSentence_pendingSubmissions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get pending submissions:', error);
      return [];
    }
  }

  /**
   * Retrieve leaderboard data
   * Requirements: 6.4, 6.5
   */
  async getLeaderboard(limit = 10): Promise<LeaderboardResponse> {
    const cacheKey = `leaderboard:${limit}`;
    
    // Try cache first
    const cached = this.getCachedData<LeaderboardResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.config.baseUrl}/api/leaderboard?limit=${limit}`;
      const response = await this.makeRequest<LeaderboardResponse>(url);
      
      // Cache for 5 minutes
      this.setCachedData(cacheKey, response, 5 * 60 * 1000);
      
      return response;
    } catch (error) {
      console.error('Failed to fetch leaderboard from API:', error);
      
      // Fallback to local scores
      return this.getLocalLeaderboard(limit);
    }
  }

  /**
   * Get local leaderboard as fallback
   * Requirements: 7.3 (graceful degradation)
   */
  private getLocalLeaderboard(limit = 10): LeaderboardResponse {
    const localScores = this.getLocalScores().slice(0, limit);
    
    return {
      success: true,
      leaderboard: localScores
    };
  }

  /**
   * Get local scores from localStorage
   * Requirements: 7.3
   */
  private getLocalScores(): LeaderboardEntry[] {
    try {
      const stored = localStorage.getItem('guessTheSentence_leaderboard');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse local scores:', error);
      return [];
    }
  }

  /**
   * Clear leaderboard cache
   */
  private clearLeaderboardCache(): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith('leaderboard:'));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Sync pending submissions when connection is restored
   * Requirements: 7.3
   */
  async syncPendingSubmissions(): Promise<void> {
    const pending = this.getPendingSubmissions();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending score submissions...`);
    
    const successful: ScoreSubmissionRequest[] = [];
    
    for (const submission of pending) {
      try {
        // Use direct API call instead of submitScore to avoid local storage fallback
        const url = `${this.config.baseUrl}/api/scores`;
        const response = await this.makeRequest<ScoreSubmissionResponse>(url, {
          method: 'POST',
          body: JSON.stringify(submission)
        });
        
        if (response.success) {
          successful.push(submission);
        }
      } catch (error) {
        console.error('Failed to sync submission:', submission, error);
        // Keep failed submissions for next sync attempt
      }
    }
    
    // Remove successful submissions from pending list
    if (successful.length > 0) {
      const remaining = pending.filter(sub => 
        !successful.some(success => 
          success.playerName === sub.playerName && 
          success.gameDate === sub.gameDate
        )
      );
      
      localStorage.setItem('guessTheSentence_pendingSubmissions', JSON.stringify(remaining));
      console.log(`Successfully synced ${successful.length} submissions`);
    }
  }

  /**
   * Check if the API is available
   * Requirements: 7.3, 7.5
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${this.config.baseUrl}/api/sentence/${today}`;
      
      // Make direct API call without fallback to properly test health
      const response = await this.makeRequest<SentenceResponse>(url);
      return response.success === true;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create and export default API client instance
export const apiClient = new ApiClient();

// Export types for external use
export type { ApiClientConfig };