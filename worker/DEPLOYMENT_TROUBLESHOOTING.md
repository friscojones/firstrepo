# Deployment Troubleshooting Guide

## Common GitHub Actions Deployment Issues

### 1. Authentication Failures
**Error**: `Authentication failed` or `Invalid API token`

**Solutions**:
- Verify `CLOUDFLARE_API_TOKEN` is set in GitHub repository secrets
- Ensure the API token has the correct permissions:
  - Zone:Zone:Read
  - Zone:Zone Settings:Edit  
  - Account:Cloudflare Workers:Edit
  - Account:Account Settings:Read

### 2. Resource Not Found Errors
**Error**: `KV namespace not found` or `D1 database not found`

**Solutions**:
- Run `node setup-cloudflare.js` locally to create resources
- Update `wrangler.toml` with the correct resource IDs
- Verify resource IDs match between environments

### 3. Wrangler Version Issues
**Error**: `Command not found` or compatibility errors

**Solutions**:
- Update to latest wrangler version: `npm install wrangler@latest`
- Clear npm cache: `npm cache clean --force`
- Use specific wrangler version in package.json

### 4. TypeScript Compilation Errors
**Error**: TypeScript build failures

**Solutions**:
- Run `npx wrangler types` to generate type definitions
- Check `tsconfig.json` configuration
- Verify all imports are correct

### 5. Environment Configuration Issues
**Error**: Environment variables not found

**Solutions**:
- Check `[env.production]` section in `wrangler.toml`
- Verify variable names match between config and code
- Use proper TOML syntax for nested configurations

## Debugging Steps

1. **Test locally first**:
   ```bash
   cd worker
   npm install
   npx wrangler dev
   ```

2. **Validate configuration**:
   ```bash
   node validate-config.js
   ```

3. **Check resource status**:
   ```bash
   npx wrangler kv namespace list
   npx wrangler d1 list
   ```

4. **Manual deployment test**:
   ```bash
   npx wrangler deploy --env production
   ```

## GitHub Actions Secrets Required

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with worker permissions

## Monitoring Deployment

After successful deployment:
- Check Cloudflare dashboard for worker status
- Test API endpoints manually
- Monitor worker logs: `npx wrangler tail --env production`