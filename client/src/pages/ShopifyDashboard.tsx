import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Package, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Wand2
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  status: string;
  image?: string;
  price?: string;
}

interface ShopInfo {
  name: string;
  email: string;
  myshopifyDomain: string;
  plan?: { displayName: string };
  primaryDomain?: { url: string };
}

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "luxury", label: "Luxury & Premium" },
  { value: "technical", label: "Technical & Detailed" },
  { value: "playful", label: "Playful & Fun" },
];

const AI_MODELS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "grok", label: "Grok (xAI)" },
  { value: "gemini", label: "Gemini (Google)" },
  { value: "perplexity", label: "Perplexity" },
];

export default function ShopifyDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [tone, setTone] = useState("professional");
  const [keywords, setKeywords] = useState("");
  const [aiModel, setAiModel] = useState("claude");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/shopify/auth/session"],
    retry: false,
  });

  const { data: shopData, isLoading: shopLoading } = useQuery<{ shop: ShopInfo }>({
    queryKey: ["/api/shopify/shop"],
    enabled: !!(session as any)?.authenticated,
    retry: false,
  });

  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery<{ products: Product[] }>({
    queryKey: ["/api/shopify/products"],
    enabled: !!(session as any)?.authenticated,
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/shopify/products/${encodeURIComponent(productId)}/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tone, keywords, aiModel }),
      });
      if (!response.ok) throw new Error("Failed to generate description");
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedDescription(data.generatedDescription);
      toast({
        title: "Description Generated",
        description: "AI has created a new product description for you.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate description. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error("No product selected");
      const response = await fetch(`/api/shopify/products/${encodeURIComponent(selectedProduct.id)}/description`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: generatedDescription }),
      });
      if (!response.ok) throw new Error("Failed to save description");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Description Saved",
        description: "Product description updated in Shopify.",
      });
      setIsGeneratorOpen(false);
      refetchProducts();
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save to Shopify. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!sessionLoading && !(session as any)?.authenticated) {
      setLocation("/");
    }
  }, [session, sessionLoading, setLocation]);

  const openGenerator = (product: Product) => {
    setSelectedProduct(product);
    setGeneratedDescription("");
    setIsGeneratorOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDescription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (sessionLoading || shopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const shop = shopData?.shop;
  const products = productsData?.products || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-shop-title">
                {shop?.name || "Shopify Dashboard"}
              </h1>
              <p className="text-muted-foreground">
                {shop?.myshopifyDomain}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {shop?.primaryDomain?.url && (
              <Button variant="outline" asChild>
                <a href={shop.primaryDomain.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Store
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => refetchProducts()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Products
                </CardTitle>
                <CardDescription>
                  Select a product to generate AI-powered descriptions
                </CardDescription>
              </div>
              <Badge variant="outline">{products.length} products</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No products found in your store</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openGenerator(product)}
                    data-testid={`card-product-${product.handle}`}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{product.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {product.price ? `$${product.price}` : "No price"}
                        </span>
                        <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                          {product.status}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGenerator(product);
                        }}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Description
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate Description
              </DialogTitle>
              <DialogDescription>
                {selectedProduct?.title}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger data-testid="select-ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Keywords (optional)</Label>
                  <Input
                    placeholder="premium, handcrafted, sustainable..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    data-testid="input-keywords"
                  />
                </div>

                <Button
                  onClick={() => selectedProduct && generateMutation.mutate(selectedProduct.id)}
                  disabled={generateMutation.isPending}
                  className="w-full"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Description
                    </>
                  )}
                </Button>

                {generatedDescription && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Generated Description</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        data-testid="button-copy"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={generatedDescription}
                      onChange={(e) => setGeneratedDescription(e.target.value)}
                      className="min-h-[200px]"
                      data-testid="textarea-description"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => selectedProduct && generateMutation.mutate(selectedProduct.id)}
                        disabled={generateMutation.isPending}
                        className="flex-1"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="flex-1"
                        data-testid="button-save-shopify"
                      >
                        {saveMutation.isPending ? (
                          <Spinner className="w-4 h-4 mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save to Shopify
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
