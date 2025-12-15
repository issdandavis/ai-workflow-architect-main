import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Shield, Brain, CreditCard, Sparkles, Volume2, VolumeX, Image } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import shopMusic from "@assets/Old_School_Flow_1765749666740.wav";

interface PricingTier {
  name: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: { text: string; included: boolean }[];
  buttonText: string;
  buttonAction: "signup" | "checkout-pro" | "checkout-team";
  highlighted?: boolean;
  badge?: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "FREE",
    priceSubtext: "Forever",
    description: "Perfect for trying out AI Orchestration Hub",
    features: [
      { text: "50 AI messages/month", included: true },
      { text: "5 workflow executions/month", included: true },
      { text: "Community access (read-only)", included: true },
      { text: "2 integration connections max", included: true },
      { text: "Marketplace browsing", included: true },
      { text: "Priority support", included: false },
      { text: "Team features", included: false },
    ],
    buttonText: "Get Started Free",
    buttonAction: "signup",
  },
  {
    name: "Pro",
    price: "$20",
    priceSubtext: "/month",
    description: "For power users who need unlimited access",
    features: [
      { text: "Unlimited AI messages", included: true },
      { text: "Unlimited workflow executions", included: true },
      { text: "Full community access", included: true },
      { text: "Unlimited integrations", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Team features", included: false },
    ],
    buttonText: "Subscribe to Pro",
    buttonAction: "checkout-pro",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    price: "$45",
    priceSubtext: "/user/month",
    description: "For teams that collaborate together",
    features: [
      { text: "Everything in Pro, plus:", included: true },
      { text: "Team workspaces", included: true },
      { text: "Collaboration features", included: true },
      { text: "Team analytics dashboard", included: true },
      { text: "Admin controls", included: true },
      { text: "SSO & SAML support", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    buttonText: "Subscribe Team",
    buttonAction: "checkout-team",
  },
];

const comparisonFeatures = [
  { feature: "AI Messages", starter: "50/month", pro: "Unlimited", team: "Unlimited" },
  { feature: "Workflow Executions", starter: "5/month", pro: "Unlimited", team: "Unlimited" },
  { feature: "Integrations", starter: "2 max", pro: "Unlimited", team: "Unlimited" },
  { feature: "Community Access", starter: "Read-only", pro: "Full access", team: "Full access" },
  { feature: "Support", starter: "Community", pro: "Priority", team: "Dedicated" },
  { feature: "Team Workspaces", starter: "—", pro: "—", team: "✓" },
  { feature: "Collaboration", starter: "—", pro: "—", team: "✓" },
  { feature: "Analytics Dashboard", starter: "Basic", pro: "Advanced", team: "Team-wide" },
  { feature: "Admin Controls", starter: "—", pro: "—", team: "✓" },
];

export default function Shop() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.3;
      audio.loop = true;
      audio.play().catch(() => {});
    }
    return () => {
      if (audio) audio.pause();
    };
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, mode }: { priceId: string; mode: 'payment' | 'subscription' }) => {
      const customerRes = await fetch('/api/stripe/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'customer@example.com' }),
      });
      if (!customerRes.ok) throw new Error('Failed to create customer');
      const { customer } = await customerRes.json();

      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          priceId,
          mode,
        }),
      });
      if (!checkoutRes.ok) throw new Error('Failed to create checkout session');
      return checkoutRes.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const handleButtonClick = (action: PricingTier["buttonAction"]) => {
    if (action === "signup") {
      window.location.href = "/signup";
    } else if (action === "checkout-pro") {
      checkoutMutation.mutate({ priceId: "price_pro_monthly", mode: "subscription" });
    } else if (action === "checkout-team") {
      checkoutMutation.mutate({ priceId: "price_team_monthly", mode: "subscription" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <audio ref={audioRef} src={shopMusic} data-testid="audio-shop-music" />
      
      <nav className="border-b border-border bg-card/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/">
          <span className="text-lg md:text-xl font-bold cursor-pointer hover:text-primary transition-colors" data-testid="link-home">
            AI Orchestration Hub
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/gallery">
            <Button variant="ghost" size="sm" className="hidden sm:flex" data-testid="link-gallery">
              <Image className="w-4 h-4 mr-2" />
              Gallery
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            data-testid="button-toggle-music"
            title={isMuted ? "Unmute music" : "Mute music"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Link href="/login">
            <Button variant="ghost" size="sm" data-testid="button-login">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" data-testid="button-signup">Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-4" data-testid="badge-pricing">Pricing</Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="text-heading">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-subheading">
            Choose the plan that fits your needs. Start free, upgrade when you're ready.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex"
            >
              <Card 
                className={`flex flex-col w-full relative ${
                  tier.highlighted 
                    ? "border-2 border-primary shadow-lg shadow-primary/20" 
                    : "border-2 hover:border-primary/50 transition-colors"
                }`}
                data-testid={`card-tier-${tier.name.toLowerCase()}`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground" data-testid="badge-most-popular">
                      {tier.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl" data-testid={`text-tier-name-${tier.name.toLowerCase()}`}>
                    {tier.name}
                  </CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-grow">
                  <div className="mb-6">
                    <span className="text-4xl md:text-5xl font-bold" data-testid={`text-price-${tier.name.toLowerCase()}`}>
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground ml-1">{tier.priceSubtext}</span>
                  </div>
                  <ul className="space-y-3 text-left">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${!feature.included ? "text-muted-foreground/50" : ""}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={tier.highlighted ? "default" : "outline"}
                    disabled={checkoutMutation.isPending}
                    onClick={() => handleButtonClick(tier.buttonAction)}
                    data-testid={`button-${tier.buttonAction}`}
                  >
                    {checkoutMutation.isPending ? 'Processing...' : tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" data-testid="text-comparison-heading">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse min-w-[500px]" data-testid="table-comparison">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold bg-primary/10">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Team</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, index) => (
                  <tr 
                    key={row.feature} 
                    className={`border-b border-border ${index % 2 === 0 ? "bg-muted/30" : ""}`}
                    data-testid={`row-comparison-${index}`}
                  >
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{row.starter}</td>
                    <td className="py-3 px-4 text-center bg-primary/5 font-medium">{row.pro}</td>
                    <td className="py-3 px-4 text-center">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-muted-foreground mb-4" data-testid="text-guarantee">
            30-day money-back guarantee. No questions asked.
          </p>
          <div className="flex items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Powered by Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>Multi-AI Orchestration</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 md:mt-16 text-center"
        >
          <Card className="inline-block p-4 md:p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Sparkles className="w-8 h-8 text-purple-500" />
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-lg">Explore our AI Art Gallery</h3>
                <p className="text-muted-foreground text-sm">See amazing AI-generated artwork created with our platform</p>
              </div>
              <Link href="/gallery">
                <Button variant="outline" data-testid="button-explore-gallery">
                  View Gallery
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
