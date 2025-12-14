# AI Orchestration Hub - Complete Project Documentation

> **Last Updated**: December 2024  
> **Version**: 1.0.0  
> **Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Structure](#project-structure)
3. [System Architecture](#system-architecture)
4. [Current Features](#current-features)
5. [Connected Integrations](#connected-integrations)
6. [Cost Breakdown](#cost-breakdown)
7. [Planned Features](#planned-features)
8. [AI Metadata](#ai-metadata)
9. [API Reference](#api-reference)
10. [Deployment & Operations](#deployment--operations)

---

## Executive Summary

AI Orchestration Hub is a full-stack multi-agent AI orchestration platform that enables teams to:

- **Coordinate Multiple AI Providers** - Seamlessly switch between OpenAI, Anthropic, xAI, Perplexity, and Google Gemini
- **Control Costs** - Set daily/monthly budgets with automatic enforcement
- **Secure Integrations** - AES-256-GCM encrypted credential storage
- **Centralized Memory** - Keyword-searchable memory across all projects
- **Audit Everything** - Complete decision trace logging with approval workflows

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **Multi-Provider Fallback** | Automatic retry with different providers when one fails |
| **Cost Governance** | Real-time budget tracking blocks requests when exceeded |
| **Decision Tracing** | Every AI decision logged with reasoning and alternatives |
| **Approval Workflows** | Human-in-the-loop for critical decisions |
| **Secure Vault** | API keys encrypted at rest with AES-256-GCM |

---

## Project Structure

```
ai-orchestration-hub/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── assistant/      # AI Assistant panel
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   ├── diff/           # Code diff viewer
│   │   │   ├── editor/         # Monaco code editor
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities
│   │   ├── pages/              # Route pages
│   │   │   ├── Dashboard.tsx   # Command Deck
│   │   │   ├── Agents.tsx      # Agent management
│   │   │   ├── CodingStudio.tsx # Code editor
│   │   │   ├── Integrations.tsx # Provider connections
│   │   │   ├── Settings.tsx    # User preferences
│   │   │   ├── Storage.tsx     # Memory items
│   │   │   └── Usage.tsx       # Cost tracking
│   │   ├── App.tsx             # Main app with routing
│   │   └── main.tsx            # Entry point
│   └── index.html
│
├── server/                     # Express Backend
│   ├── middleware/
│   │   ├── costGovernor.ts     # Budget enforcement
│   │   └── rateLimiter.ts      # Rate limiting
│   ├── services/
│   │   ├── githubClient.ts     # GitHub API integration
│   │   ├── guideAgent.ts       # AI assistant logic
│   │   ├── orchestrator.ts     # Multi-agent queue
│   │   ├── providerAdapters.ts # AI provider clients
│   │   ├── retryService.ts     # Retry with fallback
│   │   ├── vault.ts            # Encrypted credential storage
│   │   └── zapierMcpClient.ts  # Zapier MCP integration
│   ├── auth.ts                 # Authentication & RBAC
│   ├── db.ts                   # Database connection
│   ├── index.ts                # Server entry
│   ├── mcp.ts                  # MCP protocol handler
│   ├── routes.ts               # API routes
│   ├── static.ts               # Static file serving
│   ├── storage.ts              # Database operations
│   └── vite.ts                 # Vite dev server
│
├── shared/
│   └── schema.ts               # Drizzle ORM schema (shared types)
│
├── docs/                       # Documentation
│   └── PROJECT_DOCUMENTATION.md
│
└── Configuration Files
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── drizzle.config.ts
    └── replit.md
```

---

## System Architecture

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework with concurrent features |
| TypeScript | Type-safe development |
| Wouter | Lightweight client-side routing |
| TanStack Query | Server state management & caching |
| Tailwind CSS v4 | Utility-first styling |
| shadcn/ui | Component library (New York style) |
| Framer Motion | Animations |
| Vite | Build tool with HMR |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server framework |
| TypeScript | Type-safe backend |
| PostgreSQL | Primary database |
| Drizzle ORM | Type-safe database queries |
| express-session | Session management |
| connect-pg-simple | PostgreSQL session store |
| Helmet | Security headers |
| bcrypt | Password hashing |

### Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | Session-based with PostgreSQL storage |
| Authorization | RBAC with 4 roles (owner, admin, member, viewer) |
| API Keys | AES-256-GCM encryption at rest |
| Rate Limiting | Separate limits for auth/API/agent endpoints |
| CORS | Configurable origin restrictions |
| Security Headers | Helmet middleware |

---

## Current Features

### 1. Multi-Provider AI Orchestration

**Supported Providers:**
- OpenAI (GPT-4, GPT-4o, GPT-3.5 Turbo)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- xAI (Grok-2)
- Perplexity (Sonar, Sonar Pro)
- Google (Gemini 2.0 Flash)

**Capabilities:**
- Real-time streaming responses via SSE
- Automatic retry with fallback providers
- Usage tracking with cost estimates
- Model selection per request

### 2. Credential Vault

- **Encryption**: AES-256-GCM with per-key IVs
- **Key Testing**: Validates API keys before storage
- **Usage Tracking**: Records last used timestamp
- **Secure Display**: Masked key previews in UI

### 3. Cost Governance

- **Budget Types**: Daily and monthly limits
- **Enforcement**: Middleware blocks requests when exceeded
- **Tracking**: Real-time usage per organization
- **Alerts**: Audit log entries for violations

### 4. Decision Tracing

- **Step Types**: Provider selection, retry, fallback, model selection, tool calls
- **Metadata**: Reasoning, confidence scores, alternatives considered
- **Approval Workflow**: Pending/approved/rejected states

### 5. Organization Management

- **Hierarchy**: Users → Organizations → Projects
- **Roles**: Owner, Admin, Member, Viewer
- **Isolation**: Data segregated by organization

### 6. Memory System

- **Types**: Notes, documents, links
- **Sources**: Manual, Notion, Drive, etc.
- **Search**: Keyword-based queries
- **Embedding Ready**: Reference field for future vector storage

---

## Connected Integrations

### Currently Active

| Integration | Status | Capabilities |
|-------------|--------|--------------|
| GitHub | Connected | Repository CRUD, file operations, branches, PRs |
| PostgreSQL | Active | Primary database storage |
| Replit Connectors | Active | OAuth token management |

### Available AI Providers

| Provider | API Endpoint | Default Model |
|----------|--------------|---------------|
| OpenAI | api.openai.com | gpt-4o |
| Anthropic | api.anthropic.com | claude-sonnet-4-20250514 |
| xAI | api.x.ai | grok-2 |
| Perplexity | api.perplexity.ai | sonar |
| Google | generativelanguage.googleapis.com | gemini-2.0-flash |

### Planned Integrations

| Integration | Priority | Use Case |
|-------------|----------|----------|
| Notion | High | Knowledge base sync |
| Google Drive | High | Document storage |
| Stripe | Medium | Payment processing |
| Zapier | Medium | Workflow automation |
| Dropbox | Low | Additional file storage |
| Slack | Low | Team notifications |

---

## Cost Breakdown

### Monthly Infrastructure Costs

| Service | Cost Estimate | Notes |
|---------|---------------|-------|
| Replit Hosting | $7-25/month | Depending on usage tier |
| PostgreSQL (Neon) | Included | Via Replit integration |
| Domain (optional) | $0-12/year | Custom domain |
| **Subtotal** | **$7-25/month** | Infrastructure only |

### AI Provider Costs (Variable)

| Provider | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
|----------|---------------------------|----------------------------|
| OpenAI GPT-4o | $2.50 | $10.00 |
| OpenAI GPT-4 | $30.00 | $60.00 |
| Anthropic Claude 3 Opus | $15.00 | $75.00 |
| Anthropic Claude 3 Sonnet | $3.00 | $15.00 |
| xAI Grok-2 | ~$2.00 | ~$10.00 |
| Perplexity Sonar | $1.00 | $1.00 |
| Google Gemini Flash | Free tier available | $0.35/1M |

### Estimated Monthly Usage Scenarios

| Usage Level | Messages/Month | Est. Tokens | Est. Cost |
|-------------|----------------|-------------|-----------|
| Light | 100 | 50,000 | $0.50 |
| Moderate | 500 | 250,000 | $2.50 |
| Heavy | 2,000 | 1,000,000 | $10.00 |
| Enterprise | 10,000+ | 5,000,000+ | $50.00+ |

### Total Cost Projection (Moderate Use)

| Category | Monthly Cost |
|----------|--------------|
| Infrastructure | $15 |
| AI API Usage | $5 |
| **Total** | **$20/month** |

---

## Planned Features

### Q1 2025 Roadmap

- [ ] **Vector Embeddings** - Semantic search for memory items
- [ ] **Notion Sync** - Bi-directional document synchronization
- [ ] **Google Drive Integration** - File access for agents
- [ ] **Team Collaboration** - Multiple users per organization
- [ ] **Webhook Events** - External system notifications

### Q2 2025 Roadmap

- [ ] **Stripe Integration** - Subscription billing
- [ ] **Custom Agent Creation** - User-defined agent workflows
- [ ] **API Rate Analytics** - Detailed usage dashboards
- [ ] **Mobile Responsive** - Enhanced mobile experience
- [ ] **Slack/Discord Bots** - Chat interface integrations

### Future Considerations

- Agent marketplace
- Template library
- Multi-language support
- On-premise deployment option
- SOC 2 compliance

---

## AI Metadata

> This section contains structured information optimized for AI agents to understand this codebase.

### Codebase Context

```json
{
  "project_name": "AI Orchestration Hub",
  "primary_language": "TypeScript",
  "framework_frontend": "React 18",
  "framework_backend": "Express.js",
  "database": "PostgreSQL",
  "orm": "Drizzle",
  "styling": "Tailwind CSS v4",
  "component_library": "shadcn/ui",
  "state_management": "TanStack Query",
  "authentication": "session-based",
  "encryption": "AES-256-GCM"
}
```

### Key Files for AI

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database schema and types |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database operations |
| `server/services/orchestrator.ts` | Agent execution logic |
| `server/services/providerAdapters.ts` | AI provider clients |
| `server/services/vault.ts` | Credential encryption |
| `client/src/App.tsx` | Frontend routing |

### API Patterns

- **Authentication**: All routes except `/api/auth/*` require `requireAuth` middleware
- **Rate Limiting**: Auth (5/15min), API (100/15min), Agent (20/min)
- **Response Format**: JSON with `{ success, data }` or `{ error }`
- **Errors**: HTTP status codes with descriptive messages

### Database Relationships

```
users (1) ──< orgs (1) ──< projects (1) ──< agentRuns (1) ──< messages
                │                    │                └────< decisionTraces
                │                    └──< memoryItems
                ├──< integrations
                ├──< secretsRef
                ├──< budgets
                ├──< apiKeys
                └──< auditLog

users (1) ──< userCredentials
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| SESSION_SECRET | Production | Session encryption key |
| APP_ORIGIN | Production | CORS allowed origin |
| GOOGLE_API_KEY | Optional | For Gemini models |
| PERPLEXITY_API_KEY | Optional | For Perplexity models |

### Important Conventions

1. **API Keys**: Store via `/api/vault/credentials`, never in environment
2. **Budget Checks**: Use `checkBudget` middleware on expensive endpoints
3. **Audit Logging**: Log all sensitive operations via `storage.createAuditLog`
4. **Decision Traces**: Create trace entries for all agent decisions
5. **Error Handling**: Return structured errors with appropriate status codes

---

## API Reference

### Authentication

```
POST /api/auth/signup    - Create account
POST /api/auth/login     - Login
POST /api/auth/logout    - Logout
GET  /api/auth/me        - Get current user
```

### Vault

```
GET  /api/vault/credentials      - List stored credentials
POST /api/vault/credentials      - Store new credential
POST /api/vault/credentials/test - Test API key validity
DELETE /api/vault/credentials/:id - Remove credential
GET  /api/vault/usage            - Get usage statistics
```

### Agent Orchestration

```
POST /api/agents/run          - Start agent run
GET  /api/agents/run/:runId   - Get run status
GET  /api/agents/stream/:runId - SSE stream for run
GET  /api/agents/run/:runId/traces - Get decision traces
```

### Projects

```
GET  /api/projects    - List projects
POST /api/projects    - Create project
```

### Memory

```
POST /api/memory/add    - Add memory item
GET  /api/memory/search - Search memory
```

### Approvals

```
GET  /api/approvals/pending         - List pending approvals
POST /api/approvals/:traceId/approve - Approve decision
POST /api/approvals/:traceId/reject  - Reject decision
```

---

## Deployment & Operations

### Development Setup

```bash
npm install
npm run db:push    # Sync database schema
npm run dev        # Start dev server on port 5000
```

### Production Build

```bash
npm run build      # Builds client and server
npm start          # Runs production server
```

### Database Commands

```bash
npm run db:push    # Push schema changes
npm run db:studio  # Open Drizzle Studio
```

### Health Check

```
GET /api/health
Response: { status: "ok", time: "ISO timestamp", version: "1.0.0" }
```

### Monitoring Recommendations

1. Set up alerts for budget violations via audit log
2. Monitor `/api/health` endpoint
3. Track API response times
4. Review decision traces for anomalies

---

## License

MIT License - See LICENSE file for details.

---

*This documentation was auto-generated and should be updated as the project evolves.*
