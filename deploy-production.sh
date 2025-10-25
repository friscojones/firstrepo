#!/bin/bash

# Production Deployment Script for Guess the Sentence Game
# This script deploys both the frontend (GitHub Pages) and backend (Cloudflare Workers)

set -e  # Exit on any error

echo "🚀 Starting production deployment for Guess the Sentence Game..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO_URL="https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/' | sed 's/\.git$//')"
GITHUB_PAGES_URL="https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/\([^/]*\).*/\1.github.io\/\2/' | sed 's/\.git$//')"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Repository: $GITHUB_REPO_URL"
echo "  GitHub Pages: $GITHUB_PAGES_URL"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists git; then
    print_error "git is not installed"
    exit 1
fi

print_status "All prerequisites are installed"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "You are not on the main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first"
        exit 1
    fi
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
npm ci
print_status "Frontend dependencies installed"

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
npm run test
print_status "All tests passed"

# Lint code
echo -e "${BLUE}🔍 Linting code...${NC}"
npm run lint
print_status "Code linting passed"

# Build frontend
echo -e "${BLUE}🏗️  Building frontend...${NC}"
npm run build
print_status "Frontend build completed"

# Deploy Cloudflare Worker (if wrangler is available)
if command_exists wrangler; then
    echo -e "${BLUE}⚡ Deploying Cloudflare Worker...${NC}"
    
    # Check if worker directory exists
    if [ -d "worker" ]; then
        cd worker
        
        # Install worker dependencies
        echo "📦 Installing worker dependencies..."
        npm ci
        
        # Validate worker configuration
        echo "🔍 Validating worker configuration..."
        if [ -f "validate-config.js" ]; then
            node validate-config.js
            print_status "Worker configuration validated"
        else
            print_warning "Worker validation script not found, skipping validation"
        fi
        
        # Deploy worker
        echo "🚀 Deploying worker to production..."
        if [ -f "deploy-production.js" ]; then
            node deploy-production.js
        else
            wrangler deploy --env production
        fi
        
        print_status "Cloudflare Worker deployed"
        cd ..
    else
        print_warning "Worker directory not found, skipping worker deployment"
    fi
else
    print_warning "Wrangler CLI not found, skipping Cloudflare Worker deployment"
    echo "  Install with: npm install -g wrangler"
fi

# Push to GitHub (triggers GitHub Actions deployment)
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push origin "$CURRENT_BRANCH"
print_status "Code pushed to GitHub"

# Wait for GitHub Actions deployment
echo -e "${BLUE}⏳ Waiting for GitHub Actions deployment...${NC}"
echo "  Monitor deployment at: $GITHUB_REPO_URL/actions"

# Function to check GitHub Pages deployment status
check_deployment_status() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "  Checking deployment status (attempt $attempt/$max_attempts)..."
        
        # Check if the site is accessible
        if curl -s -o /dev/null -w "%{http_code}" "$GITHUB_PAGES_URL" | grep -q "200"; then
            print_status "GitHub Pages deployment successful"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    print_warning "Deployment status check timed out"
    return 1
}

# Check deployment status
if check_deployment_status; then
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo "  Frontend URL: $GITHUB_PAGES_URL"
    echo "  Repository: $GITHUB_REPO_URL"
    echo "  Actions: $GITHUB_REPO_URL/actions"
    
    if command_exists wrangler && [ -d "worker" ]; then
        WORKER_URL=$(cd worker && wrangler whoami 2>/dev/null | grep -o 'https://[^/]*\.workers\.dev' | head -1 || echo "Check Cloudflare dashboard")
        echo "  Worker API: $WORKER_URL"
    fi
    
    echo ""
    echo -e "${BLUE}🔧 Next Steps:${NC}"
    echo "  1. Test the deployed application: $GITHUB_PAGES_URL"
    echo "  2. Run end-to-end tests: node test-production.js"
    echo "  3. Monitor analytics in Cloudflare dashboard"
    echo "  4. Set up monitoring alerts (see monitoring-setup.md)"
    
    # Offer to run production tests
    echo ""
    read -p "Run end-to-end production tests now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "test-production.js" ]; then
            echo -e "${BLUE}🧪 Running production tests...${NC}"
            GITHUB_PAGES_URL="$GITHUB_PAGES_URL" node test-production.js
        else
            print_warning "Production test script not found"
        fi
    fi
    
else
    print_warning "Could not verify deployment status"
    echo "  Please check manually: $GITHUB_PAGES_URL"
    echo "  Monitor GitHub Actions: $GITHUB_REPO_URL/actions"
fi

echo ""
echo -e "${GREEN}✨ Production deployment process completed!${NC}"