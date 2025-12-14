import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword, requireAuth, attachUser, validateApiKey } from "./auth";
import { authLimiter, apiLimiter, agentLimiter } from "./middleware/rateLimiter";
import { checkBudget } from "./middleware/costGovernor";
import { orchestratorQueue } from "./services/orchestrator";
import { processGuideAgentRequest } from "./services/guideAgent";
import { createMcpRouter } from "./mcp";
import { getZapierMcpClient, testZapierMcpConnection } from "./services/zapierMcpClient";
import { z } from "zod";
import { insertUserSchema, insertOrgSchema, insertProjectSchema, insertIntegrationSchema, insertMemoryItemSchema } from "@shared/schema";
import crypto from "crypto";

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

  // MCP Protocol endpoint
  app.use("/mcp", createMcpRouter());

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
        role: role || "owner",
      });

      // Always create a default org for new users
      const org = await storage.createOrg({
        name: `${email}'s Organization`,
        ownerUserId: user.id,
      });
      req.session.orgId = org.id;
      req.session.userId = user.id;
      
      res.json({ id: user.id, email: user.email, role: user.role, orgId: org.id });
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

  // ===== ASSISTANT CHAT ROUTES =====

  app.post("/api/assistant/chat", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { message, context } = z.object({
        message: z.string().min(1).max(2000),
        context: z.string().default("dashboard"),
      }).parse(req.body);

      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      const result = await processGuideAgentRequest({
        message,
        context,
        orgId,
        userId,
      });

      await storage.createAuditLog({
        orgId,
        userId,
        action: "assistant_chat",
        target: context,
        detailJson: { messageLength: message.length, actionsCount: result.actions?.length || 0 },
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
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

  app.post("/api/zapier/apikey/generate", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const key = crypto.randomBytes(32).toString("hex");
      const apiKey = await storage.createApiKey({
        orgId,
        key,
        name: "Zapier",
      });

      res.json({
        key,
        keyId: apiKey.id,
        message: "Copy this key to Zapier settings in x-api-key header",
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/zapier/trigger", validateApiKey, async (req: Request, res: Response) => {
    try {
      const { projectId, goal, provider, model, zapierData } = z.object({
        projectId: z.string(),
        goal: z.string(),
        provider: z.string().optional().default("gemini"),
        model: z.string().optional(),
        zapierData: z.any().optional(),
      }).parse(req.body);

      const orgId = (req as any).orgId;
      const project = await storage.getProject(projectId);
      if (!project || project.orgId !== orgId) {
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
        orgId,
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

  app.get("/api/zapier/status/:runId", validateApiKey, async (req: Request, res: Response) => {
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

  // ===== ZAPIER MCP CLIENT ROUTES =====

  app.post("/api/zapier-mcp/test", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
      const result = await testZapierMcpConnection(endpoint);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/zapier-mcp/connect", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { endpoint, name } = z.object({
        endpoint: z.string().url(),
        name: z.string().optional(),
      }).parse(req.body);

      const result = await testZapierMcpConnection(endpoint);
      if (!result.success) {
        return res.status(400).json({ error: result.error || "Connection failed" });
      }

      const integration = await storage.createIntegration({
        orgId,
        provider: "zapier-mcp",
        status: "connected",
        metadataJson: {
          endpoint,
          name: name || "Zapier MCP",
          toolCount: result.tools?.length || 0,
          connectedAt: new Date().toISOString(),
        },
      });

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "zapier_mcp_connected",
        target: "zapier-mcp",
        detailJson: { integrationId: integration.id, endpoint, toolCount: result.tools?.length || 0 },
      });

      res.json({
        success: true,
        integration,
        tools: result.tools,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/zapier-mcp/tools", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const integrations = await storage.getIntegrations(orgId);
      const zapierIntegration = integrations.find(i => i.provider === "zapier-mcp" && i.status === "connected");

      if (!zapierIntegration) {
        return res.json({ connected: false, tools: [] });
      }

      const metadata = zapierIntegration.metadataJson as { endpoint?: string } | null;
      if (!metadata?.endpoint) {
        return res.json({ connected: false, tools: [], error: "No endpoint configured" });
      }

      try {
        const client = getZapierMcpClient(metadata.endpoint);
        const tools = await client.listTools();
        res.json({ connected: true, tools });
      } catch (error) {
        res.json({
          connected: true,
          tools: [],
          error: error instanceof Error ? error.message : "Failed to fetch tools",
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Zapier tools" });
    }
  });

  app.post("/api/zapier-mcp/call", requireAuth, agentLimiter, checkBudget, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { tool, args } = z.object({
        tool: z.string(),
        args: z.record(z.unknown()).optional(),
      }).parse(req.body);

      const integrations = await storage.getIntegrations(orgId);
      const zapierIntegration = integrations.find(i => i.provider === "zapier-mcp" && i.status === "connected");

      if (!zapierIntegration) {
        return res.status(400).json({ error: "Zapier MCP not connected" });
      }

      const metadata = zapierIntegration.metadataJson as { endpoint?: string } | null;
      if (!metadata?.endpoint) {
        return res.status(400).json({ error: "No endpoint configured" });
      }

      const client = getZapierMcpClient(metadata.endpoint);
      const result = await client.callTool(tool, args || {});

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "zapier_mcp_tool_call",
        target: tool,
        detailJson: { args, isError: result.isError },
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Tool call failed" });
    }
  });

  return httpServer;
}
