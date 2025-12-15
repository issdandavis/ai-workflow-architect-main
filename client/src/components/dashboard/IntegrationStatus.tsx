import { Github, Database, Cloud, Zap, Globe, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Integration {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "syncing";
  metadataJson?: any;
  createdAt?: string;
}

const providerIcons: Record<string, React.ElementType> = {
  github: Github,
  notion: Database,
  zapier: Zap,
  perplexity: Globe,
  google_drive: Cloud,
  onedrive: HardDrive,
  dropbox: Cloud,
};

const providerNames: Record<string, string> = {
  github: "GitHub",
  notion: "Notion",
  zapier: "Zapier",
  perplexity: "Perplexity",
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  anthropic: "Claude",
  openai: "OpenAI",
  xai: "Grok",
};

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function IntegrationStatus() {
  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const defaultIntegrations: Integration[] = [
    { id: "default-github", provider: "github", status: "disconnected" },
    { id: "default-notion", provider: "notion", status: "disconnected" },
    { id: "default-google_drive", provider: "google_drive", status: "disconnected" },
    { id: "default-zapier", provider: "zapier", status: "disconnected" },
  ];

  const displayIntegrations = integrations.length > 0 
    ? integrations.slice(0, 4) 
    : defaultIntegrations;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 rounded-xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-16 bg-white/10 rounded mb-1" />
                <div className="h-3 w-12 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="integration-status-grid">
      {displayIntegrations.map((item) => {
        const Icon = providerIcons[item.provider] || Globe;
        const name = providerNames[item.provider] || item.provider;
        const lastSync = formatTimeAgo(item.createdAt);
        
        return (
          <div 
            key={item.id} 
            className="glass-card p-4 rounded-xl flex items-center justify-between group cursor-pointer border-white/5 hover:border-primary/30"
            data-testid={`integration-card-${item.provider}`}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-white/5 text-muted-foreground group-hover:text-primary transition-colors",
                item.status === "syncing" && "animate-pulse bg-primary/10 text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.status === "connected" ? lastSync : "Not connected"}
                </div>
              </div>
            </div>
            
            <div className={cn(
              "w-2 h-2 rounded-full",
              item.status === "connected" && "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]",
              item.status === "syncing" && "bg-blue-500 animate-ping",
              item.status === "disconnected" && "bg-red-500"
            )} />
          </div>
        );
      })}
    </div>
  );
}
