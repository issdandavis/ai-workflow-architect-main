import Layout from "@/components/dashboard/Layout";
import AgentCard from "@/components/dashboard/AgentCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import CommandInput from "@/components/dashboard/CommandInput";
import IntegrationStatus from "@/components/dashboard/IntegrationStatus";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Zap, Users, DollarSign, MessageSquare } from "lucide-react";

interface DashboardStats {
  usage: {
    totalTokens: number;
    totalCostUsd: number;
    periodDays: number;
  };
  integrations: {
    total: number;
    connected: number;
  };
  roundtables: {
    total: number;
    active: number;
  };
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const agents = [
    { name: "Claude 3.5", role: "Code Architect", status: "idle" as const, icon: "claude" as const, tasksCompleted: stats?.roundtables?.total || 0 },
    { name: "ChatGPT-4o", role: "Documentation Lead", status: "idle" as const, icon: "gpt" as const, tasksCompleted: 0 },
    { name: "Grok Beta", role: "Research Analyst", status: "idle" as const, icon: "grok" as const, tasksCompleted: 0 },
  ];

  const statCards = [
    {
      label: "Tokens Used",
      value: stats ? formatTokens(stats.usage.totalTokens) : "0",
      sublabel: "Last 30 days",
      icon: Zap,
      color: "text-cyan-400",
    },
    {
      label: "AI Spend",
      value: stats ? formatCost(stats.usage.totalCostUsd) : "$0.00",
      sublabel: "Last 30 days",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Integrations",
      value: stats ? `${stats.integrations.connected}/${stats.integrations.total}` : "0/0",
      sublabel: "Connected",
      icon: Users,
      color: "text-purple-400",
    },
    {
      label: "Roundtables",
      value: stats ? stats.roundtables.total.toString() : "0",
      sublabel: `${stats?.roundtables?.active || 0} active`,
      icon: MessageSquare,
      color: "text-orange-400",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 text-glow" data-testid="dashboard-title">Command Deck</h1>
            <p className="text-muted-foreground">Orchestrating multi-agent collaboration across your stack.</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono flex items-center gap-2" data-testid="system-status">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              SYSTEM OPTIMAL
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 rounded-xl"
              data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{statsLoading ? "..." : stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>

        {/* Integration Status Bar */}
        <IntegrationStatus />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          
          {/* Left Column: Agents */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <AgentCard {...agent} />
                </motion.div>
              ))}
            </div>

            <div className="glass-panel p-6 rounded-2xl min-h-[300px]">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full" />
                Active Workflows
              </h2>
              <div className="relative h-48 border border-white/10 rounded-xl bg-black/20 overflow-hidden flex items-center justify-center">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                 
                 <div className="flex items-center gap-8 relative z-10">
                    <div className="p-4 rounded-xl bg-card border border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.2)] flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">G</div>
                      <span className="text-xs font-mono">GitHub</span>
                    </div>
                    <div className="h-[2px] w-16 bg-gradient-to-r from-primary/50 to-purple-500/50 animate-pulse relative">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">Z</div>
                      <span className="text-xs font-mono">Zapier</span>
                    </div>
                    <div className="h-[2px] w-16 bg-gradient-to-r from-purple-500/50 to-blue-500/50 animate-pulse relative">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">N</div>
                      <span className="text-xs font-mono">Notion</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column: Feed & Input */}
          <div className="space-y-6 flex flex-col">
            <ActivityFeed />
            <div className="mt-auto">
              <CommandInput />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
