# Production Deployment Guide

## Prerequisites Setup

### 1. Cloudflare Account Setup
1. Create a free Cloudflare account at https://cloudflare.com
2. Verify your email address
3. Note your account ID (found in the right sidebar of the Cloudflare dashboard)

### 2. Wrangler CLI Authentication
```bash
# Authenticate with Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 3. GitHub Pages Setup
1. Go to your repository settings: https://github.com/friscojones/firstrepo/settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. This enables GitHub Actions to deploy to GitHub Pages

## Automated Deployment Steps

### Step 1: Set up Cloudflare Resources
```bash
cd worker
npm install
node setup-cloudflare.js
```

This will create:
- D1 database for leaderboard data
- KV namespaces for daily sentences
- Display configuration IDs to update wrangler.toml

### Step 2: Update Configuration
After running the setup script, update `worker/wrangler.toml` with the IDs provided:
- Replace `database_id_placeholder` with your D1 database ID
- Replace `sentences_namespace_id` with your production KV namespace ID
- Replace `sentences_preview_id` with your preview KV namespace ID

### Step 3: Deploy Cloudflare Worker
```bash
cd worker
wrangler deploy --env production
```

### Step 4: Deploy Frontend
```bash
# Build and deploy frontend
npm run build

# Push to trigger GitHub Actions deployment
git add .
git commit -m "Deploy to production"
git push origin main
```

### Step 5: Run Production Tests
```bash
# Test the complete deployment
npm run test:production
```

## Manual Verification Steps

1. **Frontend**: Visit https://friscojones.github.io/firstrepo
2. **API Health**: Check https://guess-the-sentence-api.friscojones.workers.dev/health
3. **Game Flow**: Play a complete game and submit score
4. **Leaderboard**: Verify leaderboard displays correctly

## Troubleshooting

### Common Issues

**"Database not found"**
- Ensure wrangler.toml has correct database_id
- Verify you're authenticated with the right Cloudflare account

**"CORS errors"**
- Check ALLOWED_ORIGINS in wrangler.toml matches your GitHub Pages URL exactly
- Ensure no trailing slash in the URL

**"GitHub Pages not deploying"**
- Check Actions tab for deployment status
- Ensure Pages is enabled in repository settings
- Verify the workflow has proper permissions

### Getting Help

1. Check GitHub Actions logs: https://github.com/friscojones/firstrepo/actions
2. View Cloudflare Worker logs: `wrangler tail`
3. Test API endpoints manually with curl or browser