import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Bell, CreditCard, Shield, Key, GitBranch } from "lucide-react";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-glow">System Configuration</h1>
          <p className="text-muted-foreground">Manage your profile, security preferences, and API keys.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation for Settings */}
          <div className="lg:col-span-1 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-2 bg-primary/10 text-primary">
              <User className="w-4 h-4" /> Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-white/5">
              <Key className="w-4 h-4" /> API Keys
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-white/5">
              <GitBranch className="w-4 h-4" /> Auto-Deploy
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-white/5">
              <Bell className="w-4 h-4" /> Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-white/5">
              <Shield className="w-4 h-4" /> Security
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-white/5">
              <CreditCard className="w-4 h-4" /> Billing
            </Button>
          </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Auto-Deploy Configuration */}
            <div className="glass-panel p-6 rounded-2xl space-y-6 border-l-4 border-l-primary/50">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Auto Authenticator</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure automated code uploading. When enabled, the AI Swarm will automatically commit and push generated code to your connected repository.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Auto-Push</Label>
                    <div className="text-xs text-muted-foreground">Automatically push to 'main' branch</div>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label>GitHub Personal Access Token (PAT)</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="ghp_........................" className="bg-black/20 border-white/10" readOnly />
                    <Button variant="outline">Update</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Required for automated commits.</p>
                </div>
              </div>
            </div>
            
            {/* API Keys Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">API Credentials</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="sk-........................" className="bg-black/20 border-white/10" readOnly />
                    <Button variant="outline">Update</Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Anthropic API Key (Claude)</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="sk-ant-........................" className="bg-black/20 border-white/10" readOnly />
                    <Button variant="outline">Update</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>xAI API Key (Grok)</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="xai-........................" className="bg-black/20 border-white/10" readOnly />
                    <Button variant="outline">Update</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Section */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Public Persona</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input defaultValue="Admin Commander" className="bg-black/20 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="admin@aicore.com" className="bg-black/20 border-white/10" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <div className="text-sm text-muted-foreground">Secure your account with 2FA</div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="ghost">Cancel</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
