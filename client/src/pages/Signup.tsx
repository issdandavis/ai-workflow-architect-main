import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";
import bgImage from "@assets/generated_images/secure_futuristic_authentication_portal_background.png";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // Force full page navigation to ensure session is properly established
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-0" />

      <a href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="link-back-home">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Home</span>
      </a>

      <div className="relative z-10 w-full max-w-md p-8 glass-panel rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_20px_rgba(0,255,255,0.4)] mb-4">
            <Cpu className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-glow">Request Clearance</h1>
          <p className="text-muted-foreground">Join the AI Orchestration Network.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-signup">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3" data-testid="text-error">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email" 
              placeholder="commander@aicore.com" 
              className="bg-black/40 border-white/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              type="password" 
              placeholder="••••••••" 
              className="bg-black/40 border-white/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              data-testid="input-password"
            />
          </div>

          <Button 
            type="submit"
            className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
            disabled={isLoading}
            data-testid="button-signup"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : "Create Account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already authorized?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Access Terminal
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
