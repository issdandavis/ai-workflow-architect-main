import { useState } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, Users, Play, Send, Plus, Loader2, ArrowLeft, 
  Code, Search, Sparkles, Check, X, FileCode, ChevronDown, ChevronRight,
  AlertCircle, Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Provider {
  id: string;
  name: string;
  role: string;
  signOff: string;
}

interface RoundtableMessage {
  id: string;
  sessionId: string;
  senderType: "user" | "ai" | "system";
  senderId: string | null;
  provider: string | null;
  model: string | null;
  content: string;
  signature: string | null;
  sequenceNumber: number;
  tokensUsed: number | null;
  responseTimeMs: number | null;
  createdAt: string;
}

interface RoundtableSession {
  id: string;
  title: string;
  topic: string | null;
  activeProviders: string[];
  orchestrationMode: string;
  status: string;
  currentTurn: number;
  maxTurns: number;
  createdAt: string;
  messages?: RoundtableMessage[];
}

interface ImprovementSuggestion {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: string;
  lineStart?: number;
  lineEnd?: number;
  suggestedCode?: string;
}

interface AnalysisResult {
  summary: string;
  issues: string[];
  suggestions: ImprovementSuggestion[];
  metrics?: {
    complexity?: number;
    maintainability?: number;
    linesOfCode?: number;
  };
}

interface CodeAnalysis {
  id: number;
  filePath: string;
  content: string;
  analysisResult: AnalysisResult;
}

interface CodeProposal {
  id: number;
  suggestionId: number;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  status: "pending" | "approved" | "rejected" | "applied";
  approvedBy: string | null;
  createdAt: string;
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  openai: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  anthropic: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  xai: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  perplexity: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  google: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-gray-500/10", text: "text-gray-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  high: { bg: "bg-red-500/10", text: "text-red-400" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  approved: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  applied: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
};

function NewSessionDialog({ providers, onCreated }: { providers: Provider[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const { toast } = useToast();

  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roundtable/sessions", {
        title,
        topic: topic || undefined,
        activeProviders: selectedProviders,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session created", description: "Your roundtable session is ready." });
      setOpen(false);
      setTitle("");
      setTopic("");
      setSelectedProviders([]);
      onCreated();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleProvider = (id: string) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-session">
          <Plus className="w-4 h-4" /> New Roundtable
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start AI Roundtable</DialogTitle>
          <DialogDescription>
            Create a new discussion where multiple AIs can collaborate and debate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Architecture Review"
              data-testid="input-session-title"
            />
          </div>
          <div>
            <Label htmlFor="topic">Discussion Topic</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the AIs discuss?"
              rows={3}
              data-testid="input-session-topic"
            />
          </div>
          <div>
            <Label>Select AI Participants</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {providers.map((provider) => {
                const colors = PROVIDER_COLORS[provider.id] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" };
                const isSelected = selectedProviders.includes(provider.id);
                return (
                  <label
                    key={provider.id}
                    className={`flex items-center space-x-2 p-2 rounded-lg border ${
                      isSelected ? colors.border : "border-white/10"
                    } ${isSelected ? colors.bg : "bg-white/5"} cursor-pointer transition-colors`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProvider(provider.id)}
                      data-testid={`checkbox-provider-${provider.id}`}
                    />
                    <div>
                      <span className={`font-medium ${isSelected ? colors.text : ""}`}>
                        {provider.name}
                      </span>
                      <p className="text-xs text-muted-foreground">{provider.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <Button
            onClick={() => createSession.mutate()}
            disabled={!title || selectedProviders.length === 0 || createSession.isPending}
            className="w-full"
            data-testid="button-create-session"
          >
            {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionView({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [userMessage, setUserMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery<RoundtableSession>({
    queryKey: ["/api/roundtable/sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/roundtable/sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/roundtable/sessions/${sessionId}/message`, { content: userMessage });
      return res.json();
    },
    onSuccess: () => {
      setUserMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/roundtable/sessions", sessionId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const runRound = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/roundtable/sessions/${sessionId}/round`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roundtable/sessions", sessionId] });
      toast({ title: "Round complete", description: "All AIs have responded." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const messages = session.messages || [];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold" data-testid="text-session-title">{session.title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={session.status === "active" ? "default" : "secondary"} data-testid="badge-session-status">
              {session.status}
            </Badge>
            <span>Turn {session.currentTurn} / {session.maxTurns}</span>
            <span>•</span>
            <span>{session.activeProviders?.length || 0} AIs</span>
          </div>
        </div>
        <Button
          onClick={() => runRound.mutate()}
          disabled={runRound.isPending || session.status !== "active"}
          className="gap-2"
          data-testid="button-run-round"
        >
          {runRound.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run AI Round
        </Button>
      </div>

      {session.topic && (
        <div className="bg-white/5 rounded-lg p-3 mb-4 border border-white/10">
          <p className="text-sm text-muted-foreground">
            <strong>Topic:</strong> {session.topic}
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message: RoundtableMessage, index: number) => {
              const colors = message.provider
                ? PROVIDER_COLORS[message.provider] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" }
                : { bg: "bg-white/5", text: "text-white", border: "border-white/10" };

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
                  data-testid={`message-${message.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${colors.text}`}>
                      {message.senderType === "user"
                        ? "You"
                        : message.senderType === "system"
                        ? "System"
                        : message.provider?.toUpperCase() || "AI"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.tokensUsed && `${message.tokensUsed} tokens`}
                      {message.responseTimeMs && ` • ${(message.responseTimeMs / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.signature && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{message.signature}</p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation or run an AI round.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
        <Input
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Type your message to the roundtable..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && userMessage && sendMessage.mutate()}
          disabled={session.status !== "active"}
          data-testid="input-user-message"
        />
        <Button
          onClick={() => sendMessage.mutate()}
          disabled={!userMessage || sendMessage.isPending || session.status !== "active"}
          data-testid="button-send-message"
        >
          {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function AnalyzeCodeDialog({ onAnalyzed }: { onAnalyzed: (analysis: CodeAnalysis, result: AnalysisResult) => void }) {
  const [open, setOpen] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [content, setContent] = useState("");
  const [provider, setProvider] = useState<string>("anthropic");
  const { toast } = useToast();

  const analyzeCode = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/code-improvement/analyze", {
        filePath,
        content,
        provider: provider || undefined,
      });
      return res.json();
    },
    onSuccess: (data: { analysis: CodeAnalysis; result: AnalysisResult }) => {
      toast({ title: "Analysis complete", description: `Found ${data.result.suggestions.length} suggestions.` });
      setOpen(false);
      onAnalyzed(data.analysis, data.result);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-analyze-code">
          <Search className="w-4 h-4" /> Analyze Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analyze Code for Improvements</DialogTitle>
          <DialogDescription>
            Paste your code to get AI-powered improvement suggestions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="filePath">File Path</Label>
            <Input
              id="filePath"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g., src/components/MyComponent.tsx"
              data-testid="input-file-path"
            />
          </div>
          <div>
            <Label htmlFor="content">Code Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your code here..."
              rows={12}
              className="font-mono text-sm"
              data-testid="textarea-code-content"
            />
          </div>
          <div>
            <Label htmlFor="provider">AI Provider (Optional)</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger data-testid="select-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                <SelectItem value="google">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => analyzeCode.mutate()}
            disabled={!filePath || !content || analyzeCode.isPending}
            className="w-full"
            data-testid="button-submit-analyze"
          >
            {analyzeCode.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyze Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionCard({ 
  suggestion, 
  index, 
  analysisId, 
  onGenerated 
}: { 
  suggestion: ImprovementSuggestion; 
  index: number; 
  analysisId: number;
  onGenerated: () => void;
}) {
  const { toast } = useToast();
  const priorityColors = PRIORITY_COLORS[suggestion.priority] || PRIORITY_COLORS.medium;

  const generateProposal = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/code-improvement/generate", {
        analysisId,
        suggestionIndex: index,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Proposal generated", description: "View it in the Proposals section." });
      onGenerated();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg border border-white/10 bg-white/5"
      data-testid={`suggestion-card-${index}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold">{suggestion.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${priorityColors.bg} ${priorityColors.text} border-0`}>
            {suggestion.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {suggestion.category}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
      {suggestion.lineStart && (
        <p className="text-xs text-muted-foreground mb-3">
          Lines: {suggestion.lineStart}{suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart ? `-${suggestion.lineEnd}` : ""}
        </p>
      )}
      <Button
        size="sm"
        onClick={() => generateProposal.mutate()}
        disabled={generateProposal.isPending}
        data-testid={`button-generate-proposal-${index}`}
      >
        {generateProposal.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Code className="w-3 h-3 mr-1" />}
        Generate Proposal
      </Button>
    </motion.div>
  );
}

function ProposalDiffViewer({ proposal, onStatusChange }: { proposal: CodeProposal; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();
  const statusColors = STATUS_COLORS[proposal.status] || STATUS_COLORS.pending;

  const approveProposal = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/code-improvement/proposals/${proposal.id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Proposal has been approved." });
      onStatusChange();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectProposal = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/code-improvement/proposals/${proposal.id}/reject`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Proposal has been rejected." });
      onStatusChange();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applyProposal = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/code-improvement/proposals/${proposal.id}/apply`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Applied", description: "Proposal has been applied." });
      onStatusChange();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isProcessing = approveProposal.isPending || rejectProposal.isPending || applyProposal.isPending;

  const originalLines = proposal.originalContent.split("\n");
  const proposedLines = proposal.proposedContent.split("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl overflow-hidden"
      data-testid={`proposal-${proposal.id}`}
    >
      <div className="p-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white/10 rounded">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <FileCode className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm">{proposal.filePath}</span>
            <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border`} data-testid={`status-proposal-${proposal.id}`}>
              {proposal.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {proposal.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => rejectProposal.mutate()}
                  disabled={isProcessing}
                  data-testid={`button-reject-proposal-${proposal.id}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => approveProposal.mutate()}
                  disabled={isProcessing}
                  data-testid={`button-approve-proposal-${proposal.id}`}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
            {proposal.status === "approved" && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => applyProposal.mutate()}
                disabled={isProcessing}
                data-testid={`button-apply-proposal-${proposal.id}`}
              >
                {applyProposal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                Apply
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Created: {new Date(proposal.createdAt).toLocaleString()}
          {proposal.approvedBy && ` • Approved by: ${proposal.approvedBy}`}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-[400px]">
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="bg-[#0d1117]">
                  <div className="px-4 py-2 bg-red-500/10 text-red-300 text-xs font-semibold border-b border-white/5">
                    Original
                  </div>
                  <div className="font-mono text-xs">
                    {originalLines.map((line, idx) => (
                      <div key={idx} className="flex hover:bg-white/5">
                        <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="px-2 text-gray-400 whitespace-pre overflow-x-auto">
                          {line}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0d1117]">
                  <div className="px-4 py-2 bg-green-500/10 text-green-300 text-xs font-semibold border-b border-white/5">
                    Proposed
                  </div>
                  <div className="font-mono text-xs">
                    {proposedLines.map((line, idx) => (
                      <div key={idx} className="flex hover:bg-white/5">
                        <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="px-2 text-gray-400 whitespace-pre overflow-x-auto">
                          {line}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CodeImprovementTab() {
  const queryClient = useQueryClient();
  const [currentAnalysis, setCurrentAnalysis] = useState<{ analysis: CodeAnalysis; result: AnalysisResult } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<CodeProposal[]>({
    queryKey: ["/api/code-improvement/proposals", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/code-improvement/proposals" 
        : `/api/code-improvement/proposals?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch proposals");
      return res.json();
    },
  });

  const handleAnalyzed = (analysis: CodeAnalysis, result: AnalysisResult) => {
    setCurrentAnalysis({ analysis, result });
  };

  const refreshProposals = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/code-improvement/proposals"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Code Improvement</h2>
        <AnalyzeCodeDialog onAnalyzed={handleAnalyzed} />
      </div>

      {currentAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass-panel p-6 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Analysis Results</h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentAnalysis(null)} data-testid="button-clear-analysis">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground font-mono">{currentAnalysis.analysis.filePath}</p>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{currentAnalysis.result.summary}</p>
            </div>

            {currentAnalysis.result.issues.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  Issues ({currentAnalysis.result.issues.length})
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {currentAnalysis.result.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentAnalysis.result.metrics && (
              <div className="flex gap-4 mb-4 text-sm">
                {currentAnalysis.result.metrics.complexity && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentAnalysis.result.metrics.complexity}/10</div>
                    <div className="text-muted-foreground">Complexity</div>
                  </div>
                )}
                {currentAnalysis.result.metrics.maintainability && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentAnalysis.result.metrics.maintainability}/10</div>
                    <div className="text-muted-foreground">Maintainability</div>
                  </div>
                )}
                {currentAnalysis.result.metrics.linesOfCode && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentAnalysis.result.metrics.linesOfCode}</div>
                    <div className="text-muted-foreground">Lines</div>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Suggestions ({currentAnalysis.result.suggestions.length})
              </h4>
              <div className="space-y-3">
                {currentAnalysis.result.suggestions.map((suggestion, idx) => (
                  <SuggestionCard
                    key={idx}
                    suggestion={suggestion}
                    index={idx}
                    analysisId={currentAnalysis.analysis.id}
                    onGenerated={refreshProposals}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Proposals</h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {proposalsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-xl border border-white/5">
            <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No proposals yet. Analyze code and generate proposals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <ProposalDiffViewer
                key={proposal.id}
                proposal={proposal}
                onStatusChange={refreshProposals}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscussionsTab({ 
  providers, 
  sessions, 
  isLoading, 
  onSelectSession, 
  onCreated 
}: { 
  providers: Provider[]; 
  sessions: RoundtableSession[];
  isLoading: boolean;
  onSelectSession: (id: string) => void;
  onCreated: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <NewSessionDialog providers={providers} onCreated={onCreated} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-white/5">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No roundtable sessions yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI roundtable to start collaborative discussions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session: RoundtableSession, i: number) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-6 rounded-2xl border border-white/5 cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => onSelectSession(session.id)}
              data-testid={`card-session-${session.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{session.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {session.topic || "No topic set"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={session.status === "active" ? "default" : "secondary"}>
                    {session.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Turn {session.currentTurn}/{session.maxTurns}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {session.activeProviders?.map((providerId: string) => {
                  const colors = PROVIDER_COLORS[providerId] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" };
                  const provider = providers.find((p: Provider) => p.id === providerId);
                  return (
                    <Badge
                      key={providerId}
                      variant="outline"
                      className={`${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {provider?.name || providerId}
                    </Badge>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Roundtable() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("discussions");
  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["/api/roundtable/providers"],
    queryFn: async () => {
      const res = await fetch("/api/roundtable/providers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
  });

  const { data: sessions = [], isLoading } = useQuery<RoundtableSession[]>({
    queryKey: ["/api/roundtable/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/roundtable/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  if (selectedSessionId) {
    return (
      <Layout>
        <SessionView
          sessionId={selectedSessionId}
          onBack={() => setSelectedSessionId(null)}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-glow" data-testid="text-page-title">
            AI Roundtable
          </h1>
          <p className="text-muted-foreground">
            Collaborative discussions with multiple AI providers and code improvement tools.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6" data-testid="tabs-roundtable">
            <TabsTrigger value="discussions" data-testid="tab-discussions">
              <MessageCircle className="w-4 h-4 mr-2" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="code-improvement" data-testid="tab-code-improvement">
              <Code className="w-4 h-4 mr-2" />
              Code Improvement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions">
            <DiscussionsTab
              providers={providers}
              sessions={sessions}
              isLoading={isLoading}
              onSelectSession={setSelectedSessionId}
              onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/roundtable/sessions"] })}
            />
          </TabsContent>

          <TabsContent value="code-improvement">
            <CodeImprovementTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
