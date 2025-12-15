import { useState, useRef, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Code2, 
  Send,
  Copy,
  Check,
  Loader2,
  User,
  Bot,
  Sparkles,
  Trash2,
  Youtube,
  ChevronRight,
  ChevronLeft,
  X,
  Palette,
  Image,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GenerateResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
}

type CostTier = "free" | "your_key";

interface Provider {
  id: string;
  name: string;
  model: string;
  costTier: CostTier;
  badge: string;
  badgeColor: string;
}

const PROVIDERS: Provider[] = [
  { id: "huggingface", name: "HuggingFace Llama", model: "meta-llama/Meta-Llama-3-8B-Instruct", costTier: "free", badge: "🆓 FREE", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "google", name: "Google Gemini", model: "gemini-2.0-flash", costTier: "free", badge: "🆓 FREE", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "anthropic", name: "Claude", model: "claude-sonnet-4-20250514", costTier: "your_key", badge: "🔑 Your Key", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "xai", name: "xAI Grok", model: "grok-2", costTier: "your_key", badge: "🔑 Your Key", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "perplexity", name: "Perplexity", model: "sonar", costTier: "your_key", badge: "🔑 Your Key", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
];

const YOUTUBE_URL_STORAGE_KEY = "codingStudio_youtubeUrl";
const FIGMA_URL_STORAGE_KEY = "codingStudio_figmaUrl";

interface FigmaScreenshotResponse {
  success: boolean;
  imageData?: string;
  mimeType?: string;
  error?: string;
  message?: string;
}

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  if (!url) return null;

  const patterns = [
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)(?:\/[^?]*)?(?:\?.*node-id=([0-9]+-[0-9]+))?/,
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)(?:\/[^?]*)?(?:\?.*node-id=([0-9]+:[0-9]+))?/,
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileKey = match[1];
      let nodeId = match[2] || "";
      if (nodeId.includes("-")) {
        nodeId = nodeId.replace("-", ":");
      }
      return { fileKey, nodeId };
    }
  }

  return null;
}

function extractCodeFromResponse(content: string): string {
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    matches.push(match);
  }
  
  if (matches.length > 0) {
    return matches.map(m => m[1].trim()).join("\n\n");
  }
  
  return content;
}

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export default function CodingStudio() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [provider, setProvider] = useState("huggingface");
  const [editorContent, setEditorContent] = useState("// Generated code will appear here\n// Select a provider and enter a prompt to get started\n");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [youtubeUrl, setYoutubeUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(YOUTUBE_URL_STORAGE_KEY) || "";
    }
    return "";
  });
  const [youtubeInputValue, setYoutubeInputValue] = useState(youtubeUrl);
  const [isYoutubePanelOpen, setIsYoutubePanelOpen] = useState(true);

  const [figmaUrl, setFigmaUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(FIGMA_URL_STORAGE_KEY) || "";
    }
    return "";
  });
  const [figmaInputValue, setFigmaInputValue] = useState(figmaUrl);
  const [figmaImageData, setFigmaImageData] = useState<string | null>(null);
  const [isFigmaPanelOpen, setIsFigmaPanelOpen] = useState(false);

  useEffect(() => {
    if (youtubeUrl) {
      localStorage.setItem(YOUTUBE_URL_STORAGE_KEY, youtubeUrl);
    }
  }, [youtubeUrl]);

  useEffect(() => {
    if (figmaUrl) {
      localStorage.setItem(FIGMA_URL_STORAGE_KEY, figmaUrl);
    }
  }, [figmaUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest("POST", "/api/code-assistant/generate", {
        prompt,
        provider,
        conversationHistory,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate code");
      }

      return res.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      const code = extractCodeFromResponse(data.content);
      if (code) {
        setEditorContent(code);
      }

      if (data.usage) {
        toast({
          title: "Code generated",
          description: `Tokens used: ${data.usage.inputTokens} in, ${data.usage.outputTokens} out`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!inputValue.trim() || generateMutation.isPending) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    generateMutation.mutate(inputValue);
    setInputValue("");
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(editorContent);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setEditorContent("// Generated code will appear here\n// Select a provider and enter a prompt to get started\n");
    toast({
      title: "Chat cleared",
      description: "Conversation history has been reset",
    });
  };

  const handleLoadYoutubeVideo = () => {
    const videoId = extractYouTubeVideoId(youtubeInputValue);
    if (videoId) {
      setYoutubeUrl(youtubeInputValue);
      toast({
        title: "Video loaded",
        description: "YouTube tutorial is now playing",
      });
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
    }
  };

  const handleClearYoutubeVideo = () => {
    setYoutubeUrl("");
    setYoutubeInputValue("");
    localStorage.removeItem(YOUTUBE_URL_STORAGE_KEY);
  };

  const figmaMutation = useMutation({
    mutationFn: async ({ fileKey, nodeId }: { fileKey: string; nodeId: string }) => {
      const res = await apiRequest("POST", "/api/figma/screenshot", {
        fileKey,
        nodeId,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Failed to load Figma design");
      }

      return res.json() as Promise<FigmaScreenshotResponse>;
    },
    onSuccess: (data) => {
      if (data.success && data.imageData) {
        if (data.imageData.startsWith("data:") || data.imageData.startsWith("http")) {
          setFigmaImageData(data.imageData);
        } else {
          setFigmaImageData(`data:${data.mimeType || "image/png"};base64,${data.imageData}`);
        }
        toast({
          title: "Design loaded",
          description: "Figma design preview is now available",
        });
      } else {
        toast({
          title: "Load failed",
          description: data.message || "Failed to load Figma design",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Load failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLoadFigmaDesign = () => {
    const parsed = parseFigmaUrl(figmaInputValue);
    if (parsed) {
      setFigmaUrl(figmaInputValue);
      figmaMutation.mutate(parsed);
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Figma URL (e.g., https://figma.com/design/ABC123/...?node-id=1-2)",
        variant: "destructive",
      });
    }
  };

  const handleClearFigmaDesign = () => {
    setFigmaUrl("");
    setFigmaInputValue("");
    setFigmaImageData(null);
    localStorage.removeItem(FIGMA_URL_STORAGE_KEY);
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider);
  const currentVideoId = extractYouTubeVideoId(youtubeUrl);

  const ChatPanel = (
    <motion.div 
      className="w-full h-full flex flex-col gap-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="relative overflow-hidden glass-panel p-4 rounded-xl flex items-center justify-between backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            AI Coding Assistant
          </h2>
          <p className="text-xs text-muted-foreground">Generate code with multiple AI providers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={provider} onValueChange={setProvider} data-testid="select-provider">
            <SelectTrigger className="w-[200px] min-h-11" data-testid="select-provider-trigger">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent className="min-w-[280px]">
              {PROVIDERS.map(p => (
                <SelectItem key={p.id} value={p.id} data-testid={`select-provider-${p.id}`} className="flex items-center">
                  <div className="flex items-center justify-between w-full gap-3">
                    <span>{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.badgeColor} font-medium`}>
                      {p.badge}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearChat}
            className="h-11 w-11 p-0"
            data-testid="button-clear-chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 relative overflow-hidden glass-panel rounded-xl p-4 backdrop-blur-xl bg-gradient-to-br from-white/5 via-transparent to-white/5 border border-white/10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/2 to-transparent pointer-events-none" />
        <div className="space-y-4 relative z-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground" data-testid="chat-empty-state">
              <Bot className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Enter a prompt below to generate code</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary/20 text-primary-foreground"
                        : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    <span className="text-[10px] opacity-50 mt-1 block">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {generateMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
              data-testid="loading-indicator"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-sm text-muted-foreground">
                  Generating with {selectedProvider?.name}...
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <motion.div 
        className="relative overflow-hidden glass-panel p-3 rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-xl"
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe the code you want to generate..."
          className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-0 relative z-10 text-base"
          data-testid="input-prompt"
        />
        <div className="flex items-center justify-between mt-2 relative z-10">
          <span className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSubmit}
              disabled={!inputValue.trim() || generateMutation.isPending}
              className="gap-2 min-h-11 px-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
              data-testid="button-submit"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Generate
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );

  const EditorPanel = (
    <motion.div 
      className="h-full flex flex-col glass-panel rounded-xl overflow-hidden border-primary/20 backdrop-blur-xl bg-gradient-to-br from-white/5 via-transparent to-white/5 border border-white/10 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
    >
      <div className="h-12 border-b border-white/5 bg-gradient-to-r from-black/30 via-black/20 to-black/30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Generated Code</span>
          {selectedProvider && (
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded" data-testid="text-provider-name">
              via {selectedProvider.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyCode}
            className="gap-2 h-11 min-w-11"
            data-testid="button-copy-code"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
          {!isMobile && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsFigmaPanelOpen(!isFigmaPanelOpen);
                  if (!isFigmaPanelOpen) setIsYoutubePanelOpen(false);
                }}
                className={`gap-2 h-11 min-w-11 ${isFigmaPanelOpen ? "bg-purple-500/20" : ""}`}
                data-testid="button-toggle-figma"
              >
                <Palette className="w-4 h-4 text-purple-500" />
                {isFigmaPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsYoutubePanelOpen(!isYoutubePanelOpen);
                  if (!isYoutubePanelOpen) setIsFigmaPanelOpen(false);
                }}
                className={`gap-2 h-11 min-w-11 ${isYoutubePanelOpen ? "bg-red-500/20" : ""}`}
                data-testid="button-toggle-youtube"
              >
                <Youtube className="w-4 h-4 text-red-500" />
                {isYoutubePanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1" data-testid="monaco-editor-container">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={editorContent}
          onChange={(value) => setEditorContent(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 16 },
          }}
        />
      </div>
    </motion.div>
  );

  const YoutubePanel = (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden" data-testid="youtube-panel">
      <div className="h-12 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-sm">Tutorial Video</span>
        </div>
        {isMobile && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsYoutubePanelOpen(false)}
            className="h-11 w-11 p-0"
            data-testid="button-close-youtube-mobile"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-3 border-b border-white/5">
        <div className="flex gap-2">
          <Input
            value={youtubeInputValue}
            onChange={(e) => setYoutubeInputValue(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="flex-1 min-h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLoadYoutubeVideo();
              }
            }}
            data-testid="input-youtube-url"
          />
          <Button
            size="sm"
            onClick={handleLoadYoutubeVideo}
            className="px-4 min-h-11"
            data-testid="button-load-youtube"
          >
            Load
          </Button>
          {currentVideoId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearYoutubeVideo}
              className="h-11 w-11 p-0"
              data-testid="button-clear-youtube"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-black/50 flex items-center justify-center" data-testid="youtube-player-container">
        {currentVideoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${currentVideoId}`}
            title="YouTube Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            data-testid="youtube-iframe"
          />
        ) : (
          <div className="text-center text-muted-foreground p-8" data-testid="youtube-empty-state">
            <Youtube className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No video loaded</p>
            <p className="text-xs mt-1">Paste a YouTube URL above to watch tutorials while coding</p>
          </div>
        )}
      </div>
    </div>
  );

  const FigmaPanel = (
    <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-purple-500/5 via-white/5 to-transparent border border-purple-500/20 shadow-2xl" data-testid="figma-panel">
      <div className="h-12 border-b border-purple-500/10 bg-gradient-to-r from-purple-900/30 via-black/20 to-purple-900/30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-500" />
          <span className="font-semibold text-sm">Design Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {figmaUrl && (
            <a
              href={figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              data-testid="link-open-figma"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Figma
            </a>
          )}
          {isMobile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFigmaPanelOpen(false)}
              className="h-11 w-11 p-0"
              data-testid="button-close-figma-mobile"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-purple-500/10">
        <div className="flex gap-2">
          <Input
            value={figmaInputValue}
            onChange={(e) => setFigmaInputValue(e.target.value)}
            placeholder="Paste Figma URL (e.g., https://figma.com/design/...)..."
            className="flex-1 min-h-11 bg-black/20 border-purple-500/20 focus:border-purple-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLoadFigmaDesign();
              }
            }}
            data-testid="input-figma-url"
          />
          <Button
            size="sm"
            onClick={handleLoadFigmaDesign}
            disabled={figmaMutation.isPending}
            className="px-4 min-h-11 bg-purple-600 hover:bg-purple-700"
            data-testid="button-load-figma"
          >
            {figmaMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Load"
            )}
          </Button>
          {figmaImageData && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearFigmaDesign}
              className="h-11 w-11 p-0"
              data-testid="button-clear-figma"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Supports: figma.com/design/FILE_KEY/...?node-id=X-Y
        </p>
      </div>

      <div className="flex-1 bg-gradient-to-b from-black/30 to-purple-900/10 flex items-center justify-center overflow-auto p-4" data-testid="figma-preview-container">
        {figmaMutation.isPending ? (
          <div className="text-center text-muted-foreground" data-testid="figma-loading">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            </motion.div>
            <p className="text-sm">Loading design preview...</p>
            <p className="text-xs mt-1 text-purple-400">Fetching from Figma</p>
          </div>
        ) : figmaImageData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={figmaImageData}
              alt="Figma Design Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-purple-500/20"
              data-testid="figma-preview-image"
            />
          </motion.div>
        ) : (
          <div className="text-center text-muted-foreground p-8" data-testid="figma-empty-state">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Image className="w-16 h-16 mx-auto mb-4 opacity-30 text-purple-500" />
            </motion.div>
            <p className="text-sm">No design loaded</p>
            <p className="text-xs mt-1">Paste a Figma URL above to preview your design while coding</p>
            <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-xs font-medium text-purple-400 mb-1">Tip: Include node-id</p>
              <p className="text-[10px] text-muted-foreground">
                To preview a specific frame or component, include the node-id parameter in your URL
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Layout>
        <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {ChatPanel}
          </div>
          
          <div className="flex-1 min-h-0">
            {EditorPanel}
          </div>

          {!isYoutubePanelOpen && !isFigmaPanelOpen && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsFigmaPanelOpen(true);
                  setIsYoutubePanelOpen(false);
                }}
                className="flex-1 gap-2"
                variant="outline"
                data-testid="button-open-figma-mobile"
              >
                <Palette className="w-4 h-4 text-purple-500" />
                Design Preview
              </Button>
              <Button
                onClick={() => {
                  setIsYoutubePanelOpen(true);
                  setIsFigmaPanelOpen(false);
                }}
                className="flex-1 gap-2"
                variant="outline"
                data-testid="button-open-youtube-mobile"
              >
                <Youtube className="w-4 h-4 text-red-500" />
                Tutorial Video
              </Button>
            </div>
          )}

          {isFigmaPanelOpen && (
            <div className="flex-1 min-h-[300px]">
              {FigmaPanel}
            </div>
          )}

          {isYoutubePanelOpen && (
            <div className="flex-1 min-h-[300px]">
              {YoutubePanel}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {ChatPanel}
        </div>

        <div className="flex-1">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-xl"
            data-testid="resizable-panel-group"
          >
            <ResizablePanel defaultSize={(isYoutubePanelOpen || isFigmaPanelOpen) ? 60 : 100} minSize={30} data-testid="resizable-editor-panel">
              {EditorPanel}
            </ResizablePanel>
            
            {isFigmaPanelOpen && (
              <>
                <ResizableHandle withHandle data-testid="resizable-handle-figma" />
                <ResizablePanel defaultSize={40} minSize={25} data-testid="resizable-figma-panel">
                  {FigmaPanel}
                </ResizablePanel>
              </>
            )}

            {isYoutubePanelOpen && (
              <>
                <ResizableHandle withHandle data-testid="resizable-handle" />
                <ResizablePanel defaultSize={40} minSize={25} data-testid="resizable-youtube-panel">
                  {YoutubePanel}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </Layout>
  );
}
