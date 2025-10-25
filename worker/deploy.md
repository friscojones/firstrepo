# Cloudflare Worker Setup and Deployment Guide

## Overview

This guide walks you through setting up the Cloudflare infrastructure for the "Guess the Sentence" game, including KV storage for daily sentences and D1 database for the leaderboard system.

## Prerequisites

1. **Cloudflare Account**: Free account with Workers and D1 enabled
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Authentication**: Run `wrangler login` to authenticate
4. **Node.js**: Version 16+ for running setup scripts

## Quick Setup (Automated)

For fastest setup, use our automated script:

```bash
cd worker
npm install
node setup-cloudflare.js
```

This script will:
- Create D1 database and KV namespaces
- Apply database schema with indexes
- Populate sample sentences
- Provide configuration IDs for wrangler.toml

## Manual Setup Steps

### 1. Install Dependencies
```bash
cd worker
npm install
```

### 2. Create Cloudflare Resources

#### D1 Database
```bash
# Create the database
wrangler d1 create guess-the-sentence-db

# Copy the database_id from output for wrangler.toml
```

#### KV Namespaces
```bash
# Create production KV namespace
wrangler kv:namespace create "SENTENCES_KV"

# Create preview namespace for development
wrangler kv:namespace create "SENTENCES_KV" --preview

# Copy both namespace IDs for wrangler.toml
```

### 3. Configure wrangler.toml

Update the following placeholders in `wrangler.toml`:
- `database_id_placeholder` → Your D1 database ID
- `sentences_namespace_id` → Your production KV namespace ID  
- `sentences_preview_id` → Your preview KV namespace ID
- `https://yourusername.github.io` → Your actual GitHub Pages URL

### 4. Initialize Database

Apply the schema with sample data:
```bash
wrangler d1 execute guess-the-sentence-db --file=./schema.sql
```

This creates:
- `players` table with cumulative scores
- `daily_scores` table for individual game sessions
- Optimized indexes for leaderboard queries
- Sample test data for development

### 5. Populate Sentences

Add age-appropriate sentences for 5th graders:
```bash
node populate-sentences.js
```

This adds 40+ sentences covering various educational themes:
- Reading and vocabulary
- Science and nature
- History and civics
- Mathematics concepts
- Social skills and values

### 6. Validate Configuration

Verify everything is set up correctly:
```bash
node validate-config.js
```

This checks:
- Configuration file completeness
- KV namespace accessibility
- D1 database schema
- Sample data population

### 7. Deploy Worker

```bash
# Test locally first
wrangler dev

# Deploy to production
wrangler deploy
```

## API Endpoints

Your deployed worker provides these endpoints:

### GET /api/sentence/{date}
Retrieves the daily sentence for a specific date.
- **Parameters**: `date` in YYYY-MM-DD format
- **Returns**: `{ sentence: string, difficulty: string }`
- **Security**: Only returns current/past dates

### POST /api/scores
Submits a player's daily score to the leaderboard.
- **Body**: `{ playerName: string, dailyScore: number, gameDate: string }`
- **Returns**: `{ success: boolean, cumulativeScore: number }`
- **Validation**: Prevents duplicate submissions for same date

### GET /api/leaderboard
Retrieves top players from the global leaderboard.
- **Query**: `?limit=10` (optional, default 10, max 50)
- **Returns**: Array of `{ playerName, cumulativeScore, gamesPlayed }`
- **Sorting**: By cumulative score descending

## Configuration Options

### Environment Variables (wrangler.toml)
- `ALLOWED_ORIGINS`: CORS origins (your GitHub Pages URL)
- `MAX_LEADERBOARD_ENTRIES`: Maximum leaderboard size (default: 50)
- `MAX_PLAYER_NAME_LENGTH`: Player name character limit (default: 50)
- `RATE_LIMIT_REQUESTS`: Requests per window (default: 100)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: 60)

### Database Schema
The D1 database includes optimized indexes for:
- Leaderboard ranking queries (`cumulative_score DESC`)
- Player lookup and updates (`player_name`, `last_played`)
- Daily score queries (`game_date`, `player_name`)

### KV Storage Structure
Sentences are stored with date-based keys:
- Key format: `sentence:YYYY-MM-DD`
- Value: `{ sentence: string, difficulty: string }`
- TTL: Automatic cleanup of old sentences

## Security Features

### Sentence Protection
- Server-side storage prevents client access to future sentences
- Date validation ensures only current/past sentences are accessible
- Obfuscated storage format prevents easy inspection

### Score Integrity
- Duplicate submission prevention per player per date
- Server-side score validation and sanitization
- Player name length limits and character filtering

### Rate Limiting
- Cloudflare's built-in DDoS protection
- Configurable request limits per IP
- CORS restrictions to authorized domains

## Troubleshooting

### Common Issues

**"Database not found"**
- Verify database ID in wrangler.toml matches created database
- Ensure you're authenticated with correct Cloudflare account

**"KV namespace not found"**
- Check namespace IDs in wrangler.toml
- Verify namespaces exist with `wrangler kv:namespace list`

**"CORS errors"**
- Update ALLOWED_ORIGINS with your exact GitHub Pages URL
- Include protocol (https://) and no trailing slash

**"Schema errors"**
- Re-run schema application: `wrangler d1 execute guess-the-sentence-db --file=./schema.sql`
- Check for syntax errors in schema.sql

### Validation Commands

```bash
# List all KV keys
wrangler kv:key list --binding=SENTENCES_KV

# Query database tables
wrangler d1 execute guess-the-sentence-db --command="SELECT COUNT(*) FROM players;"

# Test API locally
wrangler dev
curl http://localhost:8787/api/sentence/2024-10-25
```

## Monitoring and Maintenance

### Analytics
- Enable Cloudflare Analytics in dashboard
- Monitor request patterns and error rates
- Track popular sentence difficulties

### Maintenance Tasks
- Add new sentences monthly via populate-sentences.js
- Monitor database size and cleanup old daily_scores if needed
- Update CORS origins when deploying to new domains

### Backup
- Export player data: `wrangler d1 export guess-the-sentence-db`
- Backup KV sentences: `wrangler kv:key list --binding=SENTENCES_KV`

## Cost Considerations

### Free Tier Limits
- **Workers**: 100,000 requests/day
- **D1**: 5 million row reads/day, 100,000 row writes/day  
- **KV**: 100,000 read operations/day, 1,000 write operations/day

### Optimization Tips
- Cache sentence responses in client for 24 hours
- Batch leaderboard updates to reduce D1 writes
- Use KV TTL to automatically clean up old sentences

For a typical classroom of 30 students playing daily, you'll stay well within free tier limits.