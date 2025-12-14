# AI Orchestration Hub - Complete Feature List

## PLATFORM OVERVIEW
A multi-agent AI orchestration platform for personal code development with integrated storage, AI-powered coding assistants, and workflow automation.

---

## ACTIVE CONNECTIONS
| Integration | Status | Description |
|-------------|--------|-------------|
| GitHub | CONNECTED | Repository management, commits, branches, PRs |
| Google Drive | CONNECTED | File storage and document management |
| Zapier | AVAILABLE | Workflow automation via MCP |

## AVAILABLE INTEGRATIONS (Not Yet Connected)
- OneDrive - Microsoft cloud storage
- Notion - Document and planning
- Stripe - Payment processing
- Outlook - Email integration
- SharePoint - Enterprise documents

---

## FRONTEND PAGES (12 Total)

### Public Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | PublicHome | Landing page |
| `/shop` | Shop | Marketplace/store |
| `/login` | Login | User authentication |
| `/signup` | Signup | User registration |

### Backend/Dashboard Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Dashboard | Command deck with activity feed |
| `/storage` | Storage | File storage management |
| `/studio` or `/coding-studio` | CodingStudio | AI Coding Assistant with Monaco editor |
| `/settings` | Settings | User and org settings |
| `/integrations` | Integrations | Third-party service connections |
| `/agents` | Agents | AI agent management |
| `/usage` | Usage | Usage statistics and costs |
| `/roundtable` | Roundtable | Multi-AI discussion platform |
| `/agent-dev` | AgentDev | Agentic development system |

---

## API ENDPOINTS (57 Total)

### Authentication (5)
- `GET /api/health` - Health check
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Assistant (1)
- `POST /api/assistant/chat` - AI assistant chat

### Integrations (3)
- `GET /api/integrations` - List integrations
- `POST /api/integrations/connect` - Connect integration
- `POST /api/integrations/disconnect` - Disconnect integration

### Credential Vault (4)
- `GET /api/vault/credentials` - List user credentials
- `POST /api/vault/credentials` - Store credential
- `DELETE /api/vault/credentials/:id` - Delete credential
- `POST /api/vault/credentials/test` - Test API key

### Usage & Budgets (4)
- `GET /api/vault/usage` - Get usage records
- `GET /api/usage` - Get usage summary
- `GET /api/budgets` - Get budgets
- `POST /api/budgets` - Create/update budget

### Agent Orchestration (4)
- `POST /api/agents/run` - Start agent run
- `GET /api/agents/run/:runId` - Get agent run status
- `GET /api/agents/stream/:runId` - SSE stream for agent
- `GET /api/agents/run/:runId/traces` - Get decision traces

### Approvals (3)
- `GET /api/approvals/pending` - List pending approvals
- `POST /api/approvals/:traceId/approve` - Approve decision
- `POST /api/approvals/:traceId/reject` - Reject decision

### Memory (2)
- `POST /api/memory/add` - Add memory item
- `GET /api/memory/search` - Search memory

### Git/Repos (2)
- `GET /api/repos` - List repositories
- `POST /api/repos/commit` - Create commit

### Projects (2)
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project

### Zapier Integration (5)
- `POST /api/zapier/apikey/generate` - Generate API key
- `POST /api/zapier/trigger` - Trigger Zap
- `GET /api/zapier/status/:runId` - Get run status
- `POST /api/zapier-mcp/test` - Test MCP connection
- `POST /api/zapier-mcp/connect` - Connect MCP
- `GET /api/zapier-mcp/tools` - List MCP tools
- `POST /api/zapier-mcp/call` - Call MCP tool

### Circuits (2)
- `GET /api/circuits` - Get circuit breaker status
- `POST /api/circuits/reset` - Reset circuit

### GitHub (6)
- `GET /api/github/user` - Get GitHub user
- `GET /api/github/repos` - List repos
- `POST /api/github/repo` - Create repo
- `POST /api/github/file` - Create/update file
- `POST /api/github/branch` - Create branch
- `POST /api/github/pull-request` - Create PR

### AI Roundtable (7)
- `GET /api/roundtable/providers` - List AI providers
- `POST /api/roundtable/sessions` - Create session
- `GET /api/roundtable/sessions` - List sessions
- `GET /api/roundtable/sessions/:id` - Get session
- `POST /api/roundtable/sessions/:id/message` - Add message
- `POST /api/roundtable/sessions/:id/ai-turn` - Trigger AI turn
- `POST /api/roundtable/sessions/:id/round` - Run full round
- `PATCH /api/roundtable/sessions/:id` - Update session

### Code Assistant (1)
- `POST /api/code-assistant/generate` - Generate code with AI

### Agent Development (6)
- `GET /api/agent-dev/analyze` - Analyze file
- `POST /api/agent-dev/suggest` - Get AI suggestions
- `POST /api/agent-dev/apply` - Create proposal
- `GET /api/agent-dev/proposals` - List proposals
- `POST /api/agent-dev/proposals/:id/approve` - Approve & apply
- `POST /api/agent-dev/proposals/:id/reject` - Reject proposal

---

## DATABASE SCHEMA (18 Tables)

### Core Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | User accounts | id, email, passwordHash, role |
| `orgs` | Organizations | id, name, ownerUserId |
| `projects` | Projects | id, orgId, name |
| `integrations` | Third-party integrations | id, orgId, provider, status |
| `secrets_ref` | Secret references | id, orgId, provider, secretName |

### AI Orchestration
| Table | Description | Key Fields |
|-------|-------------|------------|
| `agent_runs` | Agent execution runs | id, projectId, status, model, provider |
| `messages` | Conversation messages | id, projectId, agentRunId, role, content |
| `memory_items` | Centralized memory | id, projectId, kind, source, content |
| `decision_traces` | Agent decision logs | id, agentRunId, stepType, decision, reasoning |

### Governance
| Table | Description | Key Fields |
|-------|-------------|------------|
| `audit_log` | Audit trail | id, orgId, userId, action, target |
| `budgets` | Cost budgets | id, orgId, period, limitUsd, spentUsd |
| `usage_records` | Token usage tracking | id, orgId, provider, model, tokens |
| `api_keys` | External API keys | id, orgId, key, name |
| `user_credentials` | Encrypted user API keys | id, userId, provider, encryptedKey |

### AI Roundtable
| Table | Description | Key Fields |
|-------|-------------|------------|
| `roundtable_sessions` | Multi-AI sessions | id, orgId, title, topic, status, activeProviders |
| `roundtable_messages` | Session messages | id, sessionId, senderType, provider, content |

### Agent Development
| Table | Description | Key Fields |
|-------|-------------|------------|
| `agent_analyses` | File analyses | id, orgId, userId, filePath, content |
| `agent_suggestions` | AI suggestions | id, analysisId, provider, suggestions |
| `agent_proposals` | Change proposals | id, filePath, originalContent, proposedContent, status |

---

## AI PROVIDERS SUPPORTED

| Provider | Model | API Key Variable |
|----------|-------|------------------|
| OpenAI | gpt-4o | OPENAI_API_KEY |
| Anthropic | claude-sonnet-4-20250514 | ANTHROPIC_API_KEY |
| xAI (Grok) | grok-2 | XAI_API_KEY |
| Perplexity | sonar | PERPLEXITY_API_KEY |
| Google Gemini | gemini-2.0-flash | GOOGLE_API_KEY |

---

## SERVICES & MIDDLEWARE

### Backend Services
| Service | File | Description |
|---------|------|-------------|
| Provider Adapters | `server/services/providerAdapters.ts` | Multi-AI provider interface |
| Orchestrator | `server/services/orchestrator.ts` | Agent run queue management |
| Roundtable Coordinator | `server/services/roundtableCoordinator.ts` | Multi-AI discussion orchestration |
| Retry Service | `server/services/retryService.ts` | Exponential backoff retries |
| Guide Agent | `server/services/guideAgent.ts` | Assistant chat processing |
| Vault | `server/services/vault.ts` | Credential encryption/storage |
| GitHub Client | `server/services/githubClient.ts` | GitHub API integration |
| Zapier MCP Client | `server/services/zapierMcpClient.ts` | Zapier MCP integration |

### Middleware
| Middleware | File | Description |
|------------|------|-------------|
| Rate Limiter | `server/middleware/rateLimiter.ts` | API rate limiting |
| Cost Governor | `server/middleware/costGovernor.ts` | Budget enforcement |

---

## FILE STRUCTURE

```
/
├── attached_assets/           # Generated images and uploads
├── client/
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── assistant/    # AI assistant panel
│   │   │   ├── dashboard/    # Dashboard components
│   │   │   ├── diff/         # Diff viewer
│   │   │   ├── editor/       # Code editor
│   │   │   └── ui/           # shadcn/ui components (50+)
│   │   ├── hooks/            # React hooks
│   │   ├── lib/              # Utilities
│   │   └── pages/            # Page components (12)
│   └── index.html
├── docs/                     # Documentation
├── script/                   # Build scripts
├── server/
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic services (8)
│   ├── auth.ts              # Authentication
│   ├── db.ts                # Database connection
│   ├── routes.ts            # API routes (~2000 lines)
│   ├── storage.ts           # Database operations
│   └── index.ts             # Server entry
├── shared/
│   └── schema.ts            # Drizzle ORM schema (18 tables)
└── package.json
```

---

## SECURITY FEATURES

1. **Authentication**: Session-based with bcrypt password hashing
2. **RBAC**: 4 roles (owner, admin, member, viewer)
3. **Rate Limiting**: Separate limits for auth, API, and agent endpoints
4. **Budget Controls**: Daily/monthly spending limits
5. **Audit Logging**: All actions logged with user/org context
6. **Path Validation**: Secure file access with traversal prevention
7. **Credential Encryption**: AES-256-GCM for stored API keys
8. **CORS & Helmet**: Security headers configured

---

## ENVIRONMENT VARIABLES

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

### AI Providers (Optional)
- `ANTHROPIC_API_KEY`
- `XAI_API_KEY`
- `GOOGLE_API_KEY`
- `PERPLEXITY_API_KEY`
- `OPENAI_API_KEY`

### Integrations (Optional)
- `GITHUB_TOKEN`
- `NOTION_TOKEN`
- `DROPBOX_ACCESS_TOKEN`

---

## TEST CREDENTIALS
- Email: `mcptest@example.com`
- Password: `testpassword123`

---

Generated: December 14, 2025
