# GitHub Actions Deployment Fix

## Authentication Error Fix

The deployment is failing with: `Unable to authenticate request [code: 10001]`

### Required Action: Update Cloudflare API Token

1. **Go to Cloudflare Dashboard**:
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"

2. **Create Custom Token with these permissions**:
   ```
   Account - Cloudflare Workers:Edit
   Zone - Zone Settings:Read  
   Zone - Zone:Read
   ```

3. **Add Token to GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Update `CLOUDFLARE_API_TOKEN` with the new token

### Alternative: Use Global API Key (Less Secure)

If custom token doesn't work, you can use your Global API Key:
1. Get your Global API Key from Cloudflare dashboard
2. Add both secrets to GitHub:
   - `CLOUDFLARE_API_TOKEN` (your Global API Key)
   - `CLOUDFLARE_EMAIL` (your Cloudflare account email)

### Test the Fix

After updating the token, push any change to the `worker/` directory to trigger the deployment.

## Changes Made

1. **Updated Node.js version**: Changed from 18 to 20 (required for Wrangler 4.x)
2. **Fixed validation script**: Made it CI-friendly by skipping local-only checks
3. **Pinned Wrangler version**: Using stable 3.90.0 to avoid compatibility issues

The deployment should work once the API token is properly configured.