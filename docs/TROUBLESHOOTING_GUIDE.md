# 🔧 Troubleshooting Guide

This guide helps you **quickly diagnose and fix** common issues. Each entry follows the pattern: **Symptom → Root Cause → Fix**.

## 🚨 How to Use This Guide

1. **Find your symptom** in the table of contents
2. **Read the explanation** - understand what went wrong
3. **Apply the fix** - step-by-step instructions
4. **Still stuck?** Use the built-in assistant or escalation path

💡 **Pro Tip**: The built-in assistant (💬 button) knows this entire guide and can help you diagnose issues in real-time!

---

## 📑 Table of Contents

### Setup & Authentication
- [Cannot create account](#cannot-create-account)
- [Login fails with correct credentials](#login-fails)
- [Session expires too quickly](#session-expires)

### AI Provider Issues
- [Provider not configured](#provider-not-configured)
- [Invalid API key error](#invalid-api-key)
- [API rate limit exceeded](#rate-limit-exceeded)
- [Provider timeout](#provider-timeout)

### Agent Execution Problems
- [Agent run fails immediately](#agent-fails-immediately)
- [Agent stuck in "queued" status](#agent-stuck-queued)
- [Budget exceeded error](#budget-exceeded)
- [Out of memory errors](#out-of-memory)

### Integration Failures
- [GitHub connection fails](#github-fails)
- [Google Drive unauthorized](#google-drive-fails)
- [Webhook not receiving events](#webhook-issues)

### Performance Issues
- [Slow response times](#slow-response)
- [UI not loading](#ui-not-loading)
- [Database connection errors](#database-errors)

### Cost & Billing
- [Unexpected charges](#unexpected-charges)
- [Budget not enforcing](#budget-not-enforcing)
- [Cost tracking incorrect](#cost-tracking-wrong)

---

## Setup & Authentication

### Cannot create account

**Symptom**: Signup form shows error or doesn't submit

**Common Causes**:
1. Database not initialized
2. Email already registered
3. Weak password
4. Missing environment variables

**Fix**:

```bash
# 1. Check database connection
npm run db:push

# 2. Verify environment variables
echo $DATABASE_URL
echo $SESSION_SECRET

# 3. Try different email
# 4. Use stronger password (8+ chars, mixed case, numbers)
```

**If this doesn't work**: Ask the assistant: "Why can't I create an account?"

---

### Login fails with correct credentials {#login-fails}

**Symptom**: "Invalid credentials" even with correct email/password

**Root Cause**: Session or auth service misconfiguration

**Fix**:

```bash
# 1. Clear browser cookies/cache
# 2. Restart server
npm run dev

# 3. Check session secret is set
echo $SESSION_SECRET

# 4. Verify user exists in database
# (Use database admin tool or SQL client)
```

**Alternative**: Reset password via `/forgot-password` (if configured)

---

### Session expires too quickly {#session-expires}

**Symptom**: Logged out after a few minutes

**Root Cause**: Short session timeout or missing session store

**Fix**: Check `server/auth.ts` session configuration:

```typescript
// Should be at least 1 hour
maxAge: 1000 * 60 * 60 * 24 // 24 hours
```

---

## AI Provider Issues

### Provider not configured {#provider-not-configured}

**Symptom**: Error message: "Provider [name] is not configured"

**Root Cause**: No API key added for this provider

**Fix** (This is NORMAL for first-time setup!):

1. **Understand**: This isn't an error - it's a reminder to add your API key
2. **Go to**: Settings → Integrations
3. **Find your provider**: OpenAI, Anthropic, Groq, etc.
4. **Click "Connect"**
5. **Enter API key** from provider's website
6. **Test** to verify it works
7. **Save**

**Cost-Conscious Alternative**: 
- Use **Groq** (cheap: $0.59/1M tokens)
- Use **Ollama** (free: self-hosted)
- Stay in **stub mode** to explore features

**Assistant Help**: "How do I add an OpenAI API key?"

---

### Invalid API key error {#invalid-api-key}

**Symptom**: "Authentication failed" or "Invalid API key"

**Root Causes**:
1. Typo in API key (extra space, missing character)
2. Key doesn't have correct permissions
3. Key was revoked or expired
4. Wrong key for wrong provider

**Fix**:

```bash
# 1. Copy key again carefully (no extra spaces)
# 2. Regenerate key from provider dashboard
# 3. For OpenAI: needs "Write" access
# 4. For GitHub: needs "repo" scope
# 5. Test with curl first:

curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

**Troubleshooting Table**:
| Provider | Key Format | Common Issue |
|----------|-----------|--------------|
| OpenAI | sk-... | Must start with "sk-" |
| Anthropic | sk-ant-... | Must start with "sk-ant-" |
| Groq | gsk_... | Must start with "gsk_" |
| GitHub | ghp_... | Must start with "ghp_" |

---

### API rate limit exceeded {#rate-limit-exceeded}

**Symptom**: "Rate limit exceeded" or "429 Too Many Requests"

**Root Cause**: Too many API calls in short time window

**Immediate Fix**:
1. **Wait** 1-5 minutes for rate limit to reset
2. **Check** if you're on free tier (lower limits)

**Long-Term Fix**:
```bash
# 1. Set up request throttling
# 2. Use cheaper providers for high-volume tasks
# 3. Implement caching in memory system
# 4. Batch similar requests
```

**Prevention**: Set up budget limits to control request volume

---

### Provider timeout {#provider-timeout}

**Symptom**: Agent hangs, then fails with "Request timeout"

**Root Causes**:
1. Provider service is down
2. Complex prompt takes too long
3. Network connectivity issue
4. Model is overloaded

**Fix**:

```bash
# 1. Check provider status page
# OpenAI: status.openai.com
# Anthropic: status.anthropic.com

# 2. Try simpler prompt
# 3. Switch to different provider
# 4. Retry in a few minutes
```

**Assistant Help**: "Why is my agent timing out?"

---

## Agent Execution Problems

### Agent run fails immediately {#agent-fails-immediately}

**Symptom**: Agent status goes to "failed" within seconds

**Root Causes & Fixes**:

#### 1. Budget Exceeded
```bash
Symptom: "Budget limit reached"
Fix: Settings → Budgets → Increase limit or wait for reset
```

#### 2. Invalid Goal
```bash
Symptom: "Could not parse goal"
Fix: Make goal more specific, e.g., 
  ❌ "do stuff"
  ✅ "List my 5 most recent GitHub commits"
```

#### 3. Missing Permissions
```bash
Symptom: "Unauthorized" or "Permission denied"
Fix: Check integration has correct OAuth scopes
```

#### 4. Provider Error
```bash
Symptom: "Provider call failed"
Fix: Check API key, provider status, billing
```

**Debugging Steps**:
1. **Check logs**: Click on failed run to see error details
2. **Ask assistant**: "Why did my agent fail?"
3. **Test provider**: Settings → Integrations → Test Connection
4. **Simplify**: Try simpler goal first

---

### Agent stuck in "queued" status {#agent-stuck-queued}

**Symptom**: Agent shows "queued" for more than 1 minute

**Root Cause**: Agent orchestrator not running or overwhelmed

**Fix**:

```bash
# 1. Refresh page (status might be stale)
# 2. Check server logs for errors
# 3. Restart server
npm run dev

# 4. Cancel and retry
# Click "Cancel" on stuck agent, then resubmit
```

**Prevention**: Ensure server has enough resources (memory, CPU)

---

### Budget exceeded error {#budget-exceeded}

**Symptom**: "Cannot start agent: budget limit reached for period"

**Root Cause**: Your safety net is working! You've hit your spending limit.

**This is GOOD** - it means no surprise bills!

**Fix Options**:

**Option 1: Wait for Reset**
```
Daily budget resets at midnight UTC
Monthly budget resets on the 1st
```

**Option 2: Increase Limit**
```bash
1. Settings → Budgets
2. Find your budget
3. Click "Edit"
4. Increase limit
5. Save
```

**Option 3: Use Free Assistant**
```
The built-in assistant runs on a FREE quota
It can help you solve problems without costing anything
```

**Check Current Usage**:
- Dashboard shows: "Daily Spend: $2.45 / $5.00"
- Usage page shows detailed breakdown

---

### Out of memory errors {#out-of-memory}

**Symptom**: Agent fails with "Out of memory" or "Heap limit exceeded"

**Root Causes**:
1. Processing very large files
2. Memory leak in agent code
3. Server undersized for workload

**Fix**:

```bash
# 1. Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# 2. Process in smaller chunks
# 3. Use streaming for large data
# 4. Restart server periodically
```

**Prevention**: Monitor server memory usage, upgrade if needed

---

## Integration Failures

### GitHub connection fails {#github-fails}

**Symptom**: "GitHub authentication failed" or "Invalid token"

**Root Causes**:
1. Token expired
2. Wrong scopes/permissions
3. Token revoked
4. Organization access not granted

**Fix**:

```bash
# 1. Generate new Personal Access Token
# Go to: github.com/settings/tokens
# Click: "Generate new token (classic)"
# Select scopes: repo, read:org, write:org

# 2. Add to app
# Settings → Integrations → GitHub → Connect
# Paste token → Test → Save

# 3. For organization repos
# Token must have access to org
# Org admin may need to approve
```

**Test It**:
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user
```

---

### Google Drive unauthorized {#google-drive-fails}

**Symptom**: "Google Drive: 401 Unauthorized"

**Root Cause**: OAuth token expired or revoked

**Fix**:

```bash
# 1. Re-authenticate
Settings → Integrations → Google Drive
Click "Disconnect" then "Connect"
Complete OAuth flow again

# 2. Check OAuth consent screen
# Ensure app isn't in testing mode if using production users

# 3. Verify scopes
# Must include: drive.file or drive.readonly
```

---

### Webhook not receiving events {#webhook-issues}

**Symptom**: Workflows don't trigger on external events

**Root Cause**: Webhook not configured or blocked

**Fix**:

```bash
# 1. Verify webhook URL is publicly accessible
# Must be HTTPS in production
echo $APP_ORIGIN/api/webhooks/github

# 2. Check webhook settings in external service
# GitHub: Repo → Settings → Webhooks
# Ensure "Active" is checked

# 3. Test webhook delivery
# Most services have "redeliver" button to test

# 4. Check server logs
# Look for POST requests to /api/webhooks/*
```

---

## Performance Issues

### Slow response times {#slow-response}

**Symptom**: Pages take >3 seconds to load, API calls are slow

**Diagnosis**:

```bash
# 1. Check database connection
# Slow queries are most common cause

# 2. Monitor server logs
# Look for slow endpoint warnings

# 3. Check provider latency
# Some AI providers are slower than others
```

**Fix**:

```bash
# Short-term
1. Restart server: npm run dev
2. Clear browser cache
3. Close unused tabs/sessions

# Long-term
1. Optimize database queries (add indexes)
2. Implement caching
3. Use faster AI providers (Groq is fastest)
4. Enable CDN for static assets
```

**Provider Speed Comparison**:
- Groq: ~1-2 seconds (fastest)
- OpenAI: ~3-5 seconds
- Claude: ~4-7 seconds
- Ollama: ~5-10 seconds (local, but slower)

---

### UI not loading {#ui-not-loading}

**Symptom**: Blank screen or infinite loading spinner

**Quick Fixes**:

```bash
# 1. Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# 2. Check browser console
F12 → Console tab → look for errors

# 3. Verify server is running
Should see: "Server running on port 5000"

# 4. Check network tab
F12 → Network tab → look for failed requests (red)
```

**Common Errors & Fixes**:
```
"Failed to fetch" → Server not running, start with: npm run dev
"404 Not Found" → Wrong URL, check APP_ORIGIN
"CORS error" → Check CORS configuration in server/routes.ts
"401 Unauthorized" → Session expired, log in again
```

---

### Database connection errors {#database-errors}

**Symptom**: "Database connection failed" or "ECONNREFUSED"

**Root Causes**:
1. DATABASE_URL not set
2. PostgreSQL not running
3. Wrong credentials
4. Network firewall

**Fix**:

```bash
# 1. Verify DATABASE_URL is set
echo $DATABASE_URL
# Should look like: postgresql://user:pass@host:5432/dbname

# 2. Test database connection
npm run db:push
# Should sync schema without errors

# 3. For local PostgreSQL
# Check if running:
sudo systemctl status postgresql
# Start if needed:
sudo systemctl start postgresql

# 4. For Replit
# Database is auto-configured, check Secrets tab
```

**Replit Users**: Database should "just work" - if not, contact Replit support

---

## Cost & Billing

### Unexpected charges {#unexpected-charges}

**Symptom**: Bill higher than expected

**Investigation Steps**:

```bash
# 1. Check usage dashboard
Settings → Usage → Cost Breakdown

# 2. Review audit logs
Settings → Audit Logs → Filter by "agent_run"

# 3. Look for runaway agents
Sort by cost, find expensive runs

# 4. Check token usage
High token count = high cost
Likely cause: Very long prompts or responses
```

**Prevention**:
```bash
✅ Set strict daily/monthly budgets
✅ Use cheap providers (Groq, not Claude/GPT-4)
✅ Monitor cost in real-time during runs
✅ Archive old projects to clean up memory
```

**Cost Breakdown by Provider** (per 1M tokens):
- Ollama: $0 (free, self-hosted)
- Perplexity: $0.05
- Groq: $0.59
- Together AI: $0.90
- OpenAI GPT-3.5: $3.00
- OpenAI GPT-4: $10.00
- Claude Opus: $15.00

---

### Budget not enforcing {#budget-not-enforcing}

**Symptom**: Agent runs even though budget should be exceeded

**Root Causes**:
1. Budget not created
2. Budget for wrong organization
3. Cost tracking not working
4. Budget check bypassed by admin

**Fix**:

```bash
# 1. Verify budget exists
Settings → Budgets → Should see active budget

# 2. Check budget details
Correct org? Correct period? Correct limit?

# 3. Test enforcement
# Try to run agent
# Should get "Budget exceeded" error

# 4. Check server logs
# Look for "budget check" messages
```

**Create Budget**:
```json
POST /api/budgets
{
  "orgId": "your-org-id",
  "period": "daily",
  "limitUsd": "5.00"
}
```

---

### Cost tracking incorrect {#cost-tracking-wrong}

**Symptom**: Dashboard shows wrong costs

**Root Causes**:
1. Provider pricing changed
2. Token counting inaccurate
3. Failed runs still counted
4. Cache/stale data

**Fix**:

```bash
# 1. Refresh page (Ctrl+R)
# 2. Check audit logs for actual costs
# 3. Compare with provider billing dashboard
# 4. Report discrepancy if persistent
```

**Cost Estimate vs Actual**:
- Estimates are based on input tokens only
- Actual cost includes input + output tokens
- Expect 10-30% variance

---

## 🆘 When Nothing Works

### Use the Built-In Assistant

**The assistant is your first-line debugger**:

1. Click **💬 Assistant** button (bottom right)
2. Describe your problem: "My GitHub integration fails with 401 error"
3. Assistant will:
   - Explain the root cause
   - Show you relevant docs
   - Offer to create a fix branch
   - Escalate if needed

**Cost**: FREE (runs on maintenance quota)

---

### Escalation Path

If the assistant can't help, here's the escalation:

```
Level 1: Built-in Assistant (FREE)
  ↓ (can't solve)
Level 2: Advanced AI Model (LOW COST: <$0.01)
  ↓ (can't solve)
Level 3: Auto-Create GitHub Issue (FREE)
  → Structured issue with logs, context, attempted fixes
  → Community or maintainers help
```

**You're never stuck alone!**

---

### Emergency Fixes

**Server won't start**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run db:push
npm run dev
```

**Complete reset** (DANGER: loses data):
```bash
# Backup first!
npm run db:push  # Re-init database schema
# Clear all environment variables
# Start fresh
```

**Rollback to last working version**:
```bash
git log --oneline  # Find last good commit
git reset --hard COMMIT_HASH
npm install
npm run dev
```

---

## 📚 Additional Resources

- **Quick Start**: [docs/ONBOARDING_GUIDE.md](ONBOARDING_GUIDE.md)
- **Cost Transparency**: [docs/COST_TRANSPARENCY_GUIDE.md](COST_TRANSPARENCY_GUIDE.md)
- **Cost Optimization**: [docs/COST_OPTIMIZATION_QUICK_REF.md](COST_OPTIMIZATION_QUICK_REF.md)
- **Full Feature List**: [docs/FULL_FEATURE_LIST.md](FULL_FEATURE_LIST.md)
- **API Documentation**: [docs/PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)

---

## 💡 Pro Tips

1. **Enable verbose logging** during troubleshooting:
   ```bash
   DEBUG=* npm run dev
   ```

2. **Use test mode** for debugging:
   ```bash
   NODE_ENV=test npm run dev
   ```

3. **Check all services at once**:
   ```bash
   curl http://localhost:5000/api/health
   ```

4. **Monitor in real-time**:
   ```bash
   tail -f logs/app.log
   ```

---

**Still stuck? Remember: The 💬 Assistant is always there, always free, and gets smarter every day!**
