import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Shield, Globe, Brain, CreditCard, Sparkles, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import shopMusic from "@assets/Old_School_Flow_1765749666740.wav";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
}

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

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

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/stripe/products'],
    queryFn: async () => {
      const res = await fetch('/api/stripe/products', { credentials: 'include' });
      if (!res.ok) return { products: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: pricesData, isLoading: loadingPrices } = useQuery({
    queryKey: ['/api/stripe/prices'],
    queryFn: async () => {
      const res = await fetch('/api/stripe/prices', { credentials: 'include' });
      if (!res.ok) return { prices: [] };
      return res.json();
    },
    staleTime: 60000,
  });

  const products: StripeProduct[] = productsData?.products || [];
  const prices: StripePrice[] = pricesData?.prices || [];

  const yearlyProduct = products.find(p => p.metadata?.type === 'yearly' || p.metadata?.type === 'one_time');
  const monthlyProduct = products.find(p => p.metadata?.type === 'subscription');
  
  const yearlyPrice = prices.find(p => p.product === yearlyProduct?.id && p.recurring?.interval === 'year') || 
                      prices.find(p => p.product === yearlyProduct?.id);
  const monthlyPrice = prices.find(p => p.product === monthlyProduct?.id);

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

  const formatPrice = (amount: number) => {
    return `$${(amount / 100).toFixed(0)}`;
  };

  const features = [
    { icon: Brain, text: "Multi-AI Orchestration (Claude, GPT, Grok, Perplexity)" },
    { icon: Globe, text: "6+ Integrations (Google Drive, OneDrive, Notion, Stripe, GitHub, World Anvil)" },
    { icon: Shield, text: "Secure API key management" },
    { icon: Zap, text: "Real-time AI Roundtable discussions" },
    { icon: Sparkles, text: "Monaco code editor with AI assist" },
    { icon: CreditCard, text: "Usage tracking and cost controls" },
  ];

  const isLoading = loadingProducts || loadingPrices;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <audio ref={audioRef} src={shopMusic} data-testid="audio-shop-music" />
      
      <nav className="border-b border-border bg-card/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/">
          <span className="text-xl font-bold cursor-pointer hover:text-primary transition-colors" data-testid="link-home">
            AI Orchestration Hub
          </span>
        </Link>
        <div className="flex items-center gap-4">
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
            <Button variant="ghost" data-testid="button-login">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button data-testid="button-signup">Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4" data-testid="badge-pricing">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-heading">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-subheading">
            Subscribe yearly or monthly. No hidden fees.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" data-testid="spinner-loading"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full border-2 hover:border-primary/50 transition-colors" data-testid="card-yearly">
                <CardHeader className="text-center pb-2">
                  <Badge variant="outline" className="w-fit mx-auto mb-2">Best Value</Badge>
                  <CardTitle className="text-2xl" data-testid="text-yearly-title">Yearly</CardTitle>
                  <CardDescription>Save 55% compared to monthly</CardDescription>
                </CardHeader>
                <CardContent className="text-center pt-4">
                  <div className="mb-6">
                    <span className="text-5xl font-bold" data-testid="text-yearly-price">
                      {yearlyPrice ? formatPrice(yearlyPrice.unit_amount) : '$49'}
                    </span>
                    <span className="text-muted-foreground ml-2">/year</span>
                  </div>
                  <ul className="space-y-3 text-left">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium">All updates for the year</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={!yearlyPrice || checkoutMutation.isPending}
                    onClick={() => yearlyPrice && checkoutMutation.mutate({ 
                      priceId: yearlyPrice.id, 
                      mode: 'subscription' 
                    })}
                    data-testid="button-buy-yearly"
                  >
                    {checkoutMutation.isPending ? 'Processing...' : 'Subscribe Yearly'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full border-2 border-primary relative" data-testid="card-monthly">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                </div>
                <CardHeader className="text-center pb-2">
                  <Badge variant="outline" className="w-fit mx-auto mb-2">Flexible</Badge>
                  <CardTitle className="text-2xl" data-testid="text-monthly-title">Monthly</CardTitle>
                  <CardDescription>Pay as you go, cancel anytime</CardDescription>
                </CardHeader>
                <CardContent className="text-center pt-4">
                  <div className="mb-6">
                    <span className="text-5xl font-bold" data-testid="text-monthly-price">
                      {monthlyPrice ? formatPrice(monthlyPrice.unit_amount) : '$9'}
                    </span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <ul className="space-y-3 text-left">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium">Cancel anytime</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant="default"
                    disabled={!monthlyPrice || checkoutMutation.isPending}
                    onClick={() => monthlyPrice && checkoutMutation.mutate({ 
                      priceId: monthlyPrice.id, 
                      mode: 'subscription' 
                    })}
                    data-testid="button-subscribe"
                  >
                    {checkoutMutation.isPending ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-muted-foreground mb-4" data-testid="text-guarantee">
            30-day money-back guarantee. No questions asked.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Powered by Stripe</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
