# GitHub Actions CI/CD Pipeline

## 🚀 Overview

This repository includes automated continuous integration and delivery (CI/CD) using GitHub Actions. The pipeline runs automatically when code is committed to the main branch and provides comprehensive testing and security scanning.

## 🔄 Workflow Configuration

### File Location
`.github/workflows/ci.yml`

### Triggers
- **Push to main branch**: Full pipeline execution
- **Pull requests to main**: Full pipeline + dependency review
- **Manual trigger**: Available from GitHub Actions tab

## 🧪 Pipeline Steps

### 1. Environment Setup
- ✅ Ubuntu latest runner
- ✅ Node.js 20.x setup
- ✅ npm cache optimization
- ✅ Dependency installation with `npm ci`

### 2. Test Execution
- **🔬 Unit Tests**: Configuration loading and validation
  ```bash
  npm test -- --testPathPattern="config.test.js" --ci --verbose=false
  ```
  
- **🔗 Integration Tests**: API endpoints and request handling
  ```bash
  npm test -- --testPathPattern="api.test.js" --ci --verbose=false
  ```

### 3. Security Scanning
- **🛡️ npm audit**: Dependency vulnerability scanning
  ```bash
  npm audit --audit-level=moderate
  ```
  - Scans for moderate, high, and critical vulnerabilities
  - Fails the build if vulnerabilities are found
  - Provides detailed vulnerability reports

### 4. Coverage & Artifacts
- **📊 Coverage Generation**: Test coverage reports
- **📤 Artifact Upload**: Coverage reports saved for 7 days (using `actions/upload-artifact@v4`)
- **📋 Summary**: Job summary with test results

### 5. Pull Request Features
- **🔍 Dependency Review**: Automatic security review of new dependencies
- **💬 PR Comments**: Security findings commented directly in pull requests

## 📊 Results & Monitoring

### GitHub Actions Tab
1. Navigate to your repository on GitHub
2. Click the **Actions** tab
3. View workflow runs, results, and logs

### Status Badge
The README includes a status badge showing current build status:
```markdown
[![CI - Tests & Security](https://github.com/mheadd/llm-persistent-instructions/actions/workflows/ci.yml/badge.svg)](https://github.com/mheadd/llm-persistent-instructions/actions/workflows/ci.yml)
```

### Job Summary
Each workflow run includes a summary table:
| Test Type | Status |
|-----------|--------|
| Unit Tests | ✅ Completed |
| Integration Tests | ✅ Completed |
| Security Scan | ✅ Completed |

## 🔧 Local vs CI Testing

### Local Development (Fast Feedback)
```bash
# Quick local testing during development
./test.sh unit           # Unit tests only (~5 seconds)
./test.sh integration    # Integration tests (~30 seconds)
./test.sh unit integration  # Both (~35 seconds)
```

### CI Pipeline (Comprehensive)
```bash
# Automatically triggered on push to main
git add .
git commit -m "Your changes"
git push origin main     # Triggers full CI pipeline (~2-3 minutes)
```

## 🛡️ Security Features

### Dependency Scanning
- **npm audit**: Scans all dependencies for known vulnerabilities
- **Audit levels**: Moderate, high, and critical vulnerabilities
- **Automatic updates**: Recommendations for fixing vulnerabilities

### Pull Request Security
- **Dependency Review**: Automatic review of new dependencies in PRs
- **Security comments**: Findings posted directly in pull request discussions
- **Fail on moderate**: Pipeline fails if moderate+ vulnerabilities found

### Security Reports
- **Artifacts**: Detailed vulnerability reports saved as build artifacts
- **GitHub Security**: Integration with GitHub Security tab (if configured)
- **Notifications**: Email notifications for failed security scans

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
**Problem**: Tests fail in CI but pass locally
**Solution**: 
- Check Node.js version consistency (CI uses 20.x)
- Ensure `package-lock.json` is committed
- Run `npm ci` locally to replicate CI environment

#### 2. Security Scan Failures
**Problem**: npm audit fails with vulnerabilities
**Solution**:
```bash
# Run audit locally
npm audit

# Attempt automatic fixes
npm audit fix

# For unfixable issues, evaluate and potentially ignore
npm audit --audit-level=high  # Skip moderate vulnerabilities temporarily
```

#### 3. Dependency Review Failures
**Problem**: New dependencies flagged in PR
**Solution**:
- Review the flagged dependencies
- Ensure they're from trusted sources
- Update to latest secure versions
- Document any accepted risks

#### 4. GitHub Actions Deprecation Warnings
**Problem**: Warning about deprecated actions (e.g., `actions/upload-artifact: v3`)
**Solution**:
- Update to latest action versions in workflow file
- Current workflow uses `actions/upload-artifact@v4` (latest)
- All GitHub Actions are kept up-to-date to avoid deprecation issues

### Debugging Steps
1. **Check workflow logs**: View detailed logs in GitHub Actions
2. **Run locally**: Use `./test.sh` to replicate CI tests
3. **Check dependencies**: Run `npm audit` and `npm outdated`
4. **Update packages**: Keep dependencies current with `npm update`

## 📈 Performance

### Typical Run Times
- **Unit Tests**: ~10-15 seconds
- **Integration Tests**: ~30-45 seconds
- **Security Scan**: ~10-20 seconds
- **Total Pipeline**: ~2-3 minutes

### Optimization Features
- **npm cache**: Speeds up dependency installation
- **Parallel jobs**: Multiple jobs can run simultaneously
- **Artifact caching**: Test results cached for faster downloads

## 🔄 Maintenance

### Regular Tasks
1. **Update dependencies**: Monthly dependency updates
2. **Review security scans**: Address any new vulnerabilities
3. **Monitor performance**: Ensure pipeline runs efficiently
4. **Update actions**: Keep GitHub Actions versions current

### Recommended Schedule
- **Weekly**: Review failed builds and security alerts
- **Monthly**: Update dependencies and review audit results
- **Quarterly**: Review and update GitHub Actions versions

---

This CI/CD pipeline ensures code quality, security, and reliability for the Government AI Prototype while providing fast feedback for development work.
