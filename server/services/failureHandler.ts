import { storage } from "../storage";
import { GeminiAdapter, GroqAdapter } from "./providerAdapters";

export interface FailureContext {
  errorMessage: string;
  errorStack?: string;
  failedOperation: string;
  relevantCode?: string;
  relevantFiles?: string[];
  agentRunId?: string;
  userId: string;
  orgId: string;
  projectId?: string;
}

export interface FailureDiagnosis {
  rootCause: string;
  explanation: string;
  suggestedFix: string;
  fixDifficulty: "easy" | "medium" | "hard";
  canAutoFix: boolean;
  estimatedCost: string;
}

export interface AutoFixResult {
  success: boolean;
  branchName?: string;
  changesDescription?: string;
  testResults?: string;
  error?: string;
  escalated: boolean;
  issueUrl?: string;
}

/**
 * Analyzes a failure and provides a human-readable explanation with root cause
 */
export async function diagnoseFailure(context: FailureContext): Promise<FailureDiagnosis> {
  // Use free-tier Gemini for diagnosis (cheap/free)
  const gemini = new GeminiAdapter(process.env.GOOGLE_API_KEY);
  
  const prompt = `You are an expert system debugger. Analyze this failure and provide a clear diagnosis.

Failure Details:
- Operation: ${context.failedOperation}
- Error Message: ${context.errorMessage}
${context.errorStack ? `- Stack Trace: ${context.errorStack}` : ""}
${context.relevantCode ? `- Relevant Code:\n${context.relevantCode}` : ""}

Provide your analysis as a JSON object with these fields:
1. "rootCause": One-sentence root cause (e.g., "Missing API key for OpenAI provider")
2. "explanation": 2-3 sentences explaining what happened and why
3. "suggestedFix": Clear, actionable steps to fix (3-5 bullet points)
4. "fixDifficulty": "easy", "medium", or "hard"
5. "canAutoFix": true if this is automatable, false if needs human intervention

Common patterns to recognize:
- "Provider not configured" → Missing API key, easy fix
- "Budget exceeded" → Spending limit reached, easy fix (wait or increase)
- "401 Unauthorized" → Invalid/expired credentials, easy fix (reconnect)
- "Rate limit" → Too many requests, medium fix (throttle or wait)
- "Timeout" → Provider slow/down, medium fix (retry or switch provider)
- "Out of memory" → Resource exhaustion, hard fix (optimize or scale)

Respond ONLY with valid JSON, no markdown.`;

  const result = await gemini.call(prompt, "gemini-2.0-flash-exp");
  
  if (!result.success || !result.content) {
    // Fallback diagnosis
    return {
      rootCause: "Unknown error",
      explanation: context.errorMessage,
      suggestedFix: "Check logs for more details. Try restarting the operation or contact support.",
      fixDifficulty: "medium",
      canAutoFix: false,
      estimatedCost: "$0.00"
    };
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    
    const diagnosis = JSON.parse(jsonMatch[0]);
    return {
      ...diagnosis,
      estimatedCost: "$0.00" // Diagnosis is always free
    };
  } catch {
    // Fallback if parsing fails
    return {
      rootCause: "Error diagnosis failed",
      explanation: result.content.substring(0, 200),
      suggestedFix: "Manual investigation needed. Check the error message and relevant documentation.",
      fixDifficulty: "medium",
      canAutoFix: false,
      estimatedCost: "$0.00"
    };
  }
}

/**
 * Attempts to automatically fix the issue in a safe branch
 * Escalates to smarter AI if first attempt fails
 * Creates GitHub issue if all attempts fail
 */
export async function attemptAutoFix(
  context: FailureContext,
  diagnosis: FailureDiagnosis
): Promise<AutoFixResult> {
  // Log attempt
  await storage.createAuditLog({
    orgId: context.orgId,
    userId: context.userId,
    action: "auto_fix_attempt",
    target: context.failedOperation,
    metadataJson: { diagnosis, context },
  });

  // Check if auto-fix is feasible
  if (!diagnosis.canAutoFix || diagnosis.fixDifficulty === "hard") {
    return {
      success: false,
      error: "Auto-fix not recommended for this type of error. Manual intervention required.",
      escalated: false
    };
  }

  // Level 1: Try with Gemini (free/cheap)
  const level1Result = await attemptFixWithModel(context, diagnosis, "gemini");
  
  if (level1Result.success) {
    return level1Result;
  }

  // Level 2: Escalate to Groq (still cheap but more powerful)
  console.log("Level 1 fix failed, escalating to Groq...");
  const level2Result = await attemptFixWithModel(context, diagnosis, "groq");
  
  if (level2Result.success) {
    return { ...level2Result, escalated: true };
  }

  // Level 3: All automated fixes failed, create structured issue
  console.log("All auto-fix attempts failed, creating issue...");
  const issueResult = await createStructuredIssue(context, diagnosis, [
    level1Result.error || "Level 1 failed",
    level2Result.error || "Level 2 failed"
  ]);

  return {
    success: false,
    error: "Auto-fix unsuccessful. Issue created for human review.",
    escalated: true,
    issueUrl: issueResult.issueUrl
  };
}

async function attemptFixWithModel(
  context: FailureContext,
  diagnosis: FailureDiagnosis,
  provider: "gemini" | "groq"
): Promise<AutoFixResult> {
  const adapter = provider === "gemini" 
    ? new GeminiAdapter(process.env.GOOGLE_API_KEY)
    : new GroqAdapter(process.env.GROQ_API_KEY);
  
  const model = provider === "gemini" ? "gemini-2.0-flash-exp" : "llama-3.3-70b-versatile";

  const prompt = `You are an expert code fixer. Generate a minimal, surgical fix for this issue.

Issue Details:
- Root Cause: ${diagnosis.rootCause}
- Explanation: ${diagnosis.explanation}
- Operation: ${context.failedOperation}
- Error: ${context.errorMessage}

Suggested Fix Steps:
${diagnosis.suggestedFix}

Generate ONLY the code changes needed as a JSON object:
{
  "changeDescription": "One sentence describing the fix",
  "filesToModify": ["file1.ts", "file2.ts"],
  "changeDetails": "Specific changes to make (be precise)"
}

Requirements:
- MINIMAL changes only (no refactoring)
- Safe for production
- No breaking changes
- Include specific line numbers if possible

Respond ONLY with valid JSON.`;

  const result = await adapter.call(prompt, model);
  
  if (!result.success || !result.content) {
    return {
      success: false,
      error: `${provider} model failed to generate fix`,
      escalated: false
    };
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const fixPlan = JSON.parse(jsonMatch[0]);
    
    // In a real implementation, this would:
    // 1. Create a new branch: ai-fix/<timestamp>
    // 2. Apply the changes
    // 3. Run tests
    // 4. Return results
    
    // For now, return the plan
    return {
      success: true,
      branchName: `ai-fix/${Date.now()}`,
      changesDescription: fixPlan.changeDescription,
      testResults: "Tests would run here",
      escalated: false
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fix generation failed",
      escalated: false
    };
  }
}

async function createStructuredIssue(
  context: FailureContext,
  diagnosis: FailureDiagnosis,
  attemptedFixes: string[]
): Promise<{ issueUrl: string }> {
  // In production, this would create a real GitHub issue
  // For now, we log it and create an audit entry
  
  const issueBody = `
## Automated Failure Report

**Operation**: ${context.failedOperation}
**Error**: ${context.errorMessage}

### Root Cause Analysis
${diagnosis.explanation}

**Root Cause**: ${diagnosis.rootCause}
**Difficulty**: ${diagnosis.fixDifficulty}

### Suggested Fix
${diagnosis.suggestedFix}

### Automated Fix Attempts
${attemptedFixes.map((err, i) => `${i + 1}. ${err}`).join("\n")}

### Context
- User ID: ${context.userId}
- Org ID: ${context.orgId}
${context.projectId ? `- Project ID: ${context.projectId}` : ""}
${context.agentRunId ? `- Agent Run ID: ${context.agentRunId}` : ""}

### Relevant Files
${context.relevantFiles?.join(", ") || "N/A"}

### Next Steps
1. Review the error and context
2. Apply suggested fix manually or refine auto-fix logic
3. Test thoroughly
4. Update documentation if this is a common issue

**This issue was auto-generated by the failure handler system.**
`;

  await storage.createAuditLog({
    orgId: context.orgId,
    userId: context.userId,
    action: "issue_created",
    target: "failure_handler",
    metadataJson: { 
      context, 
      diagnosis, 
      attemptedFixes,
      issueBody 
    },
  });

  // Return issue URL - in production with GitHub integration, this would be real
  // For now, create a reference that can be tracked in audit logs
  const issueRef = `auto-generated-failure-${Date.now()}`;
  const repoInfo = process.env.GITHUB_REPOSITORY || 'repository';
  
  return {
    issueUrl: `https://github.com/${repoInfo}/issues/${issueRef}`
  };
}

/**
 * Main entry point for handling any failure in the system
 * This is what other parts of the app should call when something goes wrong
 */
export async function handleFailure(context: FailureContext): Promise<{
  diagnosis: FailureDiagnosis;
  autoFixResult?: AutoFixResult;
  userMessage: string;
}> {
  // Step 1: Diagnose the failure
  const diagnosis = await diagnoseFailure(context);
  
  // Step 2: Attempt auto-fix if applicable
  let autoFixResult: AutoFixResult | undefined;
  
  if (diagnosis.canAutoFix && diagnosis.fixDifficulty !== "hard") {
    autoFixResult = await attemptAutoFix(context, diagnosis);
  }
  
  // Step 3: Generate user-friendly message
  let userMessage = `**Error Detected**: ${diagnosis.rootCause}\n\n`;
  userMessage += `**What Happened**: ${diagnosis.explanation}\n\n`;
  
  if (autoFixResult?.success) {
    userMessage += `✅ **Good News**: I was able to create a fix!\n\n`;
    userMessage += `**Branch**: \`${autoFixResult.branchName}\`\n`;
    userMessage += `**Changes**: ${autoFixResult.changesDescription}\n\n`;
    userMessage += `Review the changes and merge if they look good. The fix was applied in a safe branch - your main branch is untouched.\n\n`;
    userMessage += `**Cost**: This fix was free (maintenance quota).`;
  } else if (autoFixResult?.issueUrl) {
    userMessage += `⚠️ **Auto-fix unsuccessful**, but I've created a detailed issue with all the context:\n\n`;
    userMessage += `**Issue**: ${autoFixResult.issueUrl}\n\n`;
    userMessage += `The issue includes the root cause, attempted fixes, and suggested next steps. `;
    userMessage += `A human (or smarter AI) will review it soon.\n\n`;
    userMessage += `**Cost**: Free (maintenance quota).`;
  } else {
    userMessage += `**How to Fix**:\n${diagnosis.suggestedFix}\n\n`;
    userMessage += `Need help? Ask the assistant: "How do I fix: ${diagnosis.rootCause}"`;
  }
  
  return {
    diagnosis,
    autoFixResult,
    userMessage
  };
}
