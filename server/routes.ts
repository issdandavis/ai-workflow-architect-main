import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword, requireAuth, attachUser, validateApiKey } from "./auth";
import { authLimiter, apiLimiter, agentLimiter } from "./middleware/rateLimiter";
import { checkBudget } from "./middleware/costGovernor";
import { orchestratorQueue } from "./services/orchestrator";
import { retryService } from "./services/retryService";
import { processGuideAgentRequest } from "./services/guideAgent";
import { createMcpRouter } from "./mcp";
import { getZapierMcpClient, testZapierMcpConnection } from "./services/zapierMcpClient";
import { z } from "zod";
import { insertUserSchema, insertOrgSchema, insertProjectSchema, insertIntegrationSchema, insertMemoryItemSchema } from "@shared/schema";
import { getProviderAdapter } from "./services/providerAdapters";
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

  // ===== CREDENTIAL VAULT ROUTES =====

  app.get("/api/vault/credentials", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { listUserCredentials, SUPPORTED_PROVIDERS } = await import("./services/vault");
      const credentials = await listUserCredentials(userId);
      
      res.json({ 
        credentials,
        supportedProviders: SUPPORTED_PROVIDERS,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list credentials" });
    }
  });

  app.post("/api/vault/credentials", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, label } = z.object({
        provider: z.string(),
        apiKey: z.string().min(10, "API key too short"),
        label: z.string().optional(),
      }).parse(req.body);

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { storeUserCredential, validateApiKeyFormat, maskApiKey } = await import("./services/vault");

      if (!validateApiKeyFormat(provider, apiKey)) {
        return res.status(400).json({ error: `Invalid API key format for ${provider}` });
      }

      const credential = await storeUserCredential(userId, provider, apiKey, label);

      await storage.createAuditLog({
        orgId: req.session.orgId!,
        userId,
        action: "credential_stored",
        target: provider,
        detailJson: { credentialId: credential.id, masked: maskApiKey(apiKey) },
      });

      res.json({ 
        success: true, 
        credential: {
          id: credential.id,
          provider: credential.provider,
          label: credential.label,
        },
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to store credential" });
    }
  });

  app.delete("/api/vault/credentials/:id", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { deleteUserCredential } = await import("./services/vault");
      const deleted = await deleteUserCredential(userId, id);

      if (!deleted) {
        return res.status(404).json({ error: "Credential not found" });
      }

      await storage.createAuditLog({
        orgId: req.session.orgId!,
        userId,
        action: "credential_deleted",
        target: id,
        detailJson: null,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete credential" });
    }
  });

  app.post("/api/vault/credentials/test", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { provider, apiKey } = z.object({
        provider: z.string(),
        apiKey: z.string().min(10, "API key too short"),
      }).parse(req.body);

      const { validateApiKeyFormat, testApiKey } = await import("./services/vault");

      if (!validateApiKeyFormat(provider, apiKey)) {
        return res.status(400).json({ valid: false, error: `Invalid API key format for ${provider}` });
      }

      const result = await testApiKey(provider, apiKey);
      res.json(result);
    } catch (error) {
      res.status(400).json({ valid: false, error: error instanceof Error ? error.message : "Test failed" });
    }
  });

  app.get("/api/vault/usage", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const records = await storage.getUsageRecords(orgId, thirtyDaysAgo);
      const summary = await storage.getUsageSummary(orgId, thirtyDaysAgo);

      const byProvider: Record<string, { tokens: number; costUsd: number }> = {};
      for (const record of records) {
        if (!byProvider[record.provider]) {
          byProvider[record.provider] = { tokens: 0, costUsd: 0 };
        }
        byProvider[record.provider].tokens += record.inputTokens + record.outputTokens;
        byProvider[record.provider].costUsd += parseFloat(record.estimatedCostUsd || "0");
      }

      res.json({
        summary: {
          totalTokens: summary.totalTokens,
          totalCostUsd: summary.totalCostUsd,
          periodDays: 30,
        },
        byProvider,
        recentRecords: records.slice(0, 50),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get usage" });
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

  app.get("/api/agents/run/:runId/traces", requireAuth, apiLimiter, async (req: Request, res: Response) => {
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

      const traces = await storage.getDecisionTraces(runId);
      res.json(traces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch decision traces" });
    }
  });

  // ===== APPROVAL ROUTES =====

  app.get("/api/approvals/pending", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(403).json({ error: "No organization context" });
      }

      const pendingApprovals = await storage.getPendingApprovals(orgId);
      res.json(pendingApprovals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  });

  app.post("/api/approvals/:traceId/approve", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { traceId } = req.params;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const trace = await storage.getDecisionTrace(traceId);
      if (!trace) {
        return res.status(404).json({ error: "Decision trace not found" });
      }

      if (trace.approvalStatus !== "pending") {
        return res.status(400).json({ error: "Decision is not pending approval" });
      }

      const updated = await storage.approveDecision(traceId, userId);
      
      // Resume the agent run if it was awaiting approval
      const agentRun = await storage.getAgentRun(trace.agentRunId);
      if (agentRun && agentRun.status === "awaiting_approval") {
        await storage.updateAgentRun(trace.agentRunId, { status: "running" });
        orchestratorQueue.emit("approval_granted", trace.agentRunId);
      }

      await storage.createAuditLog({
        orgId: req.session.orgId!,
        userId,
        action: "decision_approved",
        target: traceId,
        detailJson: { decision: trace.decision, agentRunId: trace.agentRunId },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve decision" });
    }
  });

  app.post("/api/approvals/:traceId/reject", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { traceId } = req.params;
      const { reason } = z.object({
        reason: z.string().min(1, "Rejection reason is required"),
      }).parse(req.body);
      
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const trace = await storage.getDecisionTrace(traceId);
      if (!trace) {
        return res.status(404).json({ error: "Decision trace not found" });
      }

      if (trace.approvalStatus !== "pending") {
        return res.status(400).json({ error: "Decision is not pending approval" });
      }

      const updated = await storage.rejectDecision(traceId, userId, reason);
      
      // Cancel the agent run if it was awaiting approval
      const agentRun = await storage.getAgentRun(trace.agentRunId);
      if (agentRun && agentRun.status === "awaiting_approval") {
        await storage.updateAgentRun(trace.agentRunId, { 
          status: "cancelled",
          outputJson: { error: `Decision rejected: ${reason}` },
        });
        orchestratorQueue.emit("approval_rejected", trace.agentRunId, reason);
      }

      await storage.createAuditLog({
        orgId: req.session.orgId!,
        userId,
        action: "decision_rejected",
        target: traceId,
        detailJson: { decision: trace.decision, reason, agentRunId: trace.agentRunId },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject decision" });
    }
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

  // ===== USAGE DASHBOARD ROUTES =====

  app.get("/api/usage", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const records = await storage.getUsageRecords(orgId, since);
      const summary = await storage.getUsageSummary(orgId, since);

      const byProvider: Record<string, { tokens: number; costUsd: number }> = {};
      const dailyMap: Record<string, { tokens: number; cost: number }> = {};

      for (const record of records) {
        if (!byProvider[record.provider]) {
          byProvider[record.provider] = { tokens: 0, costUsd: 0 };
        }
        byProvider[record.provider].tokens += record.inputTokens + record.outputTokens;
        byProvider[record.provider].costUsd += parseFloat(record.estimatedCostUsd || "0");

        const dateKey = new Date(record.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { tokens: 0, cost: 0 };
        }
        dailyMap[dateKey].tokens += record.inputTokens + record.outputTokens;
        dailyMap[dateKey].cost += parseFloat(record.estimatedCostUsd || "0");
      }

      const dailyUsage = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .reverse();

      res.json({
        summary: {
          totalTokens: summary.totalTokens,
          totalCostUsd: summary.totalCostUsd,
          periodDays: days,
        },
        byProvider,
        dailyUsage,
        recentRecords: records.slice(0, 50),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get usage" });
    }
  });

  // ===== BUDGET MANAGEMENT ROUTES =====

  app.get("/api/budgets", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const monthlyBudget = await storage.getBudget(orgId, "monthly");
      const dailyBudget = await storage.getBudget(orgId, "daily");

      const budgets = [];
      if (monthlyBudget) {
        budgets.push({
          ...monthlyBudget,
          limitUsd: parseFloat(monthlyBudget.limitUsd),
          spentUsd: parseFloat(monthlyBudget.spentUsd),
        });
      }
      if (dailyBudget) {
        budgets.push({
          ...dailyBudget,
          limitUsd: parseFloat(dailyBudget.limitUsd),
          spentUsd: parseFloat(dailyBudget.spentUsd),
        });
      }

      res.json({ budgets });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get budgets" });
    }
  });

  app.post("/api/budgets", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { period, limitUsd } = z.object({
        period: z.enum(["daily", "monthly"]),
        limitUsd: z.number().positive(),
      }).parse(req.body);

      const existingBudget = await storage.getBudget(orgId, period);

      if (existingBudget) {
        await storage.updateBudgetLimit(existingBudget.id, limitUsd.toString());
        res.json({ success: true, updated: true });
      } else {
        const budget = await storage.createBudget({
          orgId,
          period,
          limitUsd: limitUsd.toString(),
          spentUsd: "0",
          updatedAt: new Date(),
        });
        res.json({ success: true, budget });
      }

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "budget_updated",
        target: period,
        detailJson: { limitUsd },
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save budget" });
    }
  });

  // ===== CIRCUIT BREAKER STATUS ROUTES =====

  app.get("/api/circuits", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const status = retryService.getCircuitStatus();
      res.json({ circuits: status });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get circuit status" });
    }
  });

  app.post("/api/circuits/reset", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !["owner", "admin"].includes(user.role || "")) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validProviders = ["openai", "anthropic", "google", "gemini", "perplexity", "xai"];
      const { provider } = req.body;
      
      if (provider && !validProviders.includes(provider.toLowerCase())) {
        return res.status(400).json({ error: `Invalid provider. Valid: ${validProviders.join(", ")}` });
      }

      if (provider) {
        retryService.resetCircuit(provider.toLowerCase());
      } else {
        retryService.resetAllCircuits();
      }

      const orgId = req.session.orgId;
      if (orgId) {
        await storage.createAuditLog({
          orgId,
          userId: req.session.userId || null,
          action: "circuit_reset",
          target: provider || "all",
          detailJson: {},
        });
      }

      res.json({ success: true, provider: provider || "all" });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to reset circuit" });
    }
  });

  // ===== GITHUB INTEGRATION ROUTES =====

  app.get("/api/github/user", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { getAuthenticatedUser } = await import("./services/githubClient");
      const user = await getAuthenticatedUser();
      res.json({ user });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "GitHub not connected" });
    }
  });

  app.get("/api/github/repos", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { listRepositories } = await import("./services/githubClient");
      const repos = await listRepositories();
      res.json({ repos: repos.map(r => ({ name: r.name, fullName: r.full_name, url: r.html_url, private: r.private })) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "GitHub not connected" });
    }
  });

  app.post("/api/github/repo", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { name, description, isPrivate } = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
      }).parse(req.body);

      const { createRepository } = await import("./services/githubClient");
      const repo = await createRepository(name, {
        description,
        private: isPrivate,
        autoInit: true,
      });

      res.json({ 
        success: true, 
        repo: { 
          name: repo.name, 
          fullName: repo.full_name, 
          url: repo.html_url,
          cloneUrl: repo.clone_url,
        } 
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create repository" });
    }
  });

  app.post("/api/github/file", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { owner, repo, path, content, message, branch } = z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        content: z.string(),
        message: z.string(),
        branch: z.string().optional(),
      }).parse(req.body);

      const { createOrUpdateFile, getFileContent } = await import("./services/githubClient");
      
      // Check if file exists to get SHA for update
      const existing = await getFileContent(owner, repo, path, branch);
      const sha = existing && 'sha' in existing ? existing.sha : undefined;

      const result = await createOrUpdateFile(owner, repo, path, content, message, branch || "main", sha);
      res.json({ success: true, commit: result.commit });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create file" });
    }
  });

  app.post("/api/github/branch", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { owner, repo, branchName, fromRef } = z.object({
        owner: z.string(),
        repo: z.string(),
        branchName: z.string(),
        fromRef: z.string().optional(),
      }).parse(req.body);

      const { createBranch } = await import("./services/githubClient");
      const result = await createBranch(owner, repo, branchName, fromRef || "main");
      res.json({ success: true, ref: result.ref });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create branch" });
    }
  });

  app.post("/api/github/pull-request", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { owner, repo, title, body, head, base } = z.object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string(),
        head: z.string(),
        base: z.string().optional(),
      }).parse(req.body);

      const { createPullRequest } = await import("./services/githubClient");
      const pr = await createPullRequest(owner, repo, title, body, head, base || "main");
      res.json({ success: true, pullRequest: { number: pr.number, url: pr.html_url, title: pr.title } });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create pull request" });
    }
  });

  // ===== GOOGLE DRIVE INTEGRATION ROUTES =====

  app.get("/api/google-drive/status", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { isGoogleDriveConnected } = await import("./services/googleDriveClient");
      const connected = await isGoogleDriveConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/google-drive/files", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { folderId, pageSize } = z.object({
        folderId: z.string().optional(),
        pageSize: z.coerce.number().optional().default(20),
      }).parse(req.query);

      const { listDriveFiles } = await import("./services/googleDriveClient");
      const files = await listDriveFiles(folderId, pageSize);
      res.json({ files });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to list files" });
    }
  });

  app.get("/api/google-drive/file/:fileId", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { getDriveFile } = await import("./services/googleDriveClient");
      const file = await getDriveFile(fileId);
      res.json({ file });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get file" });
    }
  });

  app.get("/api/google-drive/quota", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { getDriveStorageQuota } = await import("./services/googleDriveClient");
      const quota = await getDriveStorageQuota();
      res.json({ quota });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get quota" });
    }
  });

  app.post("/api/google-drive/folder", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { name, parentFolderId } = z.object({
        name: z.string().min(1),
        parentFolderId: z.string().optional(),
      }).parse(req.body);

      const { createDriveFolder } = await import("./services/googleDriveClient");
      const folder = await createDriveFolder(name, parentFolderId);
      res.json({ folder });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create folder" });
    }
  });

  app.delete("/api/google-drive/file/:fileId", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { deleteDriveFile } = await import("./services/googleDriveClient");
      await deleteDriveFile(fileId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to delete file" });
    }
  });

  // ===== ROUNDTABLE ROUTES =====

  // Get available AI providers
  app.get("/api/roundtable/providers", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { AI_CONFIGS } = await import("./services/roundtableCoordinator");
      const providers = Object.entries(AI_CONFIGS).map(([id, config]) => ({
        id,
        name: config.name,
        role: config.role,
        signOff: config.signOff,
      }));
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get providers" });
    }
  });

  // Create a new roundtable session
  app.post("/api/roundtable/sessions", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { AI_CONFIGS } = await import("./services/roundtableCoordinator");
      const validProviders = Object.keys(AI_CONFIGS);

      const { title, topic, activeProviders, orchestrationMode, maxTurns, projectId } = z.object({
        title: z.string().min(1),
        topic: z.string().optional(),
        activeProviders: z.array(z.string()).min(1).refine(
          (providers) => providers.every(p => validProviders.includes(p)),
          { message: "Invalid provider specified" }
        ),
        orchestrationMode: z.enum(["round-robin", "free-form", "moderated"]).default("round-robin"),
        maxTurns: z.number().min(1).max(100).default(20),
        projectId: z.string().optional(),
      }).parse(req.body);

      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || project.orgId !== orgId) {
          return res.status(403).json({ error: "Unauthorized access to project" });
        }
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const session = await storage.createRoundtableSession({
        orgId,
        projectId: projectId || null,
        title,
        topic: topic || null,
        activeProviders,
        orchestrationMode,
        maxTurns,
        status: "active",
        createdBy: userId,
      });

      await storage.createAuditLog({
        orgId,
        userId: req.session.userId || null,
        action: "roundtable_session_created",
        target: session.id,
        detailJson: { title, providers: activeProviders },
      });

      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // List roundtable sessions
  app.get("/api/roundtable/sessions", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const sessions = await storage.getRoundtableSessions(orgId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get a specific session with messages
  app.get("/api/roundtable/sessions/:id", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await storage.getRoundtableSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const messages = await storage.getRoundtableMessages(id);
      res.json({ ...session, messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Add a user message to a session
  app.post("/api/roundtable/sessions/:id/message", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = z.object({
        content: z.string().min(1).max(10000),
      }).parse(req.body);

      const session = await storage.getRoundtableSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      const sequenceNumber = await storage.getNextSequenceNumber(id);
      const message = await storage.createRoundtableMessage({
        sessionId: id,
        senderType: "user",
        senderId: req.session.userId || null,
        provider: null,
        model: null,
        content,
        signature: null,
        sequenceNumber,
        tokensUsed: null,
        responseTimeMs: null,
        metadata: null,
      });

      res.json(message);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Trigger a single AI's turn
  app.post("/api/roundtable/sessions/:id/ai-turn", requireAuth, agentLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { provider } = z.object({
        provider: z.string(),
      }).parse(req.body);

      const session = await storage.getRoundtableSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { processAITurn } = await import("./services/roundtableCoordinator");
      const message = await processAITurn(id, provider, userId);

      res.json(message);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "AI turn failed" });
    }
  });

  // Run a full round of all active AIs
  app.post("/api/roundtable/sessions/:id/round", requireAuth, agentLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const session = await storage.getRoundtableSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { runRoundtableRound } = await import("./services/roundtableCoordinator");
      const messages = await runRoundtableRound(id, userId);

      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Round failed" });
    }
  });

  // Update session status (pause/resume/complete)
  app.patch("/api/roundtable/sessions/:id", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = z.object({
        status: z.enum(["active", "paused", "completed"]),
      }).parse(req.body);

      const session = await storage.getRoundtableSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.orgId !== req.session.orgId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateRoundtableSession(id, { status });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== CODE ASSISTANT ROUTES =====

  app.post("/api/code-assistant/generate", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { prompt, provider, model, conversationHistory } = z.object({
        prompt: z.string().min(1, "Prompt is required").max(10000),
        provider: z.enum(["openai", "anthropic", "xai", "perplexity", "google"]),
        model: z.string().optional(),
        conversationHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }).parse(req.body);

      const adapter = getProviderAdapter(provider);
      
      let fullPrompt = prompt;
      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n\n");
        fullPrompt = `Previous conversation:\n${historyText}\n\nUser: ${prompt}`;
      }

      const systemPrompt = `You are an expert coding assistant. When asked to generate code, provide clean, well-commented, production-ready code. Format code blocks properly and explain your implementation choices briefly.\n\n${fullPrompt}`;

      const result = await adapter.call(systemPrompt, model || "");

      if (!result.success) {
        return res.status(400).json({ 
          error: result.error || "Failed to generate code",
          provider,
        });
      }

      await storage.createAuditLog({
        orgId: req.session.orgId!,
        userId: req.session.userId || null,
        action: "code_assistant_generate",
        target: provider,
        detailJson: { 
          promptLength: prompt.length,
          model: model || "default",
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        },
      });

      res.json({
        content: result.content,
        usage: result.usage ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        } : undefined,
        provider,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: error.errors.map(e => e.message).join(", "),
        });
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  });

  // ===== AGENT DEVELOPMENT ROUTES =====

  app.get("/api/agent-dev/analyze", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { filePath } = z.object({
        filePath: z.string().min(1, "File path is required"),
      }).parse(req.query);

      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      // Security: Prevent directory traversal
      if (filePath.includes("..") || filePath.startsWith("/")) {
        return res.status(400).json({ error: "Invalid file path - directory traversal not allowed" });
      }

      // For demo purposes, we'll read from the project root
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Secure path validation using resolve and relative
      const projectRoot = process.cwd();
      const resolvedPath = path.resolve(projectRoot, filePath);
      const relativePath = path.relative(projectRoot, resolvedPath);
      
      // Ensure the resolved path is still within project root
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ error: "Access denied: path outside project" });
      }
      
      const safePath = resolvedPath;

      let content: string;
      let stats: any;
      try {
        content = await fs.readFile(safePath, "utf-8");
        stats = await fs.stat(safePath);
      } catch (err) {
        return res.status(404).json({ error: "File not found" });
      }

      const lines = content.split("\n").length;

      // Persist the analysis
      const analysis = await storage.createAgentAnalysis({
        orgId,
        projectId: null,
        userId,
        filePath,
        content,
        analysisResult: { lines, size: stats.size },
      });

      await storage.createAuditLog({
        orgId,
        userId,
        action: "agent_dev_analyze",
        target: filePath,
        detailJson: { lines, size: stats.size, analysisId: analysis.id },
      });

      res.json({
        analysisId: analysis.id,
        filePath,
        content,
        lines,
        size: stats.size,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze file" });
    }
  });

  app.post("/api/agent-dev/suggest", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { filePath, content, prompt, provider, model, analysisId } = z.object({
        filePath: z.string().min(1),
        content: z.string().min(1),
        prompt: z.string().min(1).max(5000),
        provider: z.enum(["openai", "anthropic", "xai", "perplexity", "google"]),
        model: z.string().optional(),
        analysisId: z.number().optional(),
      }).parse(req.body);

      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      // Create analysis record if not provided
      let finalAnalysisId = analysisId;
      if (!finalAnalysisId) {
        const analysis = await storage.createAgentAnalysis({
          orgId,
          projectId: null,
          userId,
          filePath,
          content,
          analysisResult: null,
        });
        finalAnalysisId = analysis.id;
      }

      const adapter = getProviderAdapter(provider);

      const systemPrompt = `You are an expert code reviewer and improvement assistant. Analyze the following code and provide specific, actionable improvement suggestions.

FILE: ${filePath}

CODE:
\`\`\`
${content}
\`\`\`

USER REQUEST: ${prompt}

Please provide 3-5 specific code improvement suggestions. For each suggestion:
1. Give it a clear, concise title
2. Explain why this improvement is beneficial
3. Provide the improved code block if applicable

Format your response as JSON with the following structure:
{
  "suggestions": [
    {
      "title": "Improvement title",
      "description": "Detailed explanation of why and how to improve",
      "codeBlock": "The improved code snippet (optional)"
    }
  ]
}`;

      const result = await adapter.call(systemPrompt, model || "");

      if (!result.success) {
        return res.status(400).json({
          error: result.error || "Failed to get suggestions",
          provider,
        });
      }

      // Try to parse JSON from response
      let suggestions = [];
      try {
        const jsonMatch = result.content?.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestions = parsed.suggestions || [];
        }
      } catch {
        // If JSON parsing fails, create a single suggestion from the raw response
        suggestions = [{
          title: "AI Analysis",
          description: result.content || "No suggestions available",
          codeBlock: null,
        }];
      }

      // Persist the suggestion
      const suggestion = await storage.createAgentSuggestion({
        analysisId: finalAnalysisId,
        provider,
        model: model || "default",
        prompt,
        suggestions,
        diffPreview: null,
      });

      await storage.createAuditLog({
        orgId,
        userId,
        action: "agent_dev_suggest",
        target: filePath,
        detailJson: {
          provider,
          model: model || "default",
          promptLength: prompt.length,
          suggestionsCount: suggestions.length,
          suggestionId: suggestion.id,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        },
      });

      res.json({
        suggestionId: suggestion.id,
        analysisId: finalAnalysisId,
        suggestions,
        provider,
        usage: result.usage ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        } : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get suggestions" });
    }
  });

  app.post("/api/agent-dev/apply", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { filePath, originalContent, proposedContent, description, suggestionId } = z.object({
        filePath: z.string().min(1),
        originalContent: z.string(),
        proposedContent: z.string().min(1),
        description: z.string().min(1).max(1000),
        suggestionId: z.number().optional(),
      }).parse(req.body);

      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      // Security: Prevent directory traversal
      if (filePath.includes("..") || filePath.startsWith("/")) {
        return res.status(400).json({ error: "Invalid file path" });
      }

      // Create the proposal with pending status
      const proposal = await storage.createAgentProposal({
        suggestionId: suggestionId || null,
        filePath,
        originalContent,
        proposedContent,
        status: "pending",
        approvedBy: null,
      });

      await storage.createAuditLog({
        orgId,
        userId,
        action: "agent_dev_proposal_created",
        target: filePath,
        detailJson: {
          proposalId: proposal.id,
          description,
          originalLength: originalContent.length,
          proposedLength: proposedContent.length,
        },
      });

      res.json({
        success: true,
        proposalId: proposal.id,
        message: "Proposal created successfully. Review and approve to apply changes.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create proposal" });
    }
  });

  // List proposals
  app.get("/api/agent-dev/proposals", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.orgId;
      if (!orgId) {
        return res.status(400).json({ error: "No organization set" });
      }

      const { status } = z.object({
        status: z.enum(["pending", "approved", "rejected", "applied"]).optional(),
      }).parse(req.query);

      const proposals = await storage.getAgentProposalsByOrg(orgId, status);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch proposals" });
    }
  });

  // Approve a proposal
  app.post("/api/agent-dev/proposals/:id/approve", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      const proposal = await storage.getAgentProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is not pending" });
      }

      // Apply the changes to the file
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Secure path validation using resolve and relative
      const projectRoot = process.cwd();
      const resolvedPath = path.resolve(projectRoot, proposal.filePath);
      const relativePath = path.relative(projectRoot, resolvedPath);
      
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return res.status(403).json({ error: "Access denied: path outside project" });
      }
      
      const safePath = resolvedPath;

      try {
        await fs.writeFile(safePath, proposal.proposedContent, "utf-8");
      } catch (err) {
        return res.status(500).json({ error: "Failed to write file" });
      }

      const updated = await storage.updateAgentProposalStatus(id, "applied", userId);

      await storage.createAuditLog({
        orgId,
        userId,
        action: "agent_dev_proposal_approved",
        target: proposal.filePath,
        detailJson: { proposalId: id },
      });

      res.json({ success: true, proposal: updated });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to approve proposal" });
    }
  });

  // Reject a proposal
  app.post("/api/agent-dev/proposals/:id/reject", requireAuth, apiLimiter, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = req.session.orgId;
      const userId = req.session.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ error: "No organization or user context" });
      }

      // Parse optional reason from body
      const { reason } = z.object({
        reason: z.string().optional(),
      }).parse(req.body || {});

      const proposal = await storage.getAgentProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is not pending" });
      }

      const updated = await storage.updateAgentProposalStatus(id, "rejected", userId);

      await storage.createAuditLog({
        orgId,
        userId,
        action: "agent_dev_proposal_rejected",
        target: proposal.filePath,
        detailJson: { proposalId: id, reason: reason || null },
      });

      res.json({ success: true, proposal: updated });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to reject proposal" });
    }
  });

  return httpServer;
}
