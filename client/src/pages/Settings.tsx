import { useState, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Key, Trash2, Plus, Loader2, CheckCircle, AlertCircle, BarChart3, Download, AlertTriangle, Shield, Smartphone, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProviderConfig {
  name: string;
  label: string;
  keyPrefix: string;
}

interface Credential {
  id: string;
  provider: string;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UsageSummary {
  totalTokens: number;
  totalCostUsd: number;
  periodDays: number;
}

export default function Settings() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCredentials();
    loadUsage();
  }, []);

  async function loadCredentials() {
    try {
      const res = await fetch("/api/vault/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials);
        setProviders(data.supportedProviders);
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsage() {
    try {
      const res = await fetch("/api/vault/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data.summary);
      }
    } catch (err) {
      console.error("Failed to load usage:", err);
    }
  }

  async function handleAddCredential() {
    if (!selectedProvider || !apiKeyInput) {
      setError("Please select a provider and enter an API key");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/vault/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKeyInput,
          label: labelInput || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save credential");
      }

      setSuccess(`${selectedProvider} API key saved securely`);
      setAddDialogOpen(false);
      setSelectedProvider("");
      setApiKeyInput("");
      setLabelInput("");
      loadCredentials();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credential");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCredential(id: string, provider: string) {
    if (!confirm(`Delete ${provider} API key? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vault/credentials/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCredentials(credentials.filter((c) => c.id !== id));
        setSuccess(`${provider} API key deleted`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to delete credential");
    }
  }

  function getProviderLabel(name: string): string {
    const provider = providers.find((p) => p.name === name);
    return provider?.label || name;
  }

  async function handleExportData() {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/export");
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export data");
      }

      const blob = await res.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `orchestration-hub-export-${timestamp}.json`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess("Data exported successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-glow" data-testid="text-settings-title">
            System Configuration
          </h1>
          <p className="text-muted-foreground">
            Manage your API keys securely in the encrypted vault.
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-3 rounded-lg" data-testid="text-success">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg" data-testid="text-error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Usage (30 days)</h3>
              </div>
              {usage ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tokens</span>
                    <span data-testid="text-total-tokens">{usage.totalTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span data-testid="text-total-cost">${usage.totalCostUsd.toFixed(4)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No usage data yet</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">API Key Vault</h2>
                </div>

                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-credential">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add API Key</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                          <SelectTrigger data-testid="select-provider">
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter your API key"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          data-testid="input-api-key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label (optional)</Label>
                        <Input
                          placeholder="e.g., Production, Personal"
                          value={labelInput}
                          onChange={(e) => setLabelInput(e.target.value)}
                          data-testid="input-label"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleAddCredential}
                        disabled={saving}
                        data-testid="button-save-credential"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Encrypting...
                          </>
                        ) : (
                          "Save Securely"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : credentials.length === 0 ? (
                <div className="text-center py-8" data-testid="text-empty-vault">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No API keys stored</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your provider API keys to use them securely with AI agents.
                  </p>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-3" data-testid="container-credentials">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                      data-testid={`credential-${cred.provider}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Key className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{getProviderLabel(cred.provider)}</div>
                          <div className="text-xs text-muted-foreground">
                            {cred.label || "No label"} &bull; Added{" "}
                            {new Date(cred.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCredential(cred.id, cred.provider)}
                        data-testid={`button-delete-${cred.provider}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t border-white/10">
                <p>
                  All API keys are encrypted with AES-256-GCM before storage. Keys are
                  decrypted only when needed for API calls and never logged.
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4" data-testid="card-data-export">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Data Export</h2>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500 mb-1">Export Warning</p>
                    <p className="text-muted-foreground">
                      This will export all your organization data including users, projects, 
                      agent runs, usage records, audit logs, roundtable sessions, and integrations. 
                      Sensitive data like API keys and passwords are excluded from the export.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Download a complete JSON backup of your data.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={exporting}
                    data-testid="button-export-data"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export All Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6" data-testid="section-security">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Security</h2>
              </div>

              <Separator />

              {/* Recovery Codes Card */}
              <div 
                className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
                data-testid="card-security-recovery-codes"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Recovery Codes</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        One-time use codes for account recovery if you lose access to your 2FA device.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-sm text-muted-foreground" data-testid="text-recovery-codes-count">
                    <span className="text-foreground font-medium">0</span> recovery codes remaining
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="button-generate-recovery-codes"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Codes
                  </Button>
                </div>
              </div>

              {/* Two-Factor Authentication Card */}
              <div 
                className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
                data-testid="card-security-2fa"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add an extra layer of security with time-based one-time passwords (TOTP).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2" data-testid="text-2fa-status">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span className="text-sm text-muted-foreground">Not enabled</span>
                  </div>
                  <Button
                    size="sm"
                    data-testid="button-enable-2fa"
                  >
                    Enable 2FA
                  </Button>
                </div>
              </div>

              {/* QR Code Sign-In Card */}
              <div 
                className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
                data-testid="card-security-qr-signin"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">QR Code Sign-In</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sign in securely on other devices by scanning a QR code with your authenticated mobile device.
                      This feature provides passwordless authentication for trusted devices.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    QR sign-in sessions expire after 5 minutes for security. You'll need 2FA enabled to use this feature.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
