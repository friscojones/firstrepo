/**
 * Cloudflare Worker for Guess the Sentence Game API
 * Handles sentence retrieval, score submission, and leaderboard operations
 */

import {
  Env,
  SentenceResponse,
  ScoreSubmissionRequest,
  ScoreSubmissionResponse,
  LeaderboardResponse,
  SentenceData,
  ErrorResponse,
} from './types';



// CORS headers for GitHub Pages domain access
function getCorsHeaders(env: Env, origin?: string): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Analytics helper function
function trackEvent(env: Env, eventType: string, data: Record<string, any> = {}) {
  if (env.GAME_ANALYTICS) {
    env.GAME_ANALYTICS.writeDataPoint({
      blobs: [eventType],
      doubles: [Date.now()],
      indexes: [eventType],
      ...data
    });
  }
}

// Response helper function
function jsonResponse(data: any, env: Env, status = 200, headers = {}, origin?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(env, origin),
      ...headers,
    },
  });
}

// Handle CORS preflight requests
function handleOptions(env: Env, origin?: string) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(env, origin),
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const origin = request.headers.get('Origin');

    // Track request analytics
    trackEvent(env, 'api_request', {
      blobs: [pathname, request.method, origin || 'unknown'],
      doubles: [Date.now()]
    });

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(env, origin);
    }

    // Health check endpoint
    if (pathname === '/health') {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() }, env, 200, {}, origin);
    }

    try {
      // Route handling
      if (pathname.startsWith('/api/sentence/')) {
        return handleSentenceRequest(request, env, pathname, origin);
      } else if (pathname === '/api/scores' && request.method === 'POST') {
        return handleScoreSubmission(request, env, origin);
      } else if (pathname === '/api/leaderboard' && request.method === 'GET') {
        return handleLeaderboardRequest(request, env, origin);
      } else {
        trackEvent(env, 'api_not_found', {
          blobs: [pathname, request.method],
          doubles: [Date.now()]
        });
        return jsonResponse({ error: 'Not found' } as ErrorResponse, env, 404, {}, origin);
      }
    } catch (error) {
      console.error('Worker error:', error);
      trackEvent(env, 'api_error', {
        blobs: [pathname, error.message || 'unknown_error'],
        doubles: [Date.now()]
      });
      return jsonResponse({ error: 'Internal server error' } as ErrorResponse, env, 500, {}, origin);
    }
  },
};

/**
 * Handle sentence retrieval endpoint
 * GET /api/sentence/{date}
 */
async function handleSentenceRequest(request: Request, env: Env, pathname: string, origin?: string): Promise<Response> {
  const dateMatch = pathname.match(/\/api\/sentence\/(.+)$/);
  if (!dateMatch) {
    return jsonResponse({ error: 'Invalid date format' } as ErrorResponse, env, 400, {}, origin);
  }

  const requestedDate = dateMatch[1];
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(requestedDate)) {
    return jsonResponse({ error: 'Date must be in YYYY-MM-DD format' } as ErrorResponse, env, 400, {}, origin);
  }

  // Only allow current date to prevent accessing future sentences
  const today = new Date().toISOString().split('T')[0];
  if (requestedDate > today) {
    return jsonResponse({ error: 'Cannot access future sentences' } as ErrorResponse, env, 403, {}, origin);
  }

  try {
    // Retrieve sentence from KV store
    const sentenceKey = `sentence:${requestedDate}`;
    const sentenceData = await env.SENTENCES_KV.get<SentenceData>(sentenceKey, 'json');

    if (!sentenceData) {
      return jsonResponse({ error: 'No sentence available for this date' } as ErrorResponse, env, 404, {}, origin);
    }

    const response: SentenceResponse = {
      sentence: sentenceData.sentence,
      date: requestedDate,
      difficulty: sentenceData.difficulty || 'medium',
    };

    // Track sentence retrieval
    trackEvent(env, 'sentence_retrieved', {
      blobs: [requestedDate, sentenceData.difficulty || 'medium'],
      doubles: [Date.now(), sentenceData.sentence.length]
    });

    return jsonResponse(response, env, 200, {}, origin);
  } catch (error) {
    console.error('Error retrieving sentence:', error);
    return jsonResponse({ error: 'Failed to retrieve sentence' } as ErrorResponse, env, 500, {}, origin);
  }
}

/**
 * Handle score submission endpoint
 * POST /api/scores
 */
async function handleScoreSubmission(request: Request, env: Env, origin?: string): Promise<Response> {
  try {
    const body: ScoreSubmissionRequest = await request.json();
    const { playerName, dailyScore, gameDate } = body;

    // Validate input
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return jsonResponse({ error: 'Player name is required' } as ErrorResponse, env, 400, {}, origin);
    }

    if (typeof dailyScore !== 'number' || dailyScore < 0) {
      return jsonResponse({ error: 'Valid daily score is required' } as ErrorResponse, env, 400, {}, origin);
    }

    if (!gameDate || !gameDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return jsonResponse({ error: 'Valid game date is required (YYYY-MM-DD)' } as ErrorResponse, env, 400, {}, origin);
    }

    // Sanitize player name
    const sanitizedName = playerName.trim().substring(0, 50);

    // Check if player already submitted for this date
    const existingScore = await env.GAME_DB.prepare(
      'SELECT daily_score FROM daily_scores WHERE player_name = ? AND game_date = ?'
    ).bind(sanitizedName, gameDate).first();

    if (existingScore) {
      return jsonResponse({ error: 'Score already submitted for this date' } as ErrorResponse, env, 409, {}, origin);
    }

    // Insert daily score
    await env.GAME_DB.prepare(
      'INSERT INTO daily_scores (player_name, game_date, daily_score, created_at) VALUES (?, ?, ?, ?)'
    ).bind(sanitizedName, gameDate, dailyScore, new Date().toISOString()).run();

    // Update or insert player cumulative score
    const existingPlayer = await env.GAME_DB.prepare(
      'SELECT cumulative_score, games_played FROM players WHERE player_name = ?'
    ).bind(sanitizedName).first();

    if (existingPlayer) {
      // Update existing player
      const newCumulativeScore = (existingPlayer.cumulative_score as number) + dailyScore;
      const newGamesPlayed = (existingPlayer.games_played as number) + 1;
      
      await env.GAME_DB.prepare(
        'UPDATE players SET cumulative_score = ?, games_played = ?, last_played = ? WHERE player_name = ?'
      ).bind(newCumulativeScore, newGamesPlayed, gameDate, sanitizedName).run();
    } else {
      // Insert new player
      await env.GAME_DB.prepare(
        'INSERT INTO players (player_name, cumulative_score, games_played, last_played) VALUES (?, ?, ?, ?)'
      ).bind(sanitizedName, dailyScore, 1, gameDate).run();
    }

    const response: ScoreSubmissionResponse = {
      success: true,
      message: 'Score submitted successfully',
      playerName: sanitizedName,
      dailyScore,
      gameDate,
    };

    // Track score submission
    trackEvent(env, 'score_submitted', {
      blobs: [gameDate, sanitizedName],
      doubles: [Date.now(), dailyScore]
    });

    return jsonResponse(response, env, 200, {}, origin);
  } catch (error) {
    console.error('Error submitting score:', error);
    return jsonResponse({ error: 'Failed to submit score' } as ErrorResponse, env, 500, {}, origin);
  }
}

/**
 * Handle leaderboard request endpoint
 * GET /api/leaderboard
 */
async function handleLeaderboardRequest(request: Request, env: Env, origin?: string): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);

  try {
    // Query top players by cumulative score
    const results = await env.GAME_DB.prepare(
      'SELECT player_name, cumulative_score, games_played, last_played FROM players ORDER BY cumulative_score DESC LIMIT ?'
    ).bind(limit).all();

    const leaderboard = results.results.map((row: any, index: number) => ({
      rank: index + 1,
      playerName: row.player_name as string,
      cumulativeScore: row.cumulative_score as number,
      gamesPlayed: row.games_played as number,
      lastPlayedDate: row.last_played as string,
    }));

    const response: LeaderboardResponse = {
      leaderboard,
      totalPlayers: results.results.length,
      lastUpdated: new Date().toISOString(),
    };

    // Track leaderboard access
    trackEvent(env, 'leaderboard_viewed', {
      blobs: [limit.toString()],
      doubles: [Date.now(), results.results.length]
    });

    return jsonResponse(response, env, 200, {}, origin);
  } catch (error) {
    console.error('Error retrieving leaderboard:', error);
    return jsonResponse({ error: 'Failed to retrieve leaderboard' } as ErrorResponse, env, 500, {}, origin);
  }
}