# Guess the Sentence Game

A daily word puzzle game designed for 5th grade students, featuring sentence guessing mechanics with scoring multipliers and a global leaderboard.

## 🎮 Game Features

- **Daily Sentences**: New educational sentences each day
- **Scoring System**: Points for correct guesses with streak multipliers
- **Global Leaderboard**: Compete with players worldwide
- **Educational Content**: Age-appropriate sentences for 5th graders
- **Responsive Design**: Works on tablets, phones, and computers

## 🚀 Production Deployment

### Quick Deploy

```bash
# Deploy everything (frontend + backend)
npm run deploy

# Deploy only Cloudflare Worker
npm run deploy:worker

# Test production environment
npm run test:production
```

### Manual Deployment Steps

1. **Frontend (GitHub Pages)**
   - Push to main branch triggers automatic deployment
   - Monitor at: Repository → Actions

2. **Backend (Cloudflare Workers)**
   ```bash
   cd worker
   npm install
   node setup-cloudflare.js  # First time only
   wrangler deploy --env production
   ```

3. **Verify Deployment**
   ```bash
   node test-production.js
   ```

## 🔧 Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📊 Monitoring and Analytics

- **Cloudflare Analytics**: Real-time API usage and performance metrics
- **GitHub Insights**: Frontend traffic and deployment monitoring
- **Health Checks**: Automated endpoint monitoring

See `monitoring-setup.md` for detailed configuration.

## 🏗️ Architecture

- **Frontend**: TypeScript + Vite, deployed to GitHub Pages
- **Backend**: Cloudflare Workers with D1 database and KV storage
- **Analytics**: Cloudflare Analytics Engine for usage tracking
- **CI/CD**: GitHub Actions for automated deployments

## 📁 Project Structure

```
├── src/                    # Frontend TypeScript code
├── worker/                 # Cloudflare Worker API
├── .github/workflows/      # CI/CD pipelines
├── monitoring-setup.md     # Production monitoring guide
├── test-production.js      # End-to-end production tests
└── deploy-production.sh    # Automated deployment script
```

## 🔒 Security Features

- **Sentence Protection**: Server-side storage prevents future sentence access
- **Score Validation**: Server-side verification prevents cheating
- **Rate Limiting**: Cloudflare protection against abuse
- **CORS Configuration**: Restricted to authorized domains

## 📚 Educational Standards

Designed for 5th grade reading level with sentences covering:
- Vocabulary and reading comprehension
- Science and nature concepts
- History and social studies
- Mathematical thinking
- Character and values education

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.