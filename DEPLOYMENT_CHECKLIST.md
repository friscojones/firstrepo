# Production Deployment Checklist

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (or failing tests are due to expected API unavailability)
- [ ] Code linting completed (warnings acceptable for deployment)
- [ ] TypeScript compilation successful
- [ ] No critical security vulnerabilities

### Configuration
- [ ] GitHub Pages configuration updated in `vite.config.ts`
- [ ] Cloudflare Worker configuration completed in `wrangler.toml`
- [ ] Environment variables configured for production
- [ ] CORS settings configured for GitHub Pages domain

### Infrastructure Setup
- [ ] Cloudflare account configured
- [ ] D1 database created and schema applied
- [ ] KV namespace created for sentences
- [ ] Analytics Engine dataset configured
- [ ] GitHub repository settings configured for Pages

## Deployment Steps

### 1. Frontend Deployment (GitHub Pages)
- [ ] Push code to main branch
- [ ] GitHub Actions workflow triggers automatically
- [ ] Monitor deployment in Actions tab
- [ ] Verify site accessibility at GitHub Pages URL

### 2. Backend Deployment (Cloudflare Workers)
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Authenticate: `wrangler login`
- [ ] Deploy worker: `cd worker && wrangler deploy --env production`
- [ ] Verify API endpoints are accessible

### 3. Database and Storage Setup
- [ ] Apply database schema: `wrangler d1 execute guess-the-sentence-db --file=./schema.sql`
- [ ] Populate sentences: `node populate-sentences.js`
- [ ] Verify KV and D1 connectivity

## Post-Deployment Verification

### Automated Testing
- [ ] Run production tests: `npm run test:production`
- [ ] Verify all API endpoints respond correctly
- [ ] Test complete game flow end-to-end

### Manual Testing
- [ ] Load game in browser
- [ ] Test sentence loading
- [ ] Test letter guessing functionality
- [ ] Test score submission
- [ ] Test leaderboard display
- [ ] Test responsive design on mobile

### Monitoring Setup
- [ ] Configure Cloudflare Analytics alerts
- [ ] Set up uptime monitoring
- [ ] Verify error tracking is working
- [ ] Test health check endpoints

## Security Verification

### Data Protection
- [ ] Verify sentences cannot be accessed from client
- [ ] Test CORS restrictions are working
- [ ] Verify rate limiting is active
- [ ] Test input validation and sanitization

### Access Control
- [ ] Verify API endpoints require proper authentication
- [ ] Test that future sentences cannot be accessed
- [ ] Verify score submission validation

## Performance Verification

### Frontend Performance
- [ ] Page load time < 3 seconds
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Interactive elements respond quickly
- [ ] Mobile performance acceptable

### Backend Performance
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] CDN caching working correctly
- [ ] Analytics tracking minimal overhead

## Rollback Plan

### If Deployment Fails
1. **Frontend Issues**
   - Revert to previous commit
   - Push to main branch to trigger redeployment
   - Monitor GitHub Actions for successful deployment

2. **Backend Issues**
   - Deploy previous worker version: `wrangler rollback`
   - Verify database integrity
   - Check configuration settings

3. **Database Issues**
   - Restore from backup if available
   - Re-apply schema if corrupted
   - Re-populate sentences if needed

## Maintenance Tasks

### Daily
- [ ] Monitor error rates and performance
- [ ] Check player engagement metrics
- [ ] Verify automated backups

### Weekly
- [ ] Review analytics and usage patterns
- [ ] Update sentences if needed
- [ ] Check for security updates

### Monthly
- [ ] Performance optimization review
- [ ] Cost analysis and optimization
- [ ] Feature usage analysis
- [ ] Security audit

## Emergency Contacts

- **GitHub Issues**: Repository issues tab
- **Cloudflare Support**: Cloudflare dashboard support
- **Domain Issues**: DNS provider support

## Documentation Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Monitoring Setup Guide](./monitoring-setup.md)
- [Production Testing Guide](./test-production.js)

## Success Criteria

Deployment is considered successful when:
- [ ] Frontend loads without errors
- [ ] All API endpoints respond correctly
- [ ] Game functionality works end-to-end
- [ ] Monitoring and analytics are active
- [ ] Performance meets requirements
- [ ] Security measures are verified

## Notes

- Keep this checklist updated with any changes to the deployment process
- Document any issues encountered and their solutions
- Maintain version history of successful deployments