# AI Orchestration Hub

## Overview

AI Orchestration Hub is a full-stack multi-agent AI orchestration platform that coordinates multiple AI providers (OpenAI, Anthropic, xAI, Perplexity) with cost controls, secure integrations, and centralized memory. The platform enables teams to manage AI workflows across connected services like GitHub, Google Drive, Dropbox, Notion, and Zapier.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI animations
- **Build Tool**: Vite with custom plugins for meta images and Replit integration

The frontend follows a page-based structure with shared dashboard layout. Pages include Dashboard (Command Deck), Coding Studio, Agents, Storage, Integrations, and Settings.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage
- **Security**: Helmet for security headers, bcrypt for password hashing, CORS configuration
- **Rate Limiting**: express-rate-limit with separate limits for auth, API, and agent execution endpoints

### Authentication & Authorization
- Session-based authentication stored in PostgreSQL
- Role-Based Access Control (RBAC) with four roles: owner, admin, member, viewer
- Middleware functions for route protection: `requireAuth`, `requireRole`, `attachUser`

### Multi-Agent Orchestration
- Event-driven orchestrator queue system with configurable concurrency
- Provider adapter pattern for AI services with graceful fallbacks when API keys are missing
- Server-Sent Events (SSE) for real-time agent run streaming
- Handoff protocol for agent-to-agent communication with structured summaries, decisions, tasks, and artifacts

### Cost Governance
- Budget tracking at daily and monthly intervals per organization
- Middleware (`checkBudget`) blocks requests when budgets are exceeded
- Audit logging for budget violations

### Data Model
Key entities managed through Drizzle ORM:
- Users, Organizations, Projects (hierarchical structure)
- Integrations and Secret References (for third-party service connections)
- Agent Runs and Messages (for AI orchestration tracking)
- Memory Items (centralized memory with keyword search)
- Audit Logs and Budgets (for governance)

### Build System
- Development: Vite dev server with HMR for frontend, tsx for backend
- Production: Custom build script using esbuild for server bundling with allowlist for external dependencies, Vite for frontend

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in `shared/schema.ts`

### AI Providers (Optional)
- OpenAI (`OPENAI_API_KEY`)
- Anthropic/Claude (`ANTHROPIC_API_KEY`)
- xAI/Grok (`XAI_API_KEY`)
- Perplexity (`PERPLEXITY_API_KEY`)

### Third-Party Integrations (Optional)
- GitHub (`GITHUB_TOKEN`) - Repository operations with branch-first safety
- Google Drive (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`)
- Dropbox (`DROPBOX_ACCESS_TOKEN`)
- Notion (`NOTION_TOKEN`)
- Zapier - Workflow automation

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (required in production)
- `APP_ORIGIN` - Application URL for CORS (required in production)