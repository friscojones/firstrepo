#!/bin/bash

# Security Audit Script for Guess the Sentence Game
# Run this before each deployment to check for security issues

set -e

echo "🔒 Security Audit - Guess the Sentence Game"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ SECURITY ISSUE: $1${NC}"
    ((ISSUES_FOUND++))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo -e "${BLUE}1. Checking for hardcoded secrets...${NC}"

# Check for potential secrets in code
if grep -r -i "password\|secret\|token\|key" --include="*.ts" --include="*.js" --include="*.json" src/ worker/src/ 2>/dev/null | grep -v "// " | grep -v "* " | grep -v "apiKey" | grep -v "keyof" | grep -v "keyboard"; then
    report_issue "Potential hardcoded secrets found in source code"
else
    report_success "No hardcoded secrets detected"
fi

echo -e "${BLUE}2. Checking environment configuration...${NC}"

# Check for hardcoded URLs
if grep -r "friscojones.github.io\|therobinson.workers.dev" --include="*.ts" --include="*.js" src/ 2>/dev/null; then
    report_warning "Hardcoded production URLs found - consider using environment configuration"
fi

# Check if .env files are properly ignored
if [ -f ".env" ] || [ -f "worker/.env" ]; then
    if ! grep -q "\.env" .gitignore; then
        report_issue ".env files exist but not in .gitignore"
    else
        report_success "Environment files properly ignored"
    fi
fi

echo -e "${BLUE}3. Checking dependencies for vulnerabilities...${NC}"

# Check for npm audit issues
if command -v npm >/dev/null 2>&1; then
    if npm audit --audit-level=high --json > /tmp/audit.json 2>/dev/null; then
        HIGH_VULNS=$(cat /tmp/audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2 | head -1)
        CRITICAL_VULNS=$(cat /tmp/audit.json | grep -o '"critical":[0-9]*' | cut -d':' -f2 | head -1)
        
        if [ "${HIGH_VULNS:-0}" -gt 0 ] || [ "${CRITICAL_VULNS:-0}" -gt 0 ]; then
            report_issue "High/Critical vulnerabilities found in dependencies. Run 'npm audit fix'"
        else
            report_success "No high/critical vulnerabilities in dependencies"
        fi
    fi
    
    # Check worker dependencies
    if [ -d "worker" ]; then
        cd worker
        if npm audit --audit-level=high --json > /tmp/worker-audit.json 2>/dev/null; then
            HIGH_VULNS=$(cat /tmp/worker-audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2 | head -1)
            CRITICAL_VULNS=$(cat /tmp/worker-audit.json | grep -o '"critical":[0-9]*' | cut -d':' -f2 | head -1)
            
            if [ "${HIGH_VULNS:-0}" -gt 0 ] || [ "${CRITICAL_VULNS:-0}" -gt 0 ]; then
                report_issue "High/Critical vulnerabilities found in worker dependencies"
            else
                report_success "No high/critical vulnerabilities in worker dependencies"
            fi
        fi
        cd ..
    fi
fi

echo -e "${BLUE}4. Checking file permissions...${NC}"

# Check for overly permissive files
if find . -name "*.sh" -not -perm 755 2>/dev/null | grep -q .; then
    report_warning "Shell scripts with incorrect permissions found"
else
    report_success "Shell script permissions are correct"
fi

echo -e "${BLUE}5. Checking configuration files...${NC}"

# Check wrangler.toml for security issues
if [ -f "worker/wrangler.toml" ]; then
    if grep -q "localhost\|127.0.0.1" worker/wrangler.toml; then
        if ! grep -A5 "\[env.development\]" worker/wrangler.toml | grep -q "localhost\|127.0.0.1"; then
            report_issue "Localhost URLs found outside development environment in wrangler.toml"
        fi
    fi
    
    if grep -q "database_id_placeholder\|namespace_id_placeholder" worker/wrangler.toml; then
        report_issue "Placeholder IDs still present in wrangler.toml"
    fi
    
    report_success "Wrangler configuration checked"
fi

echo -e "${BLUE}6. Checking for sensitive data exposure...${NC}"

# Check for potential data leaks in logs or comments
if grep -r -i "todo.*security\|fixme.*security\|hack\|temp.*password" --include="*.ts" --include="*.js" src/ worker/src/ 2>/dev/null; then
    report_warning "Security-related TODO/FIXME comments found"
fi

# Check for console.log statements that might leak data
if grep -r "console\.log.*password\|console\.log.*token\|console\.log.*secret" --include="*.ts" --include="*.js" src/ worker/src/ 2>/dev/null; then
    report_issue "Console.log statements potentially logging sensitive data"
fi

echo -e "${BLUE}7. Checking HTTPS enforcement...${NC}"

# Check for HTTP URLs in production code
if grep -r "http://" --include="*.ts" --include="*.js" src/ 2>/dev/null | grep -v localhost | grep -v 127.0.0.1; then
    report_warning "HTTP URLs found in production code - ensure HTTPS is used"
fi

echo ""
echo "=========================================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 Security audit completed successfully!${NC}"
    echo -e "${GREEN}No critical security issues found.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Security audit found $ISSUES_FOUND issue(s)${NC}"
    echo -e "${RED}Please address these issues before deployment.${NC}"
    exit 1
fi