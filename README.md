# AI Workflow Architect

> A full-stack AI multi-agent orchestration platform with **free-first AI models**, cost controls, secure integrations, and centralized memory.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)

## 📋 Table of Contents

- [Key Highlights](#-key-highlights)
- [Features](#features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Cost Optimization](#-cost-optimization)
- [Security](#-security)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 💡 Key Highlights

- 🎉 **Free-First AI Strategy**: Run on $0-5/month using Ollama and open-source models
- 🤖 **Multi-Agent Orchestration**: Coordinate multiple AI models with intelligent selection
- 🔐 **Integration Vault**: Connect GitHub, Google Drive, Dropbox, Notion, Zapier, and more
- 💰 **Smart Cost Controls**: Automatic fallback from expensive to free models
- 🧠 **Memory Layer**: Centralized and decentralized memory with keyword search
- 📊 **Cost Dashboard**: Real-time tracking and budget alerts
- 🔒 **Security**: RBAC, audit logging, rate limiting, and secure credential storage
- 🌿 **Branch-First Git**: Safe repository operations (no direct main pushes)

> **💸 Cost Optimization**: See [docs/COST_OPTIMIZATION_QUICK_REF.md](docs/COST_OPTIMIZATION_QUICK_REF.md) for how to minimize AI costs.

## Features

- **Free-First AI Models**: Ollama (self-hosted), Groq, Together AI, Perplexity - avoid expensive APIs
- **Multi-Agent Orchestration**: Coordinate OpenAI, Anthropic, xAI, and Perplexity models
- **Integration Vault**: Connect GitHub, Google Drive, Dropbox, Notion, Zapier, and more
- **Cost Governance**: Daily/monthly budgets with automatic enforcement
- **Memory Layer**: Centralized and decentralized memory with keyword search
- **Audit Logging**: Complete audit trail for all operations
- **RBAC**: Owner, Admin, Member, Viewer roles
- **Rate Limiting**: Protection against abuse
- **Branch-First Git**: Safe repository operations (no direct main pushes)

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing-fast development
- **TanStack Query** for data fetching and caching
- **Wouter** for lightweight routing
- **Tailwind CSS v4** for styling
- **shadcn/ui** component library (New York style)
- **Framer Motion** for animations
- **Monaco Editor** for code editing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **Passport.js** for authentication
- **express-session** with PostgreSQL store
- **Zod** for schema validation

### AI & Integrations
- **Multiple AI Providers**: OpenAI, Anthropic, xAI, Groq, Perplexity, HuggingFace, Ollama
- **Cloud Storage**: Google Drive, OneDrive, Dropbox
- **Services**: GitHub, Notion, Zapier, Stripe, Figma, World Anvil

### Security & Performance
- **Helmet** for security headers
- **bcrypt** for password hashing
- **CORS** protection
- **Rate limiting** (express-rate-limit)
- **WebSocket** support for real-time features

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** v14 or higher
- **npm** v10 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/issdandavis/AI-Workflow-Architect.01.01.02.git
   cd AI-Workflow-Architect.01.01.02
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb ai_orchestration
   
   # Push schema to database
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🔐 Environment Variables

See `.env.example` for a complete list of environment variables.

### Required Environment Variables (Replit Secrets)

### Core (Required)
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `SESSION_SECRET` - Secure random string for session encryption
- `APP_ORIGIN` - Your app URL (e.g., https://your-app.replit.app)

### AI Providers (Recommended for Free/Cheap Tier)
- `OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434) - **FREE**
- `GROQ_API_KEY` - Groq API key for cheap fallback ($0.59/1M tokens)
- `TOGETHER_API_KEY` - Together AI key for cheap fallback ($0.90/1M tokens)
- `HUGGINGFACE_TOKEN` - HuggingFace token for free inference

### AI Providers (Expensive - User Keys Only)
- `OPENAI_API_KEY` - OpenAI API key ($3/1M tokens) - Only use if user provides their own key
- `ANTHROPIC_API_KEY` - Anthropic (Claude) API key ($3-15/1M tokens) - User key only
- `XAI_API_KEY` - xAI (Grok) API key - User key only
- `PERPLEXITY_API_KEY` - Perplexity API key ($0.05/1M tokens) - Cheap option for search

### Integrations (Optional - add as needed)
- `GITHUB_TOKEN` - GitHub Personal Access Token for repo operations
- `GOOGLE_DRIVE_CLIENT_ID` - Google Drive OAuth client ID
- `GOOGLE_DRIVE_CLIENT_SECRET` - Google Drive OAuth secret
- `DROPBOX_ACCESS_TOKEN` - Dropbox access token
- `NOTION_TOKEN` - Notion integration token

> 💡 **Tip**: See `.env.example` for the complete list of environment variables with detailed comments and links to obtain API keys.

## 🚀 Deployment

### Deploying to Replit

1. **Fork or Import** this repository to Replit

2. **Add PostgreSQL database**
   - Go to Tools → Database
   - Create a PostgreSQL database
   - `DATABASE_URL` will be auto-configured

3. **Configure Replit Secrets**
   - Go to Tools → Secrets
   - Add required secrets (see `.env.example`)
   - Minimum required:
     - `SESSION_SECRET` (generate with `openssl rand -base64 32`)
     - `APP_ORIGIN` (auto-detected from REPLIT_DOMAINS)

4. **Deploy**
   - Click "Run" to start the application
   - Use Replit's "Publish" button for production deployment

### Deployment Checklist

- [ ] **Add Required Secrets**: SESSION_SECRET, APP_ORIGIN
- [ ] **Add AI Provider Keys**: At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY
- [ ] **Verify Database**: DATABASE_URL is set (Replit auto-configures this)
- [ ] **Test Auth Flow**: Create account, login, logout
- [ ] **Test Agent Run**: Execute at least one agent with stub or real provider
- [ ] **Configure Budgets**: Set daily/monthly budgets via API
- [ ] **Test Integrations**: Connect at least one integration
- [ ] **Review Audit Logs**: Verify logging works via GET /api/audit
- [ ] **Deploy**: Use Replit's "Publish" button to make the app live

## 📚 API Documentation

The platform provides a comprehensive REST API for all operations.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Create a new user account |
| `POST` | `/api/auth/login` | Login with credentials |
| `POST` | `/api/auth/logout` | Logout current user |
| `GET` | `/api/auth/me` | Get current user profile |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/:id` | Get project details |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |

### Agent Orchestration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents/run` | Start an agent run |
| `GET` | `/api/agents/run/:runId` | Get run status and results |
| `GET` | `/api/agents/stream/:runId` | Stream run logs (Server-Sent Events) |
| `POST` | `/api/agents/cancel/:runId` | Cancel a running agent |

### Memory & Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/memory/add` | Add a memory item |
| `GET` | `/api/memory/search` | Search memory (query params: `projectId`, `q`) |
| `DELETE` | `/api/memory/:id` | Delete memory item |

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/integrations` | List connected integrations |
| `POST` | `/api/integrations/connect` | Connect a new provider |
| `POST` | `/api/integrations/disconnect` | Disconnect provider |
| `GET` | `/api/integrations/:provider/status` | Check integration status |

### Git Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos` | List configured repositories |
| `POST` | `/api/repos/commit` | Create branch-first commit |
| `GET` | `/api/repos/:id/branches` | List repository branches |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/audit` | Get audit logs (admin only) |

> 📖 For detailed API documentation with request/response examples, see [docs/FULL_FEATURE_LIST.md](docs/FULL_FEATURE_LIST.md)

## 🔒 Security Features

- **🛡️ Helmet**: Security headers protection
- **🔐 CORS**: Locked to APP_ORIGIN for cross-origin safety
- **⏱️ Rate Limiting**: 
  - Auth endpoints: 5 attempts per 15 minutes
  - API endpoints: 100 requests per 15 minutes
  - Agent runs: 10 runs per minute
- **🍪 Session Management**: HTTP-only cookies with secure storage
- **👥 RBAC**: Role-based access control (Owner, Admin, Member, Viewer)
- **📝 Audit Logging**: Complete audit trail for all sensitive operations
- **🔑 Password Security**: bcrypt hashing with salt rounds
- **🚫 SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **✅ Input Validation**: Zod schema validation on all inputs

## 🏗️ Architecture

```
client/              # React frontend (Vite)
  src/
    pages/          # All UI pages
    components/     # Shared components
    
server/             # Express backend
  auth.ts           # Authentication & RBAC
  db.ts             # Database connection
  routes.ts         # All API routes
  storage.ts        # Database operations
  middleware/       # Rate limiting, cost control
  services/         # Orchestrator, provider adapters
  
shared/             # Shared types
  schema.ts         # Drizzle schema & types
```

## Provider Adapters

The system includes safe stub adapters for all providers. When API keys are not configured:
- Providers return a "not configured" message
- UI remains functional
- Logs indicate missing configuration
- No crashes or errors

To enable real provider calls, add the appropriate API keys to Replit Secrets.

## Cost Optimization Strategy 💰

This platform uses a **free-first approach** to minimize AI costs:

### Tier 1: Free (Primary) 🎉
- **Ollama** (self-hosted): $0/month
- Models: llama3.1:8b, codellama:13b, mistral:7b, phi-3
- Setup: `curl https://ollama.ai/install.sh | sh && ollama pull llama3.1:8b`

### Tier 2: Cheap Fallback 💚
- **Groq**: $0.59/1M tokens (5x cheaper than OpenAI)
- **Together AI**: $0.90/1M tokens (3x cheaper than OpenAI)
- **Perplexity**: $0.05/1M tokens (60x cheaper than OpenAI)

### Tier 3: Expensive (User Keys Only) 💸
- **OpenAI**: $3-10/1M tokens - Only use with user's own API key
- **Claude**: $3-15/1M tokens - Only use with user's own API key

**Target**: <$5/month per user by using free models for 90%+ of requests.

📖 **See**: [Cost Optimization Quick Reference](docs/COST_OPTIMIZATION_QUICK_REF.md) for details.

## Cost Controls

1. **Set Budgets**: Create daily/monthly budgets via API
2. **Automatic Enforcement**: Agent runs blocked when budget exceeded
3. **Smart Model Selection**: Automatically choose cheapest model for task
4. **Cost Tracking**: Each run estimates and tracks costs
5. **Audit Trail**: All cost events logged

Example budget creation:
```bash
curl -X POST /api/budgets \
  -H "Content-Type: application/json" \
  -d '{"orgId":"<org-id>","period":"daily","limitUsd":"10.00"}'
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Setting up your development environment
- Code style guidelines
- Testing requirements
- Pull request process
- Code of conduct

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### "Database connection failed"
**Solution**: 
- Verify `DATABASE_URL` is set in Secrets
- Run `npm run db:push` to sync schema
- Check PostgreSQL service is running

### "Session secret not set"
**Solution**: 
- Add `SESSION_SECRET` to Replit Secrets
- Generate one with: `openssl rand -base64 32`

### "Provider not configured"
**Solution**: 
- Add the appropriate API key to Replit Secrets
- Example: `OPENAI_API_KEY` for OpenAI
- Check `.env.example` for required format

### "Budget exceeded"
**Solution**: 
- Check current budget: `GET /api/budgets`
- Reset or increase budget limits
- Review cost tracking in audit logs

### Build Errors
**Solution**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist && npm run build`
- Check Node.js version: `node --version` (should be v20+)

## 📚 Documentation

### Getting Started
- 📘 [Contributing Guide](CONTRIBUTING.md) - How to contribute to this project
- 📗 [API Documentation](docs/FULL_FEATURE_LIST.md) - Complete API reference

### Cost & Optimization
- 📙 [Cost Optimization Quick Reference](docs/COST_OPTIMIZATION_QUICK_REF.md) - Fast guide to minimizing AI costs
- 📕 [Free-First AI Strategy](docs/FREE_FIRST_AI_STRATEGY_ISSUE.md) - Complete implementation plan
- 📔 [Free AI Implementation Guide](docs/FREE_AI_IMPLEMENTATION_GUIDE.md) - Developer guide with code templates

### Project Information
- 📓 [Project Documentation](docs/PROJECT_DOCUMENTATION.md) - Detailed project information
- 📖 [Full Feature List](docs/FULL_FEATURE_LIST.md) - Complete feature documentation

## 💬 Support

Need help? Here's how to get support:

1. **📖 Check Documentation**: Review the [docs/](docs/) folder for guides
2. **🔍 Search Issues**: Look for similar issues in [GitHub Issues](../../issues)
3. **🐛 Report Bugs**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
4. **💡 Request Features**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
5. **📝 Review Logs**: Check Replit logs or audit logs via `/api/audit`

### Common Resources
- Replit logs for error messages
- Database connection status
- Environment variables in Secrets
- Audit logs via API for operation history

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [issdandavis](https://github.com/issdandavis)**

⭐ Star this repo if you find it helpful!

[Report Bug](../../issues) · [Request Feature](../../issues) · [Documentation](docs/)

</div>
