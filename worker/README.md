# Guess the Sentence Game - Cloudflare Worker API

This directory contains the Cloudflare Worker implementation for the Guess the Sentence Game API. The Worker provides secure endpoints for sentence retrieval, score submission, and leaderboard management.

## Architecture

- **Cloudflare Workers**: Serverless API endpoints with TypeScript
- **Cloudflare D1**: SQL database for player scores and leaderboard data
- **Cloudflare KV**: Key-value store for daily sentences with global edge caching
- **CORS Support**: Configured for GitHub Pages domain access

## API Endpoints

### GET /api/sentence/{date}
Retrieves the daily sentence for a specific date.

**Parameters:**
- `date`: Date in YYYY-MM-DD format

**Response:**
```json
{
  "sentence": "The quick brown fox jumps over the lazy dog",
  "date": "2024-10-25",
  "difficulty": "easy"
}
```

**Security:**
- Only current and past dates are allowed
- Future sentences are blocked to prevent cheating
- Sentences are stored server-side in KV store

### POST /api/scores
Submits a player's daily score to the leaderboard.

**Request Body:**
```json
{
  "playerName": "John Doe",
  "dailyScore": 150,
  "gameDate": "2024-10-25"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "playerName": "John Doe",
  "dailyScore": 150,
  "gameDate": "2024-10-25"
}
```

**Validation:**
- Player names are sanitized and limited to 50 characters
- Duplicate submissions for the same date are prevented
- Scores must be non-negative numbers

### GET /api/leaderboard
Retrieves the global leaderboard with cumulative scores.

**Query Parameters:**
- `limit`: Maximum number of players to return (default: 10, max: 100)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "playerName": "John Doe",
      "cumulativeScore": 450,
      "gamesPlayed": 3,
      "lastPlayedDate": "2024-10-25"
    }
  ],
  "totalPlayers": 1,
  "lastUpdated": "2024-10-25T12:00:00.000Z"
}
```

## Database Schema

### Players Table
- `player_name` (TEXT, PRIMARY KEY): Unique player identifier
- `cumulative_score` (INTEGER): Total points across all games
- `games_played` (INTEGER): Number of games completed
- `last_played` (TEXT): Date of last game played
- `created_at` (TEXT): Account creation timestamp

### Daily Scores Table
- `id` (INTEGER, PRIMARY KEY): Auto-increment ID
- `player_name` (TEXT): Reference to player
- `game_date` (TEXT): Date of the game session
- `daily_score` (INTEGER): Points earned in that session
- `created_at` (TEXT): Score submission timestamp
- Unique constraint on (player_name, game_date)

## Security Features

1. **Sentence Protection**: Daily sentences are stored server-side in KV store, preventing client-side access to future content
2. **Date Validation**: Only current and past dates are allowed for sentence retrieval
3. **Input Sanitization**: Player names are cleaned and length-limited
4. **Duplicate Prevention**: Multiple score submissions for the same date are blocked
5. **CORS Configuration**: Proper CORS headers for GitHub Pages domain
6. **Rate Limiting**: Leverages Cloudflare's built-in DDoS protection

## Deployment

See `deploy.md` for detailed deployment instructions including:
- Setting up D1 database and KV namespaces
- Configuring environment variables
- Deploying the Worker to Cloudflare

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Deploy to production
npm run deploy

# View logs
npm run tail
```

## Environment Variables

- `ALLOWED_ORIGINS`: GitHub Pages domain for CORS (configured in wrangler.toml)
- `SENTENCES_KV`: KV namespace binding for daily sentences
- `GAME_DB`: D1 database binding for player data

## Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:
- 400: Bad Request (invalid input)
- 403: Forbidden (future date access)
- 404: Not Found (sentence not available)
- 409: Conflict (duplicate score submission)
- 500: Internal Server Error

All errors return a consistent JSON format:
```json
{
  "error": "Error message description"
}
```