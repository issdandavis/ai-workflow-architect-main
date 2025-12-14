import { storage } from "../storage";
import { GeminiAdapter } from "./providerAdapters";

export interface GuideAgentRequest {
  message: string;
  context: string;
  orgId: string;
  userId: string;
}

export interface GuideAgentAction {
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface GuideAgentResponse {
  response: string;
  plan?: string[];
  actions?: GuideAgentAction[];
}

type ToolContext = {
  orgId: string;
  userId: string;
};

const AVAILABLE_TOOLS = [
  { name: "project.list", description: "List all projects in the organization", args: [] },
  { name: "project.get", description: "Get a specific project by ID", args: ["projectId"] },
  { name: "project.create", description: "Create a new project", args: ["name"] },
  { name: "memory.search", description: "Search memory entries by keyword", args: ["projectId", "query"] },
  { name: "memory.add", description: "Add a memory entry to project", args: ["projectId", "content", "kind?", "source?"] },
  { name: "vault.list", description: "List connected integrations", args: [] },
  { name: "vault.connect", description: "Connect a new integration", args: ["provider", "metadata?"] },
  { name: "agent.run", description: "Start an AI agent run for a goal", args: ["projectId", "goal", "provider?", "model?"] },
  { name: "agent.status", description: "Check status of an agent run", args: ["runId"] },
  { name: "audit.list", description: "Get recent audit logs", args: ["limit?"] },
];

const PAGE_CONTEXT_HINTS: Record<string, string> = {
  dashboard: "The user is on the main dashboard viewing an overview of their projects, recent activity, and quick stats.",
  studio: "The user is in the Coding Studio where they can work on code, run agents, and manage project files.",
  agents: "The user is on the Agents page where they can view and manage AI agent runs and configurations.",
  integrations: "The user is on the Integrations page managing connected services like Zapier, GitHub, Notion, etc.",
  storage: "The user is on the Storage/Memory page viewing and searching their project knowledge base.",
  settings: "The user is on the Settings page managing their account, API keys, and preferences.",
  shop: "The user is on the Shop page browsing available add-ons and extensions.",
};

async function executeLocalTool(toolName: string, args: Record<string, unknown>, ctx: ToolContext): Promise<{ result?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "project.list": {
        const projects = await storage.getProjectsByOrg(ctx.orgId);
        return { result: { projects: projects.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt })) } };
      }
      case "project.get": {
        const project = await storage.getProject(String(args.projectId));
        if (!project || project.orgId !== ctx.orgId) {
          return { result: { project: null } };
        }
        return { result: { project: { id: project.id, name: project.name, createdAt: project.createdAt } } };
      }
      case "project.create": {
        const project = await storage.createProject({
          orgId: ctx.orgId,
          name: String(args.name ?? "Untitled"),
        });
        return { result: { project: { id: project.id, name: project.name, createdAt: project.createdAt } } };
      }
      case "memory.search": {
        const project = await storage.getProject(String(args.projectId));
        if (!project || project.orgId !== ctx.orgId) {
          return { error: "Project not found or unauthorized" };
        }
        const results = await storage.searchMemoryItems(project.id, String(args.query ?? ""));
        return { result: { results: results.slice(0, 10).map(m => ({ id: m.id, kind: m.kind, content: m.content })) } };
      }
      case "memory.add": {
        const project = await storage.getProject(String(args.projectId));
        if (!project || project.orgId !== ctx.orgId) {
          return { error: "Project not found or unauthorized" };
        }
        const item = await storage.createMemoryItem({
          projectId: project.id,
          kind: String(args.kind ?? "note"),
          source: String(args.source ?? "assistant"),
          content: String(args.content ?? ""),
          embeddingRef: null,
        });
        return { result: { id: item.id, createdAt: item.createdAt } };
      }
      case "vault.list": {
        const integrations = await storage.getIntegrations(ctx.orgId);
        return { result: { integrations: integrations.map(i => ({ id: i.id, provider: i.provider, status: i.status })) } };
      }
      case "vault.connect": {
        const integration = await storage.createIntegration({
          orgId: ctx.orgId,
          provider: String(args.provider),
          status: "connected",
          metadataJson: (args.metadata as Record<string, unknown>) || {},
        });
        return { result: { id: integration.id, provider: integration.provider, status: integration.status } };
      }
      case "agent.run": {
        const project = await storage.getProject(String(args.projectId));
        if (!project || project.orgId !== ctx.orgId) {
          return { error: "Project not found or unauthorized" };
        }
        const agentRun = await storage.createAgentRun({
          projectId: project.id,
          status: "queued",
          model: String(args.model ?? "gemini-2.0-flash"),
          provider: String(args.provider ?? "gemini"),
          inputJson: { goal: args.goal },
          outputJson: null,
          costEstimate: null,
        });
        return { result: { runId: agentRun.id, status: "queued" } };
      }
      case "agent.status": {
        const run = await storage.getAgentRun(String(args.runId));
        if (!run) {
          return { error: "Run not found" };
        }
        return { result: { runId: run.id, status: run.status, provider: run.provider, model: run.model } };
      }
      case "audit.list": {
        const logs = await storage.getAuditLogs(ctx.orgId, Math.min(20, Number(args.limit ?? 10)));
        return { result: { logs: logs.map(l => ({ id: l.id, action: l.action, target: l.target, createdAt: l.createdAt })) } };
      }
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function buildPlannerPrompt(request: GuideAgentRequest): string {
  const contextHint = PAGE_CONTEXT_HINTS[request.context] || "The user is navigating the AI Orchestration Hub.";
  
  const toolsDescription = AVAILABLE_TOOLS.map(t => 
    `- ${t.name}: ${t.description}${t.args.length > 0 ? ` (args: ${t.args.join(", ")})` : ""}`
  ).join("\n");

  return `You are a helpful AI assistant for the AI Orchestration Hub platform. You help users manage their AI projects, integrations, and agent runs.

Current context: ${contextHint}

Available tools you can use:
${toolsDescription}

User message: "${request.message}"

Analyze the user's request and respond with a JSON object containing:
1. "plan": An array of steps you will take to help the user (strings describing each step)
2. "toolCalls": An array of tool calls to execute (each with "tool" and "args" properties), or empty array if no tools needed
3. "directResponse": A helpful response if no tools are needed, or null if tools will be called

Examples:
- If user asks "list my projects", respond with toolCalls for project.list
- If user asks "what can I do here", respond with directResponse explaining the current page features
- If user asks "search for X in project Y", respond with toolCalls for memory.search

Respond ONLY with valid JSON, no markdown or explanations.`;
}

function buildSynthesisPrompt(request: GuideAgentRequest, actions: GuideAgentAction[]): string {
  const contextHint = PAGE_CONTEXT_HINTS[request.context] || "";
  
  const actionResults = actions.map(a => 
    `Tool: ${a.tool}\nArgs: ${JSON.stringify(a.args)}\nResult: ${a.error ? `Error: ${a.error}` : JSON.stringify(a.result)}`
  ).join("\n\n");

  return `You are a helpful AI assistant. Based on the tool results below, provide a clear, concise response to the user.

User's original question: "${request.message}"
Context: ${contextHint}

Tool execution results:
${actionResults}

Provide a natural language response that directly addresses the user's question using the data from the tool results. Be concise but informative. If there were errors, explain what went wrong and suggest alternatives.`;
}

export async function processGuideAgentRequest(request: GuideAgentRequest): Promise<GuideAgentResponse> {
  const gemini = new GeminiAdapter(process.env.GOOGLE_API_KEY);
  const toolContext: ToolContext = { orgId: request.orgId, userId: request.userId };

  const plannerPrompt = buildPlannerPrompt(request);
  const planResult = await gemini.call(plannerPrompt, "gemini-2.0-flash");

  if (!planResult.success || !planResult.content) {
    return {
      response: planResult.error || "I'm having trouble processing your request. Please try again.",
      plan: [],
      actions: [],
    };
  }

  let parsed: { plan?: string[]; toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>; directResponse?: string | null };
  try {
    const jsonMatch = planResult.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { response: planResult.content, plan: [], actions: [] };
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { response: planResult.content, plan: [], actions: [] };
  }

  const plan = parsed.plan || [];
  const toolCalls = parsed.toolCalls || [];

  if (toolCalls.length === 0 && parsed.directResponse) {
    return {
      response: parsed.directResponse,
      plan,
      actions: [],
    };
  }

  if (toolCalls.length === 0) {
    return {
      response: "I understand your request, but I'm not sure what action to take. Could you be more specific?",
      plan,
      actions: [],
    };
  }

  const actions: GuideAgentAction[] = [];
  for (const call of toolCalls) {
    const { result, error } = await executeLocalTool(call.tool, call.args || {}, toolContext);
    actions.push({
      tool: call.tool,
      args: call.args || {},
      result,
      error,
    });
  }

  const synthesisPrompt = buildSynthesisPrompt(request, actions);
  const synthesisResult = await gemini.call(synthesisPrompt, "gemini-2.0-flash");

  const response = synthesisResult.success && synthesisResult.content
    ? synthesisResult.content
    : "I completed the actions but had trouble summarizing the results.";

  return {
    response,
    plan,
    actions,
  };
}
