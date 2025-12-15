import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Github, 
  Database, 
  Zap, 
  Globe, 
  HardDrive, 
  LayoutTemplate, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Key,
  Loader2,
  AlertCircle,
  Sparkles,
  Bot,
  Brain,
  ExternalLink,
  Shield,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderCredential {
  id: string;
  provider: string;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ProviderConfig {
  name: string;
  label: string;
  keyPrefix: string;
}

interface CredentialsResponse {
  credentials: ProviderCredential[];
  supportedProviders: ProviderConfig[];
}

interface ZapierWebhook {
  id: string;
  event: string;
  targetUrl: string;
  isActive: boolean;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

const ZAPIER_EVENTS = [
  { value: "user.created", label: "User Created" },
  { value: "project.created", label: "Project Created" },
  { value: "agent_run.completed", label: "Agent Run Completed" },
  { value: "roundtable.message", label: "Roundtable Message" },
  { value: "workflow.completed", label: "Workflow Completed" },
  { value: "integration.connected", label: "Integration Connected" },
];

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split(".");
    if (hostParts.length > 1) {
      return `${parsed.protocol}//${hostParts[0]}...${hostParts[hostParts.length - 1]}${parsed.pathname.slice(0, 10)}...`;
    }
    return `${parsed.protocol}//${parsed.hostname.slice(0, 10)}...`;
  } catch {
    return url.slice(0, 20) + "...";
  }
}

const AI_PROVIDERS = [
  { 
    name: "openai", 
    label: "OpenAI", 
    icon: Sparkles, 
    color: "text-emerald-400",
    description: "GPT-4, GPT-3.5 Turbo, and DALL-E models for powerful AI assistance.",
    keyHint: "Starts with sk-...",
    docsUrl: "https://platform.openai.com/api-keys"
  },
  { 
    name: "anthropic", 
    label: "Anthropic", 
    icon: Brain, 
    color: "text-orange-400",
    description: "Claude 3 family of models - Opus, Sonnet, and Haiku for advanced reasoning.",
    keyHint: "Starts with sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys"
  },
  { 
    name: "perplexity", 
    label: "Perplexity", 
    icon: Globe, 
    color: "text-blue-400",
    description: "Real-time web search with AI-powered research and citations.",
    keyHint: "Starts with pplx-...",
    docsUrl: "https://www.perplexity.ai/settings/api"
  },
  { 
    name: "xai", 
    label: "xAI / Grok", 
    icon: Bot, 
    color: "text-purple-400",
    description: "Grok models from xAI for creative and analytical tasks.",
    keyHint: "Starts with xai-...",
    docsUrl: "https://x.ai/api"
  },
  { 
    name: "google", 
    label: "Google AI", 
    icon: Sparkles, 
    color: "text-yellow-400",
    description: "Gemini models for multimodal AI capabilities.",
    keyHint: "API key from Google AI Studio",
    docsUrl: "https://aistudio.google.com/app/apikey"
  },
];

const MARKETPLACE_LINKS = [
  { 
    name: "Jam.dev", 
    description: "1-click bug reporting with auto-captured logs and screen recordings",
    url: "https://jam.dev",
    category: "Bug Reporting"
  },
  { 
    name: "Proton Mail", 
    description: "Secure, encrypted email with 2FA and QR code sign-in",
    url: "https://proton.me/mail",
    category: "Secure Email"
  },
  { 
    name: "Zapier", 
    description: "Automate workflows across 5,000+ apps",
    url: "https://zapier.com",
    category: "Automation"
  },
  { 
    name: "Linear", 
    description: "Issue tracking for modern software teams",
    url: "https://linear.app",
    category: "Project Management"
  },
  { 
    name: "Figma", 
    description: "Collaborative design tool for teams",
    url: "https://figma.com",
    category: "Design"
  },
];

const OTHER_SERVICES = [
  { 
    name: "GitHub", 
    icon: Github, 
    category: "Version Control", 
    status: "disconnected", 
    description: "Sync repositories and enable AI code reviews." 
  },
  { 
    name: "Notion", 
    icon: Database, 
    category: "Knowledge Base", 
    status: "disconnected", 
    description: "Access workspaces for documentation and task management." 
  },
  { 
    name: "Zapier", 
    icon: Zap, 
    category: "Automation", 
    status: "disconnected", 
    description: "Trigger workflows across 5,000+ apps." 
  },
  { 
    name: "Google Drive", 
    icon: HardDrive, 
    category: "Storage", 
    status: "disconnected", 
    description: "Secure access to documents and assets." 
  },
  { 
    name: "Dropbox", 
    icon: HardDrive, 
    category: "Storage", 
    status: "disconnected", 
    description: "Backup and file sharing synchronization." 
  },
  { 
    name: "Stripe", 
    icon: LayoutTemplate, 
    category: "Payments", 
    status: "disconnected", 
    description: "Process payments and manage subscriptions." 
  },
];

export default function Integrations() {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof AI_PROVIDERS[0] | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [testResult, setTestResult] = useState<{ valid?: boolean; error?: string; models?: string[] } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const [zapierApiKey, setZapierApiKey] = useState<string | null>(null);
  const [showZapierKey, setShowZapierKey] = useState(false);
  const [addWebhookDialogOpen, setAddWebhookDialogOpen] = useState(false);
  const [newWebhookEvent, setNewWebhookEvent] = useState<string>("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  
  const queryClient = useQueryClient();

  const { data: credentialsData, isLoading } = useQuery<CredentialsResponse>({
    queryKey: ["vault-credentials"],
    queryFn: async () => {
      const res = await fetch("/api/vault/credentials", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch credentials");
      return res.json();
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      const res = await fetch("/api/vault/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, apiKey }),
      });
      return res.json();
    },
  });

  const saveKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey, label }: { provider: string; apiKey: string; label?: string }) => {
      const res = await fetch("/api/vault/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, apiKey, label }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-credentials"] });
      handleCloseDialog();
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vault/credentials/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-credentials"] });
    },
  });

  const { data: zapierWebhooks, isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useQuery<ZapierWebhook[]>({
    queryKey: ["zapier-webhooks", zapierApiKey],
    queryFn: async () => {
      if (!zapierApiKey) return [];
      const res = await fetch("/api/zapier/hooks", {
        headers: { "x-api-key": zapierApiKey },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setZapierApiKey(null);
          return [];
        }
        throw new Error("Failed to fetch webhooks");
      }
      return res.json();
    },
    enabled: !!zapierApiKey,
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/zapier/apikey/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate API key");
      return res.json();
    },
    onSuccess: (data) => {
      setZapierApiKey(data.key);
    },
  });

  const subscribeWebhookMutation = useMutation({
    mutationFn: async ({ event, targetUrl }: { event: string; targetUrl: string }) => {
      if (!zapierApiKey) throw new Error("No API key");
      const res = await fetch("/api/zapier/hooks/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": zapierApiKey,
        },
        body: JSON.stringify({ event, targetUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapier-webhooks"] });
      setAddWebhookDialogOpen(false);
      setNewWebhookEvent("");
      setNewWebhookUrl("");
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!zapierApiKey) throw new Error("No API key");
      const res = await fetch(`/api/zapier/hooks/${id}`, {
        method: "DELETE",
        headers: { "x-api-key": zapierApiKey },
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapier-webhooks"] });
    },
  });

  const handleGenerateApiKey = async () => {
    await generateApiKeyMutation.mutateAsync();
  };

  const handleCopyApiKey = () => {
    if (zapierApiKey) {
      navigator.clipboard.writeText(zapierApiKey);
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookEvent || !newWebhookUrl.trim()) return;
    await subscribeWebhookMutation.mutateAsync({
      event: newWebhookEvent,
      targetUrl: newWebhookUrl.trim(),
    });
  };

  const handleDeleteWebhook = async (id: string) => {
    if (confirm("Are you sure you want to delete this webhook subscription?")) {
      await deleteWebhookMutation.mutateAsync(id);
    }
  };

  const getProviderStatus = (providerName: string) => {
    const cred = credentialsData?.credentials.find(c => c.provider === providerName);
    return cred ? "connected" : "disconnected";
  };

  const getProviderCredential = (providerName: string) => {
    return credentialsData?.credentials.find(c => c.provider === providerName);
  };

  const handleOpenConnect = (provider: typeof AI_PROVIDERS[0]) => {
    setSelectedProvider(provider);
    setApiKey("");
    setKeyLabel("");
    setTestResult(null);
    setConnectDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setConnectDialogOpen(false);
    setSelectedProvider(null);
    setApiKey("");
    setKeyLabel("");
    setTestResult(null);
  };

  const handleTestKey = async () => {
    if (!selectedProvider || !apiKey.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    
    const result = await testKeyMutation.mutateAsync({ 
      provider: selectedProvider.name, 
      apiKey: apiKey.trim() 
    });
    
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSaveKey = async () => {
    if (!selectedProvider || !apiKey.trim() || !testResult?.valid) return;
    await saveKeyMutation.mutateAsync({
      provider: selectedProvider.name,
      apiKey: apiKey.trim(),
      label: keyLabel.trim() || undefined,
    });
  };

  const canSave = testResult?.valid === true;

  const handleDisconnect = async (credential: ProviderCredential) => {
    if (confirm(`Are you sure you want to disconnect ${credential.provider}? This will delete your API key.`)) {
      await deleteKeyMutation.mutateAsync(credential.id);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-glow">Integration Hub</h1>
            <p className="text-muted-foreground">Connect AI providers and external services to power your workflows.</p>
          </div>
          <Button 
            className="bg-white/10 hover:bg-white/20 text-white gap-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["vault-credentials"] })}
            data-testid="refresh-status-btn"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> 
            Refresh Status
          </Button>
        </div>

        {/* AI Providers Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            AI Providers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_PROVIDERS.map((provider) => {
              const status = getProviderStatus(provider.name);
              const credential = getProviderCredential(provider.name);
              const Icon = provider.icon;

              return (
                <div 
                  key={provider.name} 
                  className="glass-panel p-6 rounded-2xl border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden"
                  data-testid={`provider-card-${provider.name}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-white/5 transition-colors", provider.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "capitalize border",
                        status === "connected" && "bg-green-500/10 text-green-500 border-green-500/20",
                        status === "disconnected" && "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      )}
                      data-testid={`provider-status-${provider.name}`}
                    >
                      {status === "connected" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-6">
                    <h3 className="font-bold text-lg">{provider.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {provider.description}
                    </p>
                  </div>

                  {credential && (
                    <div className="text-xs text-muted-foreground mb-4">
                      {credential.lastUsedAt && (
                        <span>Last used: {new Date(credential.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <a 
                      href={provider.docsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                    {status === "disconnected" ? (
                      <Button 
                        size="sm" 
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleOpenConnect(provider)}
                        data-testid={`connect-btn-${provider.name}`}
                      >
                        Connect
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenConnect(provider)}
                          data-testid={`update-btn-${provider.name}`}
                        >
                          Update
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => credential && handleDisconnect(credential)}
                          disabled={deleteKeyMutation.isPending}
                          data-testid={`disconnect-btn-${provider.name}`}
                        >
                          {deleteKeyMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zapier Integration Section */}
        <div data-testid="zapier-integration-section">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Zapier Integration
          </h2>
          <div className="glass-panel p-6 rounded-2xl border-white/5">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Webhook Automation</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your workflows to Zapier and automate across 5,000+ apps.
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "capitalize border",
                  zapierApiKey ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                )}
                data-testid="zapier-connection-status"
              >
                {zapierApiKey && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {zapierApiKey ? "connected" : "disconnected"}
              </Badge>
            </div>

            {/* API Key Section */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">API Key</Label>
                {zapierApiKey && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowZapierKey(!showZapierKey)}
                      data-testid="toggle-zapier-key-visibility"
                    >
                      {showZapierKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyApiKey}
                      data-testid="copy-zapier-key"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {zapierApiKey ? (
                <div className="font-mono text-sm bg-black/20 p-3 rounded-lg break-all" data-testid="zapier-api-key-display">
                  {showZapierKey ? zapierApiKey : "••••••••••••••••••••••••••••••••"}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate an API key to start using Zapier webhooks.
                  </p>
                  <Button
                    onClick={handleGenerateApiKey}
                    disabled={generateApiKeyMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="generate-zapier-key"
                  >
                    {generateApiKeyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Generate API Key
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Webhook Subscriptions */}
            {zapierApiKey && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Webhook Subscriptions</h4>
                  <Button
                    size="sm"
                    onClick={() => setAddWebhookDialogOpen(true)}
                    className="gap-1"
                    data-testid="add-webhook-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add Webhook
                  </Button>
                </div>

                {isLoadingWebhooks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : zapierWebhooks && zapierWebhooks.length > 0 ? (
                  <div className="space-y-3">
                    {zapierWebhooks.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                        data-testid={`webhook-item-${webhook.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm" data-testid={`webhook-event-${webhook.id}`}>
                              {ZAPIER_EVENTS.find(e => e.value === webhook.event)?.label || webhook.event}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                webhook.isActive 
                                  ? "bg-green-500/10 text-green-400 border-green-500/20" 
                                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                              )}
                              data-testid={`webhook-status-${webhook.id}`}
                            >
                              {webhook.isActive ? "active" : "inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" data-testid={`webhook-url-${webhook.id}`}>
                            {maskUrl(webhook.targetUrl)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`webhook-trigger-count-${webhook.id}`}>
                            Triggered {webhook.triggerCount} time{webhook.triggerCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={deleteWebhookMutation.isPending}
                          data-testid={`delete-webhook-${webhook.id}`}
                        >
                          {deleteWebhookMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-webhooks-message">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No webhook subscriptions yet.</p>
                    <p className="text-xs mt-1">Add a webhook to start receiving events.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Integration Marketplace Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Integration Marketplace
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MARKETPLACE_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel p-6 rounded-2xl border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden cursor-pointer"
                data-testid={`marketplace-card-${link.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white/5 text-primary">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {link.category}
                  </Badge>
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {link.name}
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {link.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{link.category}</span>
                  <span className="text-xs text-primary group-hover:underline">Visit Site →</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Other Services Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Other Services
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
            {OTHER_SERVICES.map((service) => (
              <div 
                key={service.name} 
                className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white/5 text-foreground">
                    <service.icon className="w-6 h-6" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className="capitalize border bg-gray-500/10 text-gray-400 border-gray-500/20"
                  >
                    {service.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{service.category}</span>
                  <Button size="sm" variant="outline" disabled>
                    Coming Soon
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect Provider Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {selectedProvider && (
                <>
                  <selectedProvider.icon className={cn("w-5 h-5", selectedProvider.color)} />
                  Connect {selectedProvider.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your API key to connect this provider. Your key is encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-white">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={selectedProvider?.keyHint || "Enter API key..."}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="api-key-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyLabel" className="text-white">Label (optional)</Label>
              <Input
                id="keyLabel"
                placeholder="e.g., Personal, Work, Project X..."
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="key-label-input"
              />
            </div>

            {testResult && (
              <div className={cn(
                "p-3 rounded-lg flex items-start gap-2",
                testResult.valid ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
              )} data-testid="test-result">
                {testResult.valid ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">API key is valid!</p>
                      {testResult.models && testResult.models.length > 0 && (
                        <p className="text-sm opacity-80 mt-1">
                          Available models: {testResult.models.slice(0, 3).join(", ")}
                          {testResult.models.length > 3 && "..."}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Invalid API key</p>
                      <p className="text-sm opacity-80 mt-1">{testResult.error}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Keys are encrypted with AES-256-GCM before storage</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTestKey}
              disabled={!apiKey.trim() || isTesting}
              data-testid="test-key-btn"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Key"
              )}
            </Button>
            <Button
              onClick={handleSaveKey}
              disabled={!canSave || saveKeyMutation.isPending}
              className="bg-primary text-primary-foreground"
              data-testid="save-key-btn"
            >
              {saveKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={addWebhookDialogOpen} onOpenChange={setAddWebhookDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md" data-testid="add-webhook-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-orange-400" />
              Add Webhook Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Subscribe to events and receive notifications at your webhook URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhookEvent" className="text-white">Event Type</Label>
              <Select value={newWebhookEvent} onValueChange={setNewWebhookEvent}>
                <SelectTrigger 
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="webhook-event-select"
                >
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ZAPIER_EVENTS.map((event) => (
                    <SelectItem 
                      key={event.value} 
                      value={event.value}
                      className="text-white hover:bg-gray-700"
                      data-testid={`webhook-event-option-${event.value}`}
                    >
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl" className="text-white">Target URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://hooks.zapier.com/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="webhook-url-input"
              />
              <p className="text-xs text-gray-500">
                The URL where webhook payloads will be sent.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddWebhookDialogOpen(false);
                setNewWebhookEvent("");
                setNewWebhookUrl("");
              }}
              data-testid="cancel-add-webhook"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWebhook}
              disabled={!newWebhookEvent || !newWebhookUrl.trim() || subscribeWebhookMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="confirm-add-webhook"
            >
              {subscribeWebhookMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Webhook"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
