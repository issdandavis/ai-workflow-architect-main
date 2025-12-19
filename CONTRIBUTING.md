# Contributing to AI Workflow Architect

Thank you for your interest in contributing to the AI Workflow Architect! This document provides guidelines and instructions for setting up your development environment and contributing to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **npm** (v10 or higher)
- **PostgreSQL** (v14 or higher)
- **Git**

Optional but recommended:
- **Docker** (for running PostgreSQL in a container)
- **Ollama** (for free local AI models)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI-Workflow-Architect.01.01.02.git
   cd AI-Workflow-Architect.01.01.02
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/issdandavis/AI-Workflow-Architect.01.01.02.git
   ```

## 🛠️ Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following **required** variables:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_orchestration

# Session (required for production)
SESSION_SECRET=your-super-secret-key-min-32-characters-long

# App Origin (required for CORS)
APP_ORIGIN=http://localhost:5000
```

Optional: Add AI provider API keys for testing:

```env
# Free/Cheap providers (recommended)
GROQ_API_KEY=your-groq-key
OLLAMA_BASE_URL=http://localhost:11434

# Premium providers (optional, use your own keys)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Set Up the Database

Create a PostgreSQL database:

```bash
# Using psql
createdb ai_orchestration

# Or using Docker
docker run --name ai-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_orchestration -p 5432:5432 -d postgres:16
```

Push the database schema:

```bash
npm run db:push
```

### 4. Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api

## 📁 Project Structure

```
AI-Workflow-Architect.01.01.02/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   └── public/             # Static assets
│
├── server/                  # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions
│   ├── auth.ts             # Authentication logic
│   ├── storage.ts          # Database operations
│   ├── middleware/         # Express middleware
│   └── services/           # Business logic
│       ├── orchestrator.ts         # AI orchestration
│       ├── providerAdapters.ts     # AI provider integrations
│       ├── githubClient.ts         # GitHub integration
│       ├── googleDriveClient.ts    # Google Drive integration
│       └── ...
│
├── shared/                  # Shared code between frontend/backend
│   └── schema.ts           # Database schema (Drizzle)
│
├── docs/                    # Documentation
├── tests/                   # Test files
└── scripts/                 # Build and utility scripts
```

## 🔄 Development Workflow

### Creating a New Feature

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code style guidelines

3. **Test your changes:**
   ```bash
   npm run check      # TypeScript type checking
   npm run test       # Run tests
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add Groq AI provider integration
fix: resolve session timeout issue
docs: update CONTRIBUTING.md with testing section
```

## 🎨 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names

**Example:**
```typescript
// Good
interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  // Implementation
}

// Avoid
const data: any = await getData();
```

### React Components

- Use functional components with hooks
- Prefer named exports over default exports
- Keep components small and focused
- Use TypeScript for props

**Example:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}
```

### API Routes

- Follow REST conventions
- Use proper HTTP status codes
- Validate input with Zod schemas
- Handle errors gracefully

**Example:**
```typescript
app.post("/api/projects", async (req, res) => {
  try {
    const validated = createProjectSchema.parse(req.body);
    const project = await createProject(validated);
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid input" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
```

### Styling

- Use Tailwind CSS utility classes
- Follow shadcn/ui component patterns
- Keep custom CSS minimal
- Use CSS variables for theming

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

### Writing Tests

Create test files alongside the code they test with `.test.ts` extension:

```typescript
// example.test.ts
import { describe, it, expect } from "vitest";
import { calculateCost } from "./cost-calculator";

describe("calculateCost", () => {
  it("should calculate correct cost for GPT-4", () => {
    const cost = calculateCost("gpt-4", 1000, 500);
    expect(cost).toBeCloseTo(0.045);
  });
});
```

### Test Coverage Goals

- Aim for 80%+ coverage on critical paths
- Test edge cases and error conditions
- Mock external API calls

## 📤 Submitting Changes

### Before Submitting

1. **Update documentation** if you changed APIs or added features
2. **Run type checking:** `npm run check`
3. **Run tests:** `npm run test`
4. **Build the project:** `npm run build`
5. **Test manually** in your browser

### Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using "Fixes #123" or "Closes #123"
3. **Provide screenshots** for UI changes
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Keep your PR up to date** with the main branch

### PR Review Criteria

Your PR will be reviewed for:

- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation updates
- ✅ No breaking changes (or properly documented)
- ✅ Performance implications
- ✅ Security considerations

## 🐛 Reporting Issues

### Bug Reports

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots or error logs

### Feature Requests

When requesting a feature:

1. Search existing issues first
2. Describe the problem you're trying to solve
3. Explain your proposed solution
4. Consider alternatives
5. Be open to discussion

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## 📚 Additional Resources

- [Project Documentation](docs/PROJECT_DOCUMENTATION.md)
- [Cost Optimization Guide](docs/COST_OPTIMIZATION_QUICK_REF.md)
- [Free AI Implementation](docs/FREE_AI_IMPLEMENTATION_GUIDE.md)
- [API Documentation](docs/FULL_FEATURE_LIST.md)

## 💬 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and community support
- **Documentation**: Check the `/docs` folder for detailed guides

## 📄 License

By contributing to AI Workflow Architect, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
