import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword, requireAuth, attachUser } from "./auth";
import { authLimiter, apiLimiter, agentLimiter } from "./middleware/rateLimiter";
import { checkBudget } from "./middleware/costGovernor";
import { orchestratorQueue } from "./services/orchestrator";
import { z } from "zod";
import { insertUserSchema, insertOrgSchema, insertProjectSchema, insertIntegrationSchema, insertMemoryItemSchema } from "@shared/schema";

const VERSION = "1.0.0";

// SSE connections for agent run streaming
const sseConnections = new Map<string, Response>();

// Setup SSE streaming for agent runs
orchestratorQueue.on("log", (runId: string, logEntry: any) => {
  const res = sseConnections.get(runId);
  if (res) {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Attach user to all requests
  app.use(attachUser);

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      version: VERSION,
    });
  });

  // ===== AUTH ROUTES =====
  
  app.post("/api/auth/signup", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, role } = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
      }).parse(req.body);

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        role: role || "member",
      });

      // Create default org for owner
      if (user.role === "owner") {
        const org = await storage.createOrg({
          name: `${email}'s Organization`,
          ownerUserId: user.id,
        });
        req.session.orgId = org.id;
      }

      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      // Set org if user is owner
      const orgs = await storage.getOrgsByUser(user.id);
      if (orgs.length > 0) {
        req.session.orgId = orgs[0].id;
      }

      res.json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ id: user.id, email: user.email, role: user.role });
  });

  // ===== INTEGRATION VAULT ROUTES =====

  app.get("/api/integrations", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const integrations = await storage.getIntegrations(orgId);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations/connect", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { provider, metadataJson } = z.object({
        provider: z.string(),
        metadataJson: z.any().optional(),
      }).parse(req.body);

      const integration = await storage.createIntegration({
        orgId,
        provider,
        status: "connected",
        metadataJson: metadataJson || {},
      });

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "integration_connected",
        target: provider,
        detailJson: { integrationId: integration.id },
      });

      res.json(integration);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/integrations/disconnect", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = z.object({ id: z.string() }).parse(req.body);
      
      const integration = await storage.getIntegration(id);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      if (integration.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.disconnectIntegration(id);

      await storage.createAuditLog({
        orgId: integration.orgId,
        userId: req.session.userId || null,
        action: "integration_disconnected",
        target: integration.provider,
        detailJson: { integrationId: id },
      });

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== AGENT ORCHESTRATION ROUTES =====

  app.post("/api/agents/run", requireAuth, agentLimiter, checkBudget, async (req: Request, res: Response) => {
    try {
      const { projectId, goal, mode, provider, model } = z.object({
        projectId: z.string(),
        goal: z.string(),
        mode: z.string().optional(),
        provider: z.string().default("openai"),
        model: z.string().default("gpt-4o"),
      }).parse(req.body);

      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.orgId !== orgId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const agentRun = await storage.createAgentRun({
        projectId,
        status: "queued",
        model,
        provider,
        inputJson: { goal, mode },
        outputJson: null,
        costEstimate: null,
      });

      orchestratorQueue.enqueue({
        runId: agentRun.id,
        projectId,
        orgId,
        goal,
        mode: mode || "default",
      });

      res.json({ runId: agentRun.id });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/agents/run/:runId", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const agentRun = await storage.getAgentRun(runId);
      
      if (!agentRun) {
        return res.status(404).json({ error: "Agent run not found" });
      }

      const project = await storage.getProject(agentRun.projectId);
      if (!project || project.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const messages = await storage.getMessagesByAgentRun(runId);

      res.json({ ...agentRun, messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent run" });
    }
  });

  app.get("/api/agents/stream/:runId", requireAuth, async (req: Request, res: Response) => {
    const { runId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    sseConnections.set(runId, res);

    req.on("close", () => {
      sseConnections.delete(runId);
    });
  });

  // ===== MEMORY ROUTES =====

  app.post("/api/memory/add", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { projectId, kind, source, content } = z.object({
        projectId: z.string(),
        kind: z.string(),
        source: z.string(),
        content: z.string(),
      }).parse(req.body);

      const project = await storage.getProject(projectId);
      if (!project || project.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const memoryItem = await storage.createMemoryItem({
        projectId,
        kind,
        source,
        content,
        embeddingRef: null,
      });

      res.json(memoryItem);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/memory/search", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { projectId, q } = z.object({
        projectId: z.string(),
        q: z.string().optional(),
      }).parse(req.query);

      const project = await storage.getProject(projectId);
      if (!project || project.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const items = q
        ? await storage.searchMemoryItems(projectId, q)
        : await storage.getMemoryItems(projectId);

      res.json(items);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== GIT OPERATIONS ROUTES =====

  app.get("/api/repos", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    const githubConfigured = !!process.env.GITHUB_TOKEN;
    
    if (!githubConfigured) {
      return res.json({
        configured: false,
        message: "GitHub integration not configured. Add GITHUB_TOKEN to connect.",
        repos: [],
      });
    }

    // Stub for now
    res.json({
      configured: true,
      repos: [
        { name: "example-repo", branch: "main", url: "https://github.com/user/example-repo" },
      ],
    });
  });

  app.post("/api/repos/commit", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { repo, branch, message, files } = z.object({
        repo: z.string(),
        branch: z.string(),
        message: z.string(),
        files: z.array(z.object({
          path: z.string(),
          content: z.string(),
        })),
      }).parse(req.body);

      if (branch === "main" || branch === "master") {
        return res.status(400).json({
          error: "Direct commits to main/master are not allowed. Please use a feature branch.",
        });
      }

      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "git_commit_attempted",
        target: repo,
        detailJson: { branch, message, fileCount: files.length },
      });

      if (!process.env.GITHUB_TOKEN) {
        return res.status(501).json({
          configured: false,
          message: "GitHub integration not configured",
        });
      }

      // Stub response
      res.json({
        success: true,
        message: "Commit queued (stub implementation)",
        branch,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== PROJECT ROUTES =====

  app.get("/api/projects", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    const orgId = req.session.orgId;
    if (!orgId) {
      return res.status(400).json({ error: "No organization set" });
    }

    const projects = await storage.getProjectsByOrg(orgId);
    res.json(projects);
  });

  app.post("/api/projects", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { name } = z.object({ name: z.string() }).parse(req.body);
      
      const project = await storage.createProject({ orgId, name });
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== ZAPIER INTEGRATION ROUTES =====

  app.post("/api/zapier/trigger", async (req: Request, res: Response) => {
    try {
      const { projectId, goal, provider, model, zapierData } = z.object({
        projectId: z.string(),
        goal: z.string(),
        provider: z.string().optional().default("gemini"),
        model: z.string().optional(),
        zapierData: z.any().optional(),
      }).parse(req.body);

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create agent run triggered by Zapier
      const agentRun = await storage.createAgentRun({
        projectId,
        status: "queued",
        model: model || "gemini-2.0-flash",
        provider: provider || "gemini",
        inputJson: { goal, zapierData, triggeredBy: "zapier" },
        outputJson: null,
        costEstimate: null,
      });

      orchestratorQueue.enqueue({
        runId: agentRun.id,
        projectId,
        orgId: project.orgId,
        goal,
        mode: "zapier",
      });

      // Return run ID to Zapier
      res.json({
        success: true,
        runId: agentRun.id,
        projectId,
        status: "queued",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/zapier/status/:runId", async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const agentRun = await storage.getAgentRun(runId);
      
      if (!agentRun) {
        return res.status(404).json({ error: "Run not found" });
      }

      const messages = await storage.getMessagesByAgentRun(runId);

      res.json({
        runId: agentRun.id,
        projectId: agentRun.projectId,
        status: agentRun.status,
        provider: agentRun.provider,
        model: agentRun.model,
        result: agentRun.outputJson,
        costEstimate: agentRun.costEstimate,
        messagesCount: messages.length,
        createdAt: agentRun.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch run status" });
    }
  });

  return httpServer;
}
