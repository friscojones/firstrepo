# Production Monitoring Setup

## Overview

This document outlines the monitoring and analytics setup for the "Guess the Sentence" game in production. The monitoring covers both the frontend (GitHub Pages) and backend (Cloudflare Workers) components.

## Cloudflare Analytics

### Analytics Engine Setup

The Cloudflare Worker includes Analytics Engine integration to track:

- **API Requests**: All endpoint access with timestamps and origins
- **Sentence Retrievals**: Daily sentence access patterns and difficulty preferences
- **Score Submissions**: Player engagement and scoring patterns
- **Leaderboard Views**: Competitive feature usage
- **Error Tracking**: Failed requests and system issues

### Key Metrics Tracked

1. **Usage Metrics**
   - Total API requests per day
   - Unique players per day
   - Average session duration
   - Peak usage times

2. **Game Metrics**
   - Daily sentence completion rates
   - Average scores per difficulty level
   - Player retention (returning players)
   - Leaderboard engagement

3. **Performance Metrics**
   - API response times
   - Error rates by endpoint
   - Geographic distribution of players
   - Device/browser usage patterns

### Accessing Analytics

1. **Cloudflare Dashboard**
   - Navigate to Workers & Pages → guess-the-sentence-api
   - Click on "Analytics" tab
   - View real-time and historical data

2. **GraphQL API** (Advanced)
   ```graphql
   query GameAnalytics($zoneTag: string, $datetimeStart: string, $datetimeEnd: string) {
     viewer {
       zones(filter: {zoneTag: $zoneTag}) {
         analyticsEngineDatasets {
           query(
             filter: {
               datetime_gte: $datetimeStart
               datetime_lte: $datetimeEnd
             }
           ) {
             count
             dimensions {
               blob1  # Event type
               blob2  # Additional context
             }
             metrics {
               double1  # Timestamp
               double2  # Value
             }
           }
         }
       }
     }
   }
   ```

## GitHub Pages Monitoring

### Built-in Analytics

GitHub Pages provides basic traffic analytics:

1. **Repository Insights**
   - Navigate to repository → Insights → Traffic
   - View page views and unique visitors
   - Monitor referrer sources

2. **Actions Monitoring**
   - Navigate to repository → Actions
   - Monitor deployment success/failure rates
   - Track build times and performance

### Custom Analytics Integration

For enhanced frontend analytics, consider integrating:

1. **Google Analytics 4** (Privacy-compliant)
   ```html
   <!-- Add to index.html -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```

2. **Plausible Analytics** (Privacy-focused alternative)
   ```html
   <script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
   ```

## Alerting and Notifications

### Cloudflare Alerts

Set up alerts in Cloudflare Dashboard:

1. **Error Rate Alerts**
   - Threshold: >5% error rate over 5 minutes
   - Notification: Email/Slack/PagerDuty

2. **Traffic Spike Alerts**
   - Threshold: >200% increase in requests
   - Notification: Email notification

3. **Performance Alerts**
   - Threshold: >2 second average response time
   - Notification: Email notification

### GitHub Actions Monitoring

Monitor deployment health:

```yaml
# Add to .github/workflows/deploy.yml
- name: Notify on deployment failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Health Checks

### Automated Health Monitoring

1. **Uptime Monitoring**
   - Use services like UptimeRobot or Pingdom
   - Monitor both frontend and API endpoints
   - Check every 5 minutes

2. **Synthetic Testing**
   - Run end-to-end tests every hour
   - Use the `test-production.js` script
   - Alert on test failures

### Health Check Endpoints

The worker includes a health check endpoint:

```bash
# Check worker health
curl https://your-worker.workers.dev/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-10-25T12:00:00.000Z"
}
```

## Performance Monitoring

### Core Web Vitals

Monitor frontend performance:

1. **Largest Contentful Paint (LCP)**: < 2.5s
2. **First Input Delay (FID)**: < 100ms
3. **Cumulative Layout Shift (CLS)**: < 0.1

### API Performance

Track backend metrics:

1. **Response Times**
   - Sentence API: < 200ms
   - Score submission: < 500ms
   - Leaderboard: < 300ms

2. **Throughput**
   - Requests per second
   - Concurrent users
   - Database query performance

## Data Retention and Privacy

### Analytics Data Retention

- **Cloudflare Analytics**: 30 days (free tier)
- **GitHub Insights**: 14 days
- **Custom Analytics**: Configure based on privacy policy

### Privacy Compliance

1. **COPPA Compliance** (for 5th graders)
   - No personal data collection beyond game scores
   - Parental consent for any data collection
   - Clear privacy policy

2. **Data Minimization**
   - Only collect necessary game metrics
   - Anonymize player data where possible
   - Regular data cleanup

## Monitoring Checklist

### Daily Monitoring
- [ ] Check error rates in Cloudflare dashboard
- [ ] Review GitHub Actions deployment status
- [ ] Monitor player engagement metrics
- [ ] Check for any alert notifications

### Weekly Monitoring
- [ ] Analyze usage trends and patterns
- [ ] Review performance metrics
- [ ] Check database storage usage
- [ ] Update monitoring thresholds if needed

### Monthly Monitoring
- [ ] Generate usage reports
- [ ] Review and optimize performance
- [ ] Update monitoring configuration
- [ ] Plan capacity scaling if needed

## Troubleshooting Common Issues

### High Error Rates
1. Check Cloudflare Worker logs
2. Verify database connectivity
3. Check KV namespace accessibility
4. Review recent deployments

### Performance Degradation
1. Monitor database query performance
2. Check CDN cache hit rates
3. Review worker CPU usage
4. Analyze traffic patterns

### Deployment Failures
1. Check GitHub Actions logs
2. Verify build configuration
3. Test locally before deployment
4. Review dependency updates

## Cost Monitoring

### Cloudflare Usage
- Monitor Workers requests (100k/day free)
- Track D1 database operations (5M reads, 100k writes/day free)
- Watch KV operations (100k reads, 1k writes/day free)

### GitHub Actions
- Monitor build minutes usage
- Optimize workflow efficiency
- Use caching to reduce build times

## Reporting and Insights

### Weekly Reports
Generate automated reports including:
- Total players and games played
- Popular sentence difficulties
- Geographic distribution
- Performance metrics
- Error summaries

### Monthly Business Metrics
- Player growth and retention
- Feature usage patterns
- Performance improvements
- Cost optimization opportunities

This monitoring setup ensures reliable operation and provides insights for continuous improvement of the game experience.