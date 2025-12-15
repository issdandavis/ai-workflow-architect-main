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
  Shield
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
    </Layout>
  );
}
