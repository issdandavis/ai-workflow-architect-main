import { useState, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Key, Trash2, Plus, Loader2, CheckCircle, AlertCircle, BarChart3, Download, AlertTriangle, Shield, Smartphone, QrCode, Link2, ExternalLink, CreditCard, Gift, Ticket } from "lucide-react";
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

interface SocialLinks {
  linktree?: string;
  orchid?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  discord?: string;
  twitch?: string;
  medium?: string;
  substack?: string;
  behance?: string;
  dribbble?: string;
  kofi?: string;
  patreon?: string;
  mastodon?: string;
  bluesky?: string;
  threads?: string;
  pinterest?: string;
  reddit?: string;
  spotify?: string;
  soundcloud?: string;
  bandcamp?: string;
  devto?: string;
  hashnode?: string;
  codepen?: string;
  stackoverflow?: string;
  figma?: string;
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
  
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [savingSocial, setSavingSocial] = useState(false);

  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
  } | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
    loadUsage();
    loadProfile();
    loadSubscription();
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

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.socialLinks) {
          setSocialLinks(data.profile.socialLinks);
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }

  async function loadSubscription() {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error("Failed to load subscription:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }

  async function handleOpenPortal() {
    setOpeningPortal(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open subscription portal");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open portal");
    } finally {
      setOpeningPortal(false);
    }
  }

  async function handleApplyPromoCode() {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }
    setApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply promo code");
      }
      setPromoSuccess(data.message);
      setPromoCode("");
      setTimeout(() => setPromoSuccess(null), 5000);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Failed to apply promo code");
    } finally {
      setApplyingPromo(false);
    }
  }

  async function handleSaveSocialLinks() {
    setSavingSocial(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save social links");
      }

      setSuccess("Social links saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save social links");
    } finally {
      setSavingSocial(false);
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

            {/* Subscription Management Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6" data-testid="section-subscription">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Subscription</h2>
              </div>

              <Separator />

              {loadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                    data-testid="card-subscription-status"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize" data-testid="text-subscription-plan">
                            {subscription?.plan || "Free"} Plan
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span 
                              className={`w-2 h-2 rounded-full ${
                                subscription?.status === "active" ? "bg-green-500" : 
                                subscription?.status === "canceled" ? "bg-red-500" : 
                                subscription?.status === "past_due" ? "bg-yellow-500" : "bg-gray-400"
                              }`}
                            />
                            <span className="text-sm text-muted-foreground capitalize" data-testid="text-subscription-status">
                              {subscription?.status || "Active"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {subscription?.currentPeriodEnd && (
                          <p className="text-sm text-muted-foreground" data-testid="text-subscription-renewal">
                            Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {subscription?.plan === "free" || !subscription?.stripeCustomerId ? (
                      <Button 
                        data-testid="button-upgrade-plan"
                        onClick={() => window.location.href = "/shop"}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleOpenPortal}
                        disabled={openingPortal}
                        data-testid="button-manage-subscription"
                      >
                        {openingPortal ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage Subscription
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Promo Code Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6" data-testid="section-promo-code">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Promo Code</h2>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Have a promo code? Enter it below to redeem discounts and special offers.
              </p>

              {promoSuccess && (
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-3 rounded-lg" data-testid="text-promo-success">
                  <CheckCircle className="w-4 h-4" />
                  {promoSuccess}
                </div>
              )}

              {promoError && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg" data-testid="text-promo-error">
                  <AlertCircle className="w-4 h-4" />
                  {promoError}
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="promo-code">Promo Code</Label>
                  <Input
                    id="promo-code"
                    placeholder="Enter your promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    data-testid="input-promo-code"
                    className="uppercase"
                  />
                </div>
                <Button
                  onClick={handleApplyPromoCode}
                  disabled={applyingPromo || !promoCode.trim()}
                  data-testid="button-apply-promo"
                >
                  {applyingPromo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6" data-testid="section-social-links">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Social Links</h2>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Your official social links hub. Add all your profiles to share with the world.
              </p>

              {/* Link Aggregators */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Link Aggregators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="linktree" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">L</span>
                      Linktree
                    </Label>
                    <Input id="linktree" placeholder="https://linktr.ee/you" value={socialLinks.linktree || ""} onChange={(e) => setSocialLinks({ ...socialLinks, linktree: e.target.value })} data-testid="input-linktree" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="orchid" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">O</span>
                      Orchid
                    </Label>
                    <Input id="orchid" placeholder="https://orchid.id/you" value={socialLinks.orchid || ""} onChange={(e) => setSocialLinks({ ...socialLinks, orchid: e.target.value })} data-testid="input-orchid" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Main Social */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Main Social</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="twitter" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">𝕏</span>
                      Twitter / X
                    </Label>
                    <Input id="twitter" placeholder="https://x.com/you" value={socialLinks.twitter || ""} onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })} data-testid="input-twitter" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="instagram" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold">IG</span>
                      Instagram
                    </Label>
                    <Input id="instagram" placeholder="https://instagram.com/you" value={socialLinks.instagram || ""} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} data-testid="input-instagram" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="facebook" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">f</span>
                      Facebook
                    </Label>
                    <Input id="facebook" placeholder="https://facebook.com/you" value={socialLinks.facebook || ""} onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })} data-testid="input-facebook" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="threads" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">@</span>
                      Threads
                    </Label>
                    <Input id="threads" placeholder="https://threads.net/@you" value={socialLinks.threads || ""} onChange={(e) => setSocialLinks({ ...socialLinks, threads: e.target.value })} data-testid="input-threads" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bluesky" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold">B</span>
                      Bluesky
                    </Label>
                    <Input id="bluesky" placeholder="https://bsky.app/profile/you" value={socialLinks.bluesky || ""} onChange={(e) => setSocialLinks({ ...socialLinks, bluesky: e.target.value })} data-testid="input-bluesky" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mastodon" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold">M</span>
                      Mastodon
                    </Label>
                    <Input id="mastodon" placeholder="https://mastodon.social/@you" value={socialLinks.mastodon || ""} onChange={(e) => setSocialLinks({ ...socialLinks, mastodon: e.target.value })} data-testid="input-mastodon" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Video & Streaming */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Video & Streaming</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="youtube" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-red-600 flex items-center justify-center text-white text-[10px] font-bold">YT</span>
                      YouTube
                    </Label>
                    <Input id="youtube" placeholder="https://youtube.com/@you" value={socialLinks.youtube || ""} onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })} data-testid="input-youtube" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tiktok" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">TT</span>
                      TikTok
                    </Label>
                    <Input id="tiktok" placeholder="https://tiktok.com/@you" value={socialLinks.tiktok || ""} onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })} data-testid="input-tiktok" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="twitch" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">TV</span>
                      Twitch
                    </Label>
                    <Input id="twitch" placeholder="https://twitch.tv/you" value={socialLinks.twitch || ""} onChange={(e) => setSocialLinks({ ...socialLinks, twitch: e.target.value })} data-testid="input-twitch" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Professional */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="linkedin" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-blue-700 flex items-center justify-center text-white text-[10px] font-bold">in</span>
                      LinkedIn
                    </Label>
                    <Input id="linkedin" placeholder="https://linkedin.com/in/you" value={socialLinks.linkedin || ""} onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })} data-testid="input-linkedin" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="website" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">W</span>
                      Website
                    </Label>
                    <Input id="website" placeholder="https://yoursite.com" value={socialLinks.website || ""} onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })} data-testid="input-website" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Developer */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Developer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="github" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-gray-800 flex items-center justify-center text-white text-[10px] font-bold">GH</span>
                      GitHub
                    </Label>
                    <Input id="github" placeholder="https://github.com/you" value={socialLinks.github || ""} onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })} data-testid="input-github" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="stackoverflow" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">SO</span>
                      Stack Overflow
                    </Label>
                    <Input id="stackoverflow" placeholder="https://stackoverflow.com/users/you" value={socialLinks.stackoverflow || ""} onChange={(e) => setSocialLinks({ ...socialLinks, stackoverflow: e.target.value })} data-testid="input-stackoverflow" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="codepen" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">CP</span>
                      CodePen
                    </Label>
                    <Input id="codepen" placeholder="https://codepen.io/you" value={socialLinks.codepen || ""} onChange={(e) => setSocialLinks({ ...socialLinks, codepen: e.target.value })} data-testid="input-codepen" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="devto" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">D</span>
                      Dev.to
                    </Label>
                    <Input id="devto" placeholder="https://dev.to/you" value={socialLinks.devto || ""} onChange={(e) => setSocialLinks({ ...socialLinks, devto: e.target.value })} data-testid="input-devto" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hashnode" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">H</span>
                      Hashnode
                    </Label>
                    <Input id="hashnode" placeholder="https://hashnode.com/@you" value={socialLinks.hashnode || ""} onChange={(e) => setSocialLinks({ ...socialLinks, hashnode: e.target.value })} data-testid="input-hashnode" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Creative & Design */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Creative & Design</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="behance" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">Be</span>
                      Behance
                    </Label>
                    <Input id="behance" placeholder="https://behance.net/you" value={socialLinks.behance || ""} onChange={(e) => setSocialLinks({ ...socialLinks, behance: e.target.value })} data-testid="input-behance" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dribbble" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold">Dr</span>
                      Dribbble
                    </Label>
                    <Input id="dribbble" placeholder="https://dribbble.com/you" value={socialLinks.dribbble || ""} onChange={(e) => setSocialLinks({ ...socialLinks, dribbble: e.target.value })} data-testid="input-dribbble" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pinterest" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-red-600 flex items-center justify-center text-white text-[10px] font-bold">P</span>
                      Pinterest
                    </Label>
                    <Input id="pinterest" placeholder="https://pinterest.com/you" value={socialLinks.pinterest || ""} onChange={(e) => setSocialLinks({ ...socialLinks, pinterest: e.target.value })} data-testid="input-pinterest" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="figma" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">F</span>
                      Figma
                    </Label>
                    <Input id="figma" placeholder="https://figma.com/@you" value={socialLinks.figma || ""} onChange={(e) => setSocialLinks({ ...socialLinks, figma: e.target.value })} data-testid="input-figma" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Writing */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Writing & Blogging</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="medium" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-white text-[10px] font-bold">M</span>
                      Medium
                    </Label>
                    <Input id="medium" placeholder="https://medium.com/@you" value={socialLinks.medium || ""} onChange={(e) => setSocialLinks({ ...socialLinks, medium: e.target.value })} data-testid="input-medium" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="substack" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">S</span>
                      Substack
                    </Label>
                    <Input id="substack" placeholder="https://you.substack.com" value={socialLinks.substack || ""} onChange={(e) => setSocialLinks({ ...socialLinks, substack: e.target.value })} data-testid="input-substack" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Music */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Music</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="spotify" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">S</span>
                      Spotify
                    </Label>
                    <Input id="spotify" placeholder="https://open.spotify.com/artist/you" value={socialLinks.spotify || ""} onChange={(e) => setSocialLinks({ ...socialLinks, spotify: e.target.value })} data-testid="input-spotify" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="soundcloud" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">SC</span>
                      SoundCloud
                    </Label>
                    <Input id="soundcloud" placeholder="https://soundcloud.com/you" value={socialLinks.soundcloud || ""} onChange={(e) => setSocialLinks({ ...socialLinks, soundcloud: e.target.value })} data-testid="input-soundcloud" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bandcamp" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">BC</span>
                      Bandcamp
                    </Label>
                    <Input id="bandcamp" placeholder="https://you.bandcamp.com" value={socialLinks.bandcamp || ""} onChange={(e) => setSocialLinks({ ...socialLinks, bandcamp: e.target.value })} data-testid="input-bandcamp" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Community & Support */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Community & Support</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="discord" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">D</span>
                      Discord
                    </Label>
                    <Input id="discord" placeholder="https://discord.gg/invite" value={socialLinks.discord || ""} onChange={(e) => setSocialLinks({ ...socialLinks, discord: e.target.value })} data-testid="input-discord" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reddit" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">R</span>
                      Reddit
                    </Label>
                    <Input id="reddit" placeholder="https://reddit.com/u/you" value={socialLinks.reddit || ""} onChange={(e) => setSocialLinks({ ...socialLinks, reddit: e.target.value })} data-testid="input-reddit" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="patreon" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">P</span>
                      Patreon
                    </Label>
                    <Input id="patreon" placeholder="https://patreon.com/you" value={socialLinks.patreon || ""} onChange={(e) => setSocialLinks({ ...socialLinks, patreon: e.target.value })} data-testid="input-patreon" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kofi" className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">K</span>
                      Ko-fi
                    </Label>
                    <Input id="kofi" placeholder="https://ko-fi.com/you" value={socialLinks.kofi || ""} onChange={(e) => setSocialLinks({ ...socialLinks, kofi: e.target.value })} data-testid="input-kofi" className="h-9" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button
                  onClick={handleSaveSocialLinks}
                  disabled={savingSocial}
                  data-testid="button-save-social-links"
                >
                  {savingSocial ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Social Links"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
