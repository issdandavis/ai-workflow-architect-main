import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface AuditLog {
  id: string;
  createdAt: string;
  action: string;
  target: string | null;
  detailJson: any;
  userId: string | null;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getLogType(action: string): "info" | "success" | "warning" | "error" {
  if (action.includes("error") || action.includes("failed")) return "error";
  if (action.includes("warning") || action.includes("limit")) return "warning";
  if (action.includes("completed") || action.includes("approved") || action.includes("connected") || action.includes("created")) return "success";
  return "info";
}

function getAgentName(action: string): string {
  if (action.includes("roundtable")) return "Roundtable";
  if (action.includes("assistant") || action.includes("chat")) return "Assistant";
  if (action.includes("integration")) return "Integrations";
  if (action.includes("stripe") || action.includes("payment") || action.includes("checkout")) return "Stripe";
  if (action.includes("decision") || action.includes("approval")) return "Approvals";
  if (action.includes("credential") || action.includes("vault")) return "Vault";
  if (action.includes("agent") || action.includes("run")) return "Agent";
  if (action.includes("usage") || action.includes("budget") || action.includes("cost")) return "Usage";
  if (action.includes("project")) return "Projects";
  if (action.includes("user") || action.includes("login") || action.includes("signup")) return "Auth";
  if (action.includes("memory")) return "Memory";
  if (action.includes("code") || action.includes("proposal") || action.includes("improvement")) return "Code";
  if (action.includes("api_key")) return "API Keys";
  return "System";
}

function formatMessage(action: string, target: string | null, detail: any): string {
  const targetDisplay = target ? (target.length > 20 ? target.slice(0, 20) + "..." : target) : "";
  
  const actionMap: Record<string, string> = {
    // Assistant actions
    "assistant_chat": `Processed chat in ${target || "dashboard"}`,
    
    // Integration actions
    "integration_connected": `Connected ${target || "integration"}`,
    "integration_disconnected": `Disconnected ${target || "integration"}`,
    
    // Credential/vault actions
    "credential_stored": `Stored API key for ${target || "provider"}`,
    "credential_deleted": `Removed credential`,
    "credential_tested": `Tested API key for ${target || "provider"}`,
    
    // Decision/approval actions
    "decision_approved": `Approved decision${targetDisplay ? ` ${targetDisplay}` : ""}`,
    "decision_rejected": `Rejected decision${targetDisplay ? ` ${targetDisplay}` : ""}`,
    
    // Roundtable actions
    "roundtable_session_created": `Created roundtable session`,
    "roundtable_message_added": `Added message to roundtable`,
    "roundtable_completed": `Completed roundtable session`,
    
    // Code improvement actions
    "code_analysis_started": `Started code analysis`,
    "code_analysis_completed": `Completed code analysis`,
    "proposal_created": `Created improvement proposal`,
    "proposal_approved": `Approved proposal`,
    "proposal_rejected": `Rejected proposal`,
    "improvement_applied": `Applied code improvement`,
    
    // Agent run actions
    "agent_run_started": `Started agent run${targetDisplay ? ` for ${targetDisplay}` : ""}`,
    "agent_run_completed": `Completed agent run`,
    "agent_run_failed": `Agent run failed`,
    "agent_run_cancelled": `Cancelled agent run`,
    
    // Usage/billing actions
    "usage_recorded": `Recorded usage for ${target || "AI provider"}`,
    "budget_warning": `Budget warning triggered`,
    "budget_exceeded": `Budget limit exceeded`,
    
    // Project actions
    "project_created": `Created project ${targetDisplay}`,
    "project_updated": `Updated project ${targetDisplay}`,
    "project_deleted": `Deleted project`,
    
    // User actions
    "user_login": `User logged in`,
    "user_logout": `User logged out`,
    "user_signup": `New user registered`,
    
    // Memory actions
    "memory_added": `Added memory item`,
    "memory_deleted": `Removed memory item`,
    
    // API actions
    "api_key_created": `Created API key`,
    "api_key_revoked": `Revoked API key`,
  };
  
  if (actionMap[action]) {
    return actionMap[action];
  }
  
  // Fallback: format the action nicely
  const formatted = action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return targetDisplay ? `${formatted}: ${targetDisplay}` : formatted;
}

const placeholderLogs = [
  { id: "1", timestamp: "10:42:05", agent: "System", message: "Waiting for activity...", type: "info" as const },
];

export default function ActivityFeed() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const formattedLogs = logs.length > 0 
    ? logs.slice(0, 20).map(log => ({
        id: log.id,
        timestamp: formatTime(log.createdAt),
        agent: getAgentName(log.action),
        message: formatMessage(log.action, log.target, log.detailJson),
        type: getLogType(log.action),
      }))
    : placeholderLogs;

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[400px]" data-testid="activity-feed">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Live Activity Feed</h3>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 font-mono text-sm">
            {formattedLogs.map((log) => (
              <div key={log.id} className="flex gap-3 group" data-testid={`activity-log-${log.id}`}>
                <div className="w-16 text-xs text-muted-foreground pt-0.5">{log.timestamp}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded",
                      log.type === "info" && "bg-blue-500/10 text-blue-400",
                      log.type === "success" && "bg-green-500/10 text-green-400",
                      log.type === "warning" && "bg-yellow-500/10 text-yellow-400",
                      log.type === "error" && "bg-red-500/10 text-red-400",
                    )}>
                      {log.agent}
                    </span>
                    {log.type === "success" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    {log.type === "warning" && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                    {log.type === "info" && <span className="text-primary mr-2">{">"}</span>}
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
            <div className="h-4 w-2 bg-primary animate-pulse" />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
