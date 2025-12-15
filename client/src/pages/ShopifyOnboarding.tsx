import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Store, 
  Sparkles, 
  Bot, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Zap,
  FileText,
  Settings
} from "lucide-react";

type OnboardingStep = "welcome" | "connect-ai" | "product-generator";

const AI_MODELS = [
  { id: "claude", name: "Claude (Anthropic)", description: "Best for creative, nuanced writing", icon: "🧠" },
  { id: "grok", name: "Grok (xAI)", description: "Fast and witty responses", icon: "⚡" },
  { id: "gemini", name: "Gemini (Google)", description: "Great for structured content", icon: "🌟" },
  { id: "perplexity", name: "Perplexity", description: "Research-backed descriptions", icon: "🔍" },
];

export default function ShopifyOnboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedModels, setSelectedModels] = useState<string[]>(["claude"]);
  const [shop, setShop] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop");
    if (shopParam) {
      setShop(shopParam);
    }

    fetch("/api/shopify/auth/session", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          setLocation("/");
        } else {
          setShop(data.shop);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [setLocation]);

  const stepProgress = {
    welcome: 33,
    "connect-ai": 66,
    "product-generator": 100,
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const goToNext = () => {
    if (step === "welcome") setStep("connect-ai");
    else if (step === "connect-ai") setStep("product-generator");
  };

  const goToPrev = () => {
    if (step === "connect-ai") setStep("welcome");
    else if (step === "product-generator") setStep("connect-ai");
  };

  const finishOnboarding = () => {
    setLocation("/shopify/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-shop-name">
                  {shop || "Your Store"}
                </h1>
                <p className="text-sm text-muted-foreground">AI Orchestration Setup</p>
              </div>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              Step {step === "welcome" ? 1 : step === "connect-ai" ? 2 : 3} of 3
            </Badge>
          </div>
          <Progress value={stepProgress[step]} className="h-2" data-testid="progress-onboarding" />
        </div>

        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl" data-testid="text-welcome-title">
                    Welcome to AI Orchestration Hub
                  </CardTitle>
                  <CardDescription className="text-lg mt-2">
                    Supercharge your Shopify store with AI-powered product descriptions,
                    content generation, and intelligent automation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 mb-8">
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">AI Product Descriptions</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate compelling, SEO-optimized descriptions in seconds
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Multiple AI Models</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose from Claude, Grok, Gemini, and more for different use cases
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Cost-Optimized</h3>
                        <p className="text-sm text-muted-foreground">
                          Smart routing to the most cost-effective AI for each task
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={goToNext} 
                    className="w-full h-12 text-lg"
                    data-testid="button-get-started"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "connect-ai" && (
            <motion.div
              key="connect-ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl" data-testid="text-connect-ai-title">
                    Connect AI Models
                  </CardTitle>
                  <CardDescription className="text-lg mt-2">
                    Select which AI models you want to use for generating content.
                    You can change this later in settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-3 mb-8">
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left w-full ${
                          selectedModels.includes(model.id)
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                        data-testid={`button-model-${model.id}`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                          {model.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{model.name}</h3>
                          <p className="text-sm text-muted-foreground">{model.description}</p>
                        </div>
                        {selectedModels.includes(model.id) && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={goToPrev}
                      className="flex-1 h-12"
                      data-testid="button-back-welcome"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={goToNext}
                      disabled={selectedModels.length === 0}
                      className="flex-1 h-12"
                      data-testid="button-continue-generator"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "product-generator" && (
            <motion.div
              key="product-generator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl" data-testid="text-generator-title">
                    Product Description Generator
                  </CardTitle>
                  <CardDescription className="text-lg mt-2">
                    You're all set! Here's how to generate AI-powered product descriptions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold">Select a Product</h3>
                        <p className="text-sm text-muted-foreground">
                          Go to your product dashboard and select any product
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold">Choose Your Tone</h3>
                        <p className="text-sm text-muted-foreground">
                          Pick from professional, casual, luxury, or technical styles
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold">Generate & Publish</h3>
                        <p className="text-sm text-muted-foreground">
                          Click generate, review the AI content, and publish to your store
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Your AI Configuration</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedModels.map((id) => {
                        const model = AI_MODELS.find((m) => m.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="px-3 py-1">
                            {model?.icon} {model?.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={goToPrev}
                      className="flex-1 h-12"
                      data-testid="button-back-connect"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={finishOnboarding}
                      className="flex-1 h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                      data-testid="button-finish-setup"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Using AI Hub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
