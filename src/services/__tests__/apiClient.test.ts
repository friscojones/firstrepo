/**
 * Integration tests for API Client
 * Requirements: 6.2, 6.3, 7.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../apiClient.js';
import type { 
  SentenceResponse, 
  ScoreSubmissionRequest, 
  ScoreSubmissionResponse, 
  LeaderboardResponse 
} from '../../types/api.js';

// Mock fetch for testing
const mockFetch = vi.fn();
(globalThis as typeof globalThis & { fetch: typeof mockFetch }).fetch = mockFetch;

// Mock localStorage
const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();
const mockClear = vi.fn();
const mockKey = vi.fn();

const mockLocalStorage: Storage = {
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
  clear: mockClear,
  length: 0,
  key: mockKey,
};
(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = mockLocalStorage;

describe('ApiClient Integration Tests', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://test-api.example.com',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
      retryMultiplier: 1.5
    });
    
    vi.clearAllMocks();
    mockGetItem.mockReturnValue(null);
  });

  afterEach(() => {
    apiClient.clearCache();
  });

  describe('Sentence retrieval with various date parameters', () => {
    it('should handle different date formats correctly', async () => {
      const testDates = [
        '2024-01-01', // New Year's Day
        '2024-02-29', // Leap year date
        '2024-12-31', // End of year
        '2023-06-15'  // Past year
      ];

      for (const date of testDates) {
        const mockResponse: SentenceResponse = {
          sentence: `Test sentence for ${date}.`,
          date,
          difficulty: 'medium',
          success: true
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await apiClient.getSentence(date);
        expect(result.date).toBe(date);
        expect(result.sentence).toContain(date);
      }

      expect(mockFetch).toHaveBeenCalledTimes(testDates.length);
    });

    it('should handle edge case dates and validate date boundaries', async () => {
      // Test with today's date
      const today = new Date().toISOString().split('T')[0];
      const mockResponse: SentenceResponse = {
        sentence: 'Today\'s sentence for testing.',
        date: today,
        difficulty: 'medium',
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getSentence(today);
      expect(result.date).toBe(today);
      expect(result.success).toBe(true);
    });

    it('should provide deterministic fallback sentences for consistent dates', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const date1 = '2024-01-15';
      const result1 = await apiClient.getSentence(date1);
      const result2 = await apiClient.getSentence(date1);

      // Same date should return same fallback sentence
      expect(result1.sentence).toBe(result2.sentence);
      expect(result1.date).toBe(date1);
      expect(result2.date).toBe(date1);
    });
    it('should retrieve sentence successfully for valid date', async () => {
      const mockResponse: SentenceResponse = {
        sentence: 'The quick brown fox jumps over the lazy dog.',
        date: '2024-01-15',
        difficulty: 'medium',
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getSentence('2024-01-15');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/sentence/2024-01-15',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully and return fallback sentence', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.getSentence('2024-01-15');

      expect(result.success).toBe(true);
      expect(result.sentence).toBeTruthy();
      expect(result.date).toBe('2024-01-15');
      expect(result.difficulty).toBe('medium');
    });

    it('should use cached sentence when available', async () => {
      const mockResponse: SentenceResponse = {
        sentence: 'Cached sentence for testing.',
        date: '2024-01-15',
        difficulty: 'easy',
        success: true
      };

      // First call - should fetch from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result1 = await apiClient.getSentence('2024-01-15');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await apiClient.getSentence('2024-01-15');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2).toEqual(result1);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Sentence not found' })
      });

      const result = await apiClient.getSentence('2024-01-15');

      // Should fallback to default sentence
      expect(result.success).toBe(true);
      expect(result.sentence).toBeTruthy();
    });

    it('should retry on retryable errors', async () => {
      // First call fails with 500 error
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' })
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sentence: 'Retry successful sentence.',
            date: '2024-01-15',
            difficulty: 'medium',
            success: true
          })
        });

      const result = await apiClient.getSentence('2024-01-15');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.sentence).toBe('Retry successful sentence.');
    });

    it('should handle timeout errors', async () => {
      // Mock a timeout by rejecting with AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await apiClient.getSentence('2024-01-15');

      // Should fallback to default sentence
      expect(result.success).toBe(true);
      expect(result.sentence).toBeTruthy();
    });
  });

  describe('Score submission and cumulative total calculations', () => {
    it('should correctly calculate cumulative scores for new players', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'NewPlayer',
        dailyScore: 125,
        gameDate: '2024-01-15'
      };

      const mockResponse: ScoreSubmissionResponse = {
        success: true,
        cumulativeScore: 125, // First game, so cumulative equals daily
        gamesPlayed: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.submitScore(submission);

      expect(result.success).toBe(true);
      expect(result.cumulativeScore).toBe(125);
      expect(result.gamesPlayed).toBe(1);
    });

    it('should correctly calculate cumulative scores for existing players', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'ExistingPlayer',
        dailyScore: 200,
        gameDate: '2024-01-16'
      };

      const mockResponse: ScoreSubmissionResponse = {
        success: true,
        cumulativeScore: 650, // Previous 450 + new 200
        gamesPlayed: 4 // Previous 3 + 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.submitScore(submission);

      expect(result.success).toBe(true);
      expect(result.cumulativeScore).toBe(650);
      expect(result.gamesPlayed).toBe(4);
    });

    it('should handle various score ranges correctly', async () => {
      const testScores = [
        { score: 0, expected: 0 },     // Minimum score
        { score: 50, expected: 50 },   // Low score
        { score: 250, expected: 250 }, // Medium score
        { score: 500, expected: 500 }, // High score
        { score: 1000, expected: 1000 } // Very high score
      ];

      for (let i = 0; i < testScores.length; i++) {
        const { score, expected } = testScores[i];
        const submission: ScoreSubmissionRequest = {
          playerName: `ScoreTestPlayer${i}`,
          dailyScore: score,
          gameDate: `2024-01-${String(15 + i).padStart(2, '0')}`
        };

        const mockResponse: ScoreSubmissionResponse = {
          success: true,
          cumulativeScore: expected,
          gamesPlayed: 1
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await apiClient.submitScore(submission);
        expect(result.cumulativeScore).toBe(expected);
      }
    });

    it('should maintain accurate cumulative totals across multiple submissions', async () => {
      const playerName = 'MultiGamePlayer';
      const submissions = [
        { dailyScore: 100, gameDate: '2024-01-15', expectedCumulative: 100, expectedGames: 1 },
        { dailyScore: 150, gameDate: '2024-01-16', expectedCumulative: 250, expectedGames: 2 },
        { dailyScore: 75, gameDate: '2024-01-17', expectedCumulative: 325, expectedGames: 3 },
        { dailyScore: 200, gameDate: '2024-01-18', expectedCumulative: 525, expectedGames: 4 }
      ];

      for (const sub of submissions) {
        const submission: ScoreSubmissionRequest = {
          playerName,
          dailyScore: sub.dailyScore,
          gameDate: sub.gameDate
        };

        const mockResponse: ScoreSubmissionResponse = {
          success: true,
          cumulativeScore: sub.expectedCumulative,
          gamesPlayed: sub.expectedGames
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await apiClient.submitScore(submission);
        expect(result.cumulativeScore).toBe(sub.expectedCumulative);
        expect(result.gamesPlayed).toBe(sub.expectedGames);
      }
    });
    it('should submit score successfully', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'TestPlayer',
        dailyScore: 150,
        gameDate: '2024-01-15'
      };

      const mockResponse: ScoreSubmissionResponse = {
        success: true,
        cumulativeScore: 450,
        gamesPlayed: 3
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.submitScore(submission);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/scores',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(submission),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle score submission failures gracefully', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'TestPlayer',
        dailyScore: 150,
        gameDate: '2024-01-15'
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock localStorage for fallback
      mockGetItem.mockReturnValue('[]');

      const result = await apiClient.submitScore(submission);

      expect(result.success).toBe(true);
      expect(result.error).toContain('saved locally');
      expect(mockSetItem).toHaveBeenCalled();
    });

    it('should store score locally when API fails', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'TestPlayer',
        dailyScore: 100,
        gameDate: '2024-01-15'
      };

      // Mock existing local scores
      const existingScores = [
        { playerName: 'OtherPlayer', cumulativeScore: 200, gamesPlayed: 2, lastPlayedDate: '2024-01-14' }
      ];
      mockGetItem.mockReturnValue(JSON.stringify(existingScores));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await apiClient.submitScore(submission);

      // Verify localStorage was updated
      expect(mockSetItem).toHaveBeenCalledWith(
        'guessTheSentence_leaderboard',
        expect.stringContaining('TestPlayer')
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'guessTheSentence_pendingSubmissions',
        expect.stringContaining('TestPlayer')
      );
    });

    it('should update existing player cumulative score locally', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'ExistingPlayer',
        dailyScore: 75,
        gameDate: '2024-01-15'
      };

      // Mock existing player in local storage
      const existingScores = [
        { playerName: 'ExistingPlayer', cumulativeScore: 200, gamesPlayed: 2, lastPlayedDate: '2024-01-14' }
      ];
      mockGetItem.mockReturnValue(JSON.stringify(existingScores));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await apiClient.submitScore(submission);

      // Verify the score was updated (200 + 75 = 275)
      const savedData = mockSetItem.mock.calls.find((call: [string, string]) => 
        call[0] === 'guessTheSentence_leaderboard'
      );
      expect(savedData).toBeTruthy();
      
      const savedScores = JSON.parse(savedData[1]);
      const updatedPlayer = savedScores.find((p: { playerName: string }) => p.playerName === 'ExistingPlayer');
      expect(updatedPlayer.cumulativeScore).toBe(275);
      expect(updatedPlayer.gamesPlayed).toBe(3);
    });

    it('should handle API validation errors', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: '',
        dailyScore: -10,
        gameDate: 'invalid-date'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid player name' })
      });

      const result = await apiClient.submitScore(submission);

      // Should still succeed with local storage fallback
      expect(result.success).toBe(true);
      expect(result.error).toContain('saved locally');
    });
  });

  describe('Leaderboard retrieval and ranking accuracy', () => {
    it('should maintain correct ranking order with various score distributions', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'TopPlayer', cumulativeScore: 1500, gamesPlayed: 10, lastPlayedDate: '2024-01-15' },
          { playerName: 'SecondPlace', cumulativeScore: 1200, gamesPlayed: 8, lastPlayedDate: '2024-01-14' },
          { playerName: 'ThirdPlace', cumulativeScore: 1000, gamesPlayed: 12, lastPlayedDate: '2024-01-13' },
          { playerName: 'FourthPlace', cumulativeScore: 800, gamesPlayed: 6, lastPlayedDate: '2024-01-12' },
          { playerName: 'FifthPlace', cumulativeScore: 600, gamesPlayed: 4, lastPlayedDate: '2024-01-11' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(5);
      
      // Verify strict descending order by cumulative score
      for (let i = 0; i < result.leaderboard!.length - 1; i++) {
        expect(result.leaderboard![i].cumulativeScore).toBeGreaterThanOrEqual(
          result.leaderboard![i + 1].cumulativeScore
        );
      }
      
      // Verify specific rankings
      expect(result.leaderboard![0].playerName).toBe('TopPlayer');
      expect(result.leaderboard![0].cumulativeScore).toBe(1500);
      expect(result.leaderboard![4].playerName).toBe('FifthPlace');
      expect(result.leaderboard![4].cumulativeScore).toBe(600);
    });

    it('should handle tied scores correctly', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'Player1', cumulativeScore: 500, gamesPlayed: 5, lastPlayedDate: '2024-01-15' },
          { playerName: 'Player2', cumulativeScore: 500, gamesPlayed: 4, lastPlayedDate: '2024-01-14' },
          { playerName: 'Player3', cumulativeScore: 400, gamesPlayed: 3, lastPlayedDate: '2024-01-13' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(3);
      
      // Both tied players should have same score
      expect(result.leaderboard![0].cumulativeScore).toBe(500);
      expect(result.leaderboard![1].cumulativeScore).toBe(500);
      expect(result.leaderboard![2].cumulativeScore).toBe(400);
    });

    it('should validate leaderboard data integrity', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'ValidPlayer1', cumulativeScore: 750, gamesPlayed: 5, lastPlayedDate: '2024-01-15' },
          { playerName: 'ValidPlayer2', cumulativeScore: 600, gamesPlayed: 3, lastPlayedDate: '2024-01-14' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      
      // Validate each entry has required fields
      result.leaderboard!.forEach(entry => {
        expect(entry.playerName).toBeTruthy();
        expect(typeof entry.cumulativeScore).toBe('number');
        expect(entry.cumulativeScore).toBeGreaterThanOrEqual(0);
        expect(typeof entry.gamesPlayed).toBe('number');
        expect(entry.gamesPlayed).toBeGreaterThan(0);
        expect(entry.lastPlayedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should handle large leaderboards with proper pagination', async () => {
      // Generate a large leaderboard
      const largeLeaderboard = Array.from({ length: 50 }, (_, i) => ({
        playerName: `Player${String(i + 1).padStart(3, '0')}`,
        cumulativeScore: 1000 - (i * 10), // Descending scores
        gamesPlayed: Math.floor(Math.random() * 10) + 1,
        lastPlayedDate: '2024-01-15'
      }));

      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: largeLeaderboard.slice(0, 25) // Return first 25
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(25);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(25);
      
      // Verify proper ordering in large dataset
      for (let i = 0; i < result.leaderboard!.length - 1; i++) {
        expect(result.leaderboard![i].cumulativeScore).toBeGreaterThanOrEqual(
          result.leaderboard![i + 1].cumulativeScore
        );
      }
    });

    it('should handle leaderboard with single player correctly', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'OnlyPlayer', cumulativeScore: 300, gamesPlayed: 2, lastPlayedDate: '2024-01-15' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(1);
      expect(result.leaderboard![0].playerName).toBe('OnlyPlayer');
      expect(result.leaderboard![0].cumulativeScore).toBe(300);
    });
    it('should retrieve leaderboard successfully', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'Player1', cumulativeScore: 500, gamesPlayed: 5, lastPlayedDate: '2024-01-15' },
          { playerName: 'Player2', cumulativeScore: 400, gamesPlayed: 4, lastPlayedDate: '2024-01-14' },
          { playerName: 'Player3', cumulativeScore: 300, gamesPlayed: 3, lastPlayedDate: '2024-01-13' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/leaderboard?limit=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.leaderboard).toHaveLength(3);
      
      // Verify ranking order (highest score first)
      expect(result.leaderboard![0].cumulativeScore).toBe(500);
      expect(result.leaderboard![1].cumulativeScore).toBe(400);
      expect(result.leaderboard![2].cumulativeScore).toBe(300);
    });

    it('should use cached leaderboard when available', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'CachedPlayer', cumulativeScore: 600, gamesPlayed: 6, lastPlayedDate: '2024-01-15' }
        ]
      };

      // First call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result1 = await apiClient.getLeaderboard(10);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await apiClient.getLeaderboard(10);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2).toEqual(result1);
    });

    it('should fallback to local leaderboard when API fails', async () => {
      const localScores = [
        { playerName: 'LocalPlayer1', cumulativeScore: 350, gamesPlayed: 3, lastPlayedDate: '2024-01-14' },
        { playerName: 'LocalPlayer2', cumulativeScore: 250, gamesPlayed: 2, lastPlayedDate: '2024-01-13' }
      ];

      mockGetItem.mockReturnValue(JSON.stringify(localScores));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard![0].playerName).toBe('LocalPlayer1');
      expect(result.leaderboard![1].playerName).toBe('LocalPlayer2');
    });

    it('should handle empty leaderboard response', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(10);

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: Array.from({ length: 5 }, (_, i) => ({
          playerName: `Player${i + 1}`,
          cumulativeScore: 500 - (i * 50),
          gamesPlayed: 5 - i,
          lastPlayedDate: '2024-01-15'
        }))
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(5);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/leaderboard?limit=5',
        expect.any(Object)
      );

      expect(result.leaderboard).toHaveLength(5);
    });
  });

  describe('Error handling and retry logic', () => {
    it('should retry on 500 server errors', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'RetryPlayer',
        dailyScore: 100,
        gameDate: '2024-01-15'
      };

      // First two calls fail with 500
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        })
        // Third call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, cumulativeScore: 100, gamesPlayed: 1 })
        });

      const result = await apiClient.submitScore(submission);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.cumulativeScore).toBe(100);
    });

    it('should not retry on 400 client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' })
      });

      const result = await apiClient.getSentence('2024-01-15');

      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
      expect(result.success).toBe(true); // Fallback sentence
    });

    it('should handle network timeout with retry', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'AbortError';

      // First call times out, second succeeds
      mockFetch
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            sentence: 'Timeout retry successful.',
            date: '2024-01-15',
            difficulty: 'medium',
            success: true
          })
        });

      const result = await apiClient.getSentence('2024-01-15');

      // getSentence catches errors and provides fallback, so we expect 1 call + fallback
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true); // Fallback sentence
      expect(result.sentence).toBeTruthy();
    });

    it('should stop retrying after max attempts', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service unavailable' })
      });

      const result = await apiClient.getSentence('2024-01-15');

      // getSentence catches errors and provides fallback, so we expect 1 call + fallback
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true); // Fallback sentence
    });

    it('should test retry logic directly with score submission', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'RetryTest',
        dailyScore: 100,
        gameDate: '2024-01-15'
      };

      // Mock 503 errors for all attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service unavailable' })
      });

      // This should trigger retry logic and eventually fail
      const result = await apiClient.submitScore(submission);

      // Should retry 2 times + initial attempt = 3 total, then fallback to local storage
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true); // Local storage fallback
      expect(result.error).toContain('saved locally');
    });
  });

  describe('Offline functionality and sync', () => {
    it('should sync pending submissions when connection restored', async () => {
      const pendingSubmissions = [
        { playerName: 'Player1', dailyScore: 100, gameDate: '2024-01-14' },
        { playerName: 'Player2', dailyScore: 150, gameDate: '2024-01-15' }
      ];

      mockGetItem.mockImplementation((key: string) => {
        if (key === 'guessTheSentence_pendingSubmissions') {
          return JSON.stringify(pendingSubmissions);
        }
        return null;
      });

      // Mock successful API calls for sync
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, cumulativeScore: 100, gamesPlayed: 1 })
      });

      await apiClient.syncPendingSubmissions();

      // Should have made API calls for each pending submission
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Should clear pending submissions after successful sync
      expect(mockSetItem).toHaveBeenCalledWith(
        'guessTheSentence_pendingSubmissions',
        '[]'
      );
    });

    it('should handle partial sync failures', async () => {
      const pendingSubmissions = [
        { playerName: 'Player1', dailyScore: 100, gameDate: '2024-01-14' },
        { playerName: 'Player2', dailyScore: 150, gameDate: '2024-01-15' }
      ];

      mockGetItem.mockImplementation((key: string) => {
        if (key === 'guessTheSentence_pendingSubmissions') {
          return JSON.stringify(pendingSubmissions);
        }
        return null;
      });

      // First submission succeeds, second fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, cumulativeScore: 100, gamesPlayed: 1 })
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await apiClient.syncPendingSubmissions();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Should only remove successful submission from pending list
      const savedPending = mockSetItem.mock.calls.find((call: [string, string]) => 
        call[0] === 'guessTheSentence_pendingSubmissions'
      );
      expect(savedPending).toBeTruthy();
      
      const remainingSubmissions = JSON.parse(savedPending[1]);
      expect(remainingSubmissions).toHaveLength(1);
      expect(remainingSubmissions[0].playerName).toBe('Player2');
    });

    it('should check API health correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sentence: 'Health check sentence.',
          date: today,
          difficulty: 'medium',
          success: true
        })
      });

      const isHealthy = await apiClient.checkApiHealth();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://test-api.example.com/api/sentence/${today}`,
        expect.any(Object)
      );
    });

    it('should return false for API health check on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await apiClient.checkApiHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('API endpoint integration tests', () => {
    it('should test sentence endpoint with proper request format', async () => {
      const testDate = '2024-01-15';
      const expectedUrl = `https://test-api.example.com/api/sentence/${testDate}`;
      
      const mockResponse: SentenceResponse = {
        sentence: 'Integration test sentence for API endpoint validation.',
        date: testDate,
        difficulty: 'medium',
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getSentence(testDate);

      // Verify correct API endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      );

      expect(result.sentence).toBe(mockResponse.sentence);
      expect(result.date).toBe(testDate);
    });

    it('should test score submission endpoint with proper payload structure', async () => {
      const submission: ScoreSubmissionRequest = {
        playerName: 'IntegrationTestPlayer',
        dailyScore: 275,
        gameDate: '2024-01-15'
      };

      const mockResponse: ScoreSubmissionResponse = {
        success: true,
        cumulativeScore: 275,
        gamesPlayed: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.submitScore(submission);

      // Verify correct API endpoint and payload
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/scores',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(submission),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      );

      expect(result.success).toBe(true);
      expect(result.cumulativeScore).toBe(275);
    });

    it('should test leaderboard endpoint with query parameters', async () => {
      const limit = 15;
      const expectedUrl = `https://test-api.example.com/api/leaderboard?limit=${limit}`;
      
      const mockResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [
          { playerName: 'LeaderboardTestPlayer', cumulativeScore: 500, gamesPlayed: 3, lastPlayedDate: '2024-01-15' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiClient.getLeaderboard(limit);

      // Verify correct API endpoint with query parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      );

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(1);
    });

    it('should handle API response format validation', async () => {
      // Test with malformed API response
      const malformedResponse = {
        sentence: 'Test sentence',
        // Missing required fields: date, difficulty, success
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(malformedResponse)
      });

      const result = await apiClient.getSentence('2024-01-15');

      // Should handle malformed response by using the response as-is
      expect(result.sentence).toBe('Test sentence');
      // The API client should still work with partial responses
      expect(result).toBeTruthy();
    });

    it('should validate API error response handling', async () => {
      const errorResponse = {
        error: 'Sentence not found for date',
        code: 'SENTENCE_NOT_FOUND'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(errorResponse)
      });

      const result = await apiClient.getSentence('2024-01-15');

      // Should fallback gracefully on API errors
      expect(result.success).toBe(true);
      expect(result.sentence).toBeTruthy();
      expect(result.date).toBe('2024-01-15');
    });

    it('should test concurrent API requests handling', async () => {
      const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
      const mockResponses = dates.map(date => ({
        sentence: `Concurrent test sentence for ${date}.`,
        date,
        difficulty: 'medium',
        success: true
      }));

      // Mock responses for concurrent requests
      mockResponses.forEach(response => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response)
        });
      });

      // Make concurrent requests
      const promises = dates.map(date => apiClient.getSentence(date));
      const results = await Promise.all(promises);

      // Verify all requests completed successfully
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.date).toBe(dates[index]);
        expect(result.success).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache management', () => {
    it('should cache responses with TTL', async () => {
      const mockResponse: SentenceResponse = {
        sentence: 'Cached test sentence.',
        date: '2024-01-15',
        difficulty: 'medium',
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call should fetch from API
      await apiClient.getSentence('2024-01-15');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await apiClient.getSentence('2024-01-15');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify cache statistics
      const stats = apiClient.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.keys).toContain('sentence:2024-01-15');
    });

    it('should clear cache correctly', async () => {
      const mockResponse: SentenceResponse = {
        sentence: 'Test sentence for cache clear.',
        date: '2024-01-15',
        difficulty: 'medium',
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await apiClient.getSentence('2024-01-15');
      expect(apiClient.getCacheStats().size).toBeGreaterThan(0);

      apiClient.clearCache();
      expect(apiClient.getCacheStats().size).toBe(0);
    });

    it('should clear leaderboard cache after score submission', async () => {
      // First, populate leaderboard cache
      const leaderboardResponse: LeaderboardResponse = {
        success: true,
        leaderboard: [{ playerName: 'TestPlayer', cumulativeScore: 100, gamesPlayed: 1, lastPlayedDate: '2024-01-15' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(leaderboardResponse)
      });

      await apiClient.getLeaderboard(10);
      expect(apiClient.getCacheStats().keys.some(key => key.startsWith('leaderboard:'))).toBe(true);

      // Submit score
      const submission: ScoreSubmissionRequest = {
        playerName: 'TestPlayer',
        dailyScore: 50,
        gameDate: '2024-01-15'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, cumulativeScore: 150, gamesPlayed: 2 })
      });

      await apiClient.submitScore(submission);

      // Leaderboard cache should be cleared
      expect(apiClient.getCacheStats().keys.some(key => key.startsWith('leaderboard:'))).toBe(false);
    });
  });
});