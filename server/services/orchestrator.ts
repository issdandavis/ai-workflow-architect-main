import { EventEmitter } from "events";
import { storage } from "../storage";
import { retryService } from "./retryService";
import { trackCost } from "../middleware/costGovernor";
import type { InsertDecisionTrace } from "@shared/schema";

export interface AgentHandoff {
  summary: string;
  decisions: string[];
  tasks: string[];
  artifacts: Array<{ name: string; content: string }>;
  questions: string[];
  nextAgentSuggestion?: string;
}

export interface AgentTask {
  runId: string;
  projectId: string;
  orgId: string;
  goal: string;
  mode: string;
}

type StepType = InsertDecisionTrace["stepType"];

class OrchestratorQueue extends EventEmitter {
  private queue: AgentTask[] = [];
  private processing = false;
  private concurrency = 2;
  private activeCount = 0;
  private stepCounters: Map<string, number> = new Map();

  private async traceDecision(
    runId: string,
    stepType: StepType,
    decision: string,
    reasoning: string,
    options?: {
      confidence?: number;
      alternatives?: unknown[];
      contextUsed?: unknown;
      startTime?: number;
    }
  ): Promise<void> {
    const stepNumber = (this.stepCounters.get(runId) || 0) + 1;
    this.stepCounters.set(runId, stepNumber);

    const durationMs = options?.startTime ? Date.now() - options.startTime : undefined;

    try {
      await storage.createDecisionTrace({
        agentRunId: runId,
        stepNumber,
        stepType,
        decision,
        reasoning,
        confidence: options?.confidence?.toString(),
        alternatives: options?.alternatives,
        contextUsed: options?.contextUsed,
        durationMs,
      });
    } catch (error) {
      console.error("Failed to log decision trace:", error);
    }
  }

  enqueue(task: AgentTask) {
    this.queue.push(task);
    this.emit("log", task.runId, { type: "info", message: "Task queued" });
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.activeCount >= this.concurrency) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.activeCount++;
    this.processing = true;

    try {
      await this.executeTask(task);
    } catch (error) {
      this.emit("log", task.runId, {
        type: "error",
        message: `Task failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      
      await storage.updateAgentRun(task.runId, {
        status: "failed",
        outputJson: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    } finally {
      this.activeCount--;
      this.processing = false;
      
      // Process next task if queue has items
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private async executeTask(task: AgentTask) {
    const startTime = Date.now();
    this.stepCounters.set(task.runId, 0);

    const run = await storage.getAgentRun(task.runId);
    if (!run) {
      throw new Error("Agent run not found");
    }

    this.emit("log", task.runId, {
      type: "info",
      message: `Starting agent run with ${run.provider} (${run.model})`,
    });

    await this.traceDecision(
      task.runId,
      "provider_selection",
      `Selected ${run.provider} with model ${run.model}`,
      `User requested ${run.provider} as the primary provider. Model ${run.model} was chosen based on task requirements.`,
      {
        confidence: 0.95,
        alternatives: ["openai", "anthropic", "perplexity", "xai"].filter(p => p !== run.provider),
        contextUsed: { goal: task.goal, mode: task.mode },
        startTime,
      }
    );

    await storage.updateAgentRun(task.runId, { status: "running" });

    // Create initial message
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "user",
      content: task.goal,
    });

    await this.traceDecision(
      task.runId,
      "context_analysis",
      "Analyzed user goal and prepared request",
      `Parsed user goal: "${task.goal.substring(0, 100)}${task.goal.length > 100 ? '...' : ''}". Prepared message for ${run.provider}.`,
      { confidence: 0.9, contextUsed: { goalLength: task.goal.length, mode: task.mode } }
    );

    this.emit("log", task.runId, {
      type: "info",
      message: `Calling ${run.provider} with model ${run.model} (with retry/fallback)...`,
    });

    let retryStep = 0;
    const response = await retryService.callWithRetry(
      run.provider,
      task.goal,
      run.model,
      async (attempt, error, nextProvider) => {
        retryStep++;
        if (nextProvider) {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Provider failed, falling back to ${nextProvider}. Error: ${error}`,
          });
          await this.traceDecision(
            task.runId,
            "fallback",
            `Switching from failed provider to ${nextProvider}`,
            `${run.provider} failed with error: "${error}". Fallback chain triggered to try ${nextProvider} next.`,
            { confidence: 0.85, alternatives: [], contextUsed: { attempt, error, originalProvider: run.provider } }
          );
        } else {
          this.emit("log", task.runId, {
            type: "warning",
            message: `Retry attempt ${attempt}. Error: ${error}`,
          });
          await this.traceDecision(
            task.runId,
            "retry",
            `Retrying request (attempt ${attempt})`,
            `Previous attempt failed with: "${error}". Applying exponential backoff before retry.`,
            { confidence: 0.8, contextUsed: { attempt, error } }
          );
        }
      }
    );

    if (!response.success) {
      await this.traceDecision(
        task.runId,
        "error_handling",
        "All providers failed, marking run as failed",
        `Exhausted all retry attempts and fallback providers. Final error: ${response.error}`,
        { confidence: 1.0, contextUsed: { attempts: response.attempts, error: response.error } }
      );
      throw new Error(response.error || "Provider call failed");
    }

    if (response.usedProvider !== run.provider) {
      this.emit("log", task.runId, {
        type: "info",
        message: `Used fallback provider: ${response.usedProvider} (${response.attempts} total attempts)`,
      });
    }

    // Save the response
    await storage.createMessage({
      projectId: task.projectId,
      agentRunId: task.runId,
      role: "assistant",
      content: response.content || "",
    });

    const costEstimate = response.usage?.costEstimate || "0";
    await storage.updateAgentRun(task.runId, {
      status: "completed",
      outputJson: {
        content: response.content,
        usage: response.usage,
        usedProvider: response.usedProvider,
        attempts: response.attempts,
      },
      costEstimate,
    });

    await this.traceDecision(
      task.runId,
      "response_generation",
      `Generated response with ${response.usedProvider}`,
      `Successfully received response from ${response.usedProvider}. Token usage: ${response.usage?.inputTokens || 0} input, ${response.usage?.outputTokens || 0} output. Cost: $${costEstimate}.`,
      {
        confidence: 0.95,
        contextUsed: {
          usedProvider: response.usedProvider,
          attempts: response.attempts,
          usage: response.usage,
        },
        startTime,
      }
    );

    // Track cost in budget
    if (parseFloat(costEstimate) > 0) {
      await trackCost(task.orgId, costEstimate);
    }

    // Create usage record with actual provider used (for analytics)
    const org = await storage.getOrg(task.orgId);
    if (org) {
      await storage.createUsageRecord({
        orgId: task.orgId,
        userId: org.ownerUserId,
        provider: response.usedProvider,
        model: run.model,
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        estimatedCostUsd: costEstimate,
        metadata: {
          agentRunId: task.runId,
          originalProvider: run.provider,
          attempts: response.attempts,
        },
      });
    }

    this.emit("log", task.runId, {
      type: "success",
      message: `Agent run completed. Cost: $${costEstimate}`,
    });

    await storage.createAuditLog({
      orgId: task.orgId,
      userId: null,
      action: "agent_run_completed",
      target: task.runId,
      detailJson: { 
        provider: run.provider, 
        usedProvider: response.usedProvider,
        model: run.model, 
        costEstimate,
        attempts: response.attempts,
      },
    });
  }
}

export const orchestratorQueue = new OrchestratorQueue();
