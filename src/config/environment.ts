/**
 * Environment configuration for different deployment stages
 * This centralizes all environment-specific settings
 */

export interface EnvironmentConfig {
  apiBaseUrl: string;
  githubPagesUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableAnalytics: boolean;
  enableDebugLogging: boolean;
}

// Get environment from build process or default to development
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  // In production builds, this will be replaced by the build process
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'production';
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'development';
  }
  return 'development';
};

const environment = getEnvironment();

const configs: Record<string, EnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:8787',
    githubPagesUrl: 'http://localhost:3000',
    environment: 'development',
    enableAnalytics: false,
    enableDebugLogging: true,
  },
  staging: {
    apiBaseUrl: 'https://guess-the-sentence-api-staging.workers.dev',
    githubPagesUrl: 'https://staging.example.com',
    environment: 'staging',
    enableAnalytics: false,
    enableDebugLogging: true,
  },
  production: {
    apiBaseUrl: 'https://guess-the-sentence-api-production.therobinson.workers.dev',
    githubPagesUrl: 'https://friscojones.github.io/firstrepo',
    environment: 'production',
    enableAnalytics: true,
    enableDebugLogging: false,
  },
};

export const config: EnvironmentConfig = configs[environment];

// Security headers for different environments
export const getSecurityHeaders = (): Record<string, string> => {
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (config.environment === 'production') {
    return {
      ...baseHeaders,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://guess-the-sentence-api.therobinson.workers.dev;",
    };
  }

  return baseHeaders;
};