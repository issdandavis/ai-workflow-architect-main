import { useState, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Wand2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Download,
  RotateCcw,
  Palette,
  Layout as LayoutIcon,
  Zap,
  Sparkles,
  Monitor,
  Minimize2,
  Bold,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WizardState {
  description: string;
  template: string | null;
  generatedCode: string;
}

const TEMPLATES = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean lines, gradients, and bold typography",
    icon: Monitor,
    color: "from-blue-500 to-purple-500",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple, focused, and distraction-free",
    icon: Minimize2,
    color: "from-gray-400 to-gray-600",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Eye-catching colors and strong visuals",
    icon: Bold,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Timeless elegance with refined details",
    icon: Crown,
    color: "from-amber-500 to-yellow-600",
  },
];

const EXAMPLE_PROMPTS = [
  "A portfolio site for a photographer",
  "An e-commerce store for handmade jewelry",
  "A landing page for a SaaS product",
  "A personal blog with a dark theme",
];

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#f38181", "#aa96da"];
  const randomColor = colors[index % colors.length];
  const randomDelay = Math.random() * 0.5;
  const randomX = Math.random() * 100;
  const randomRotation = Math.random() * 360;

  return (
    <motion.div
      initial={{ y: -20, x: `${randomX}vw`, rotate: 0, opacity: 1 }}
      animate={{
        y: "100vh",
        rotate: randomRotation + 720,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay: randomDelay,
        ease: "easeOut",
      }}
      className="fixed top-0 w-3 h-3 rounded-sm z-50 pointer-events-none"
      style={{ backgroundColor: randomColor }}
    />
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </div>
  );
}

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

export default function WebsiteBuilder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>({
    description: "",
    template: null,
    generatedCode: "",
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a complete, single-page HTML website with inline CSS based on the following requirements:

Description: ${wizardState.description}
Design Style: ${wizardState.template} template - ${TEMPLATES.find(t => t.id === wizardState.template)?.description}

Requirements:
- Create a complete, valid HTML5 document
- Include all CSS inline in a <style> tag
- Make it responsive
- Include placeholder images using https://placehold.co
- Add appropriate sections (header, hero, features, footer)
- Use modern CSS features (flexbox, grid)
- Make it visually appealing with the ${wizardState.template} design aesthetic

Return ONLY the HTML code, no explanations.`;

      const res = await apiRequest("POST", "/api/code-assistant/generate", {
        prompt,
        provider: "google",
        conversationHistory: [],
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate website");
      }

      const data = await res.json();
      return data.content;
    },
    onSuccess: (content) => {
      const htmlMatch = content.match(/```html?\n?([\s\S]*?)```/);
      const code = htmlMatch ? htmlMatch[1].trim() : content;
      setWizardState(prev => ({ ...prev, generatedCode: code }));
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !wizardState.description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what website you want to build",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && !wizardState.template) {
      toast({
        title: "Template required",
        description: "Please select a design template",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 3 && !wizardState.generatedCode) {
      generateMutation.mutate();
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      if (currentStep === 3) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setWizardState({
      description: "",
      template: null,
      generatedCode: "",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([wizardState.generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "website.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "Your website has been downloaded as website.html",
    });
  };

  useEffect(() => {
    if (currentStep === 3 && !wizardState.generatedCode && !generateMutation.isPending) {
      generateMutation.mutate();
    }
  }, [currentStep]);

  const progressPercent = (currentStep / 4) * 100;

  return (
    <Layout>
      {showConfetti && <Confetti />}
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50">
              <Wand2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Website Builder</h1>
              <p className="text-muted-foreground text-sm">Build your website with AI assistance</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
              <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}% complete</span>
            </div>
            <Progress value={progressPercent} className="h-2" data-testid="progress-indicator" />
            
            <div className="flex justify-between mt-4">
              {[
                { step: 1, label: "Plan", icon: Sparkles },
                { step: 2, label: "Design", icon: Palette },
                { step: 3, label: "Build", icon: Zap },
                { step: 4, label: "Deploy", icon: Check },
              ].map(({ step, label, icon: Icon }) => (
                <div
                  key={step}
                  className={`flex flex-col items-center gap-1 ${
                    step <= currentStep ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${step}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      step < currentStep
                        ? "bg-primary text-primary-foreground"
                        : step === currentStep
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    {step < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
                data-testid="step-1-content"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Describe Your Website
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Tell us what kind of website you want to build. Be as specific as possible.
                  </p>
                  
                  <Textarea
                    value={wizardState.description}
                    onChange={(e) => setWizardState(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your dream website..."
                    className="min-h-[150px] bg-white/5 border-white/10"
                    data-testid="input-description"
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3">Need inspiration? Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => setWizardState(prev => ({ ...prev, description: prompt }))}
                        className="text-xs"
                        data-testid={`button-example-${i}`}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
                data-testid="step-2-content"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Choose Your Design Style
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Select a template that matches your vision.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isSelected = wizardState.template === template.id;
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected
                            ? "ring-2 ring-primary bg-primary/10"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                        onClick={() => setWizardState(prev => ({ ...prev, template: template.id }))}
                        data-testid={`card-template-${template.id}`}
                      >
                        <CardContent className="p-4">
                          <div
                            className={`h-24 rounded-lg bg-gradient-to-br ${template.color} mb-4 flex items-center justify-center`}
                          >
                            <Icon className="w-10 h-10 text-white/80" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{template.name}</h3>
                              <p className="text-xs text-muted-foreground">{template.description}</p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
                data-testid="step-3-content"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Building Your Website
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    AI is generating your website based on your description and chosen style.
                  </p>
                </div>

                {generateMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="loading-state">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary" />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-semibold text-lg">Generating your website...</p>
                      <p className="text-sm text-muted-foreground">This may take a moment</p>
                    </div>
                    <motion.div
                      className="flex gap-1"
                      initial="hidden"
                      animate="visible"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </motion.div>
                  </div>
                ) : wizardState.generatedCode ? (
                  <div className="space-y-4" data-testid="code-preview">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Website generated successfully!</span>
                    </div>
                    <ScrollArea className="h-[300px] rounded-lg border border-white/10 bg-black/30">
                      <pre className="p-4 text-xs text-muted-foreground">
                        <code>{wizardState.generatedCode.slice(0, 2000)}...</code>
                      </pre>
                    </ScrollArea>
                    <p className="text-sm text-muted-foreground">
                      Click "Next" to see the full code and download options.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16" data-testid="error-state">
                    <p className="text-muted-foreground">Failed to generate. Click "Next" to try again.</p>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
                data-testid="step-4-content"
              >
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                  >
                    <Check className="w-10 h-10 text-green-400" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">🎉 Your Website is Ready!</h2>
                  <p className="text-muted-foreground">
                    Your website has been generated. Download the code and deploy it anywhere!
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <LayoutIcon className="w-4 h-4" />
                      Generated Code
                    </h3>
                    <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">
                      HTML + CSS
                    </span>
                  </div>
                  <ScrollArea className="h-[300px] rounded-lg border border-white/10 bg-black/30" data-testid="final-code-preview">
                    <pre className="p-4 text-xs text-muted-foreground overflow-x-auto">
                      <code>{wizardState.generatedCode}</code>
                    </pre>
                  </ScrollArea>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleDownload}
                    className="flex-1 gap-2"
                    data-testid="button-download"
                  >
                    <Download className="w-4 h-4" />
                    Download Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartOver}
                    className="flex-1 gap-2"
                    data-testid="button-start-over"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Over
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            {currentStep < 4 && (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 3 && generateMutation.isPending) ||
                  (currentStep === 3 && !wizardState.generatedCode)
                }
                className="gap-2"
                data-testid="button-next"
              >
                {currentStep === 3 && generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
