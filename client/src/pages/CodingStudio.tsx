import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot,  
  Code2, 
  Play, 
  MessageSquare, 
  Cpu, 
  Terminal, 
  Sparkles,
  Maximize2,
  Save,
  Share2,
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import bgImage from "@assets/generated_images/futuristic_code_editor_background_with_subtle_data_streams.png";
import { 
  DiffViewer, 
  PendingChangesList, 
  type PendingChange, 
  type FileDiff,
  createUnifiedDiff 
} from "@/components/diff/DiffViewer";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { DecisionTraceViewer } from "@/components/DecisionTraceViewer";

const agents = [
  { id: "orchestrator", name: "Orchestrator", role: "Project Manager", color: "text-primary", bg: "bg-primary/10" },
  { id: "claude", name: "Claude 3.5", role: "Senior Architect", color: "text-orange-400", bg: "bg-orange-500/10" },
  { id: "gpt", name: "GPT-4o", role: "Code Generator", color: "text-green-400", bg: "bg-green-500/10" },
  { id: "grok", name: "Grok", role: "Optimization & Security", color: "text-purple-400", bg: "bg-purple-500/10" },
];

const initialConversation = [
  { id: 1, agentId: "orchestrator", text: "User Request: Create a secure API endpoint for processing Stripe payments with webhook verification." },
  { id: 2, agentId: "claude", text: "I'll outline the architecture. We need a middleware for signature verification and an async handler for the webhook events to prevent timeouts." },
  { id: 3, agentId: "gpt", text: "Agreed. I'm drafting the Express route handler and the Stripe verification logic now." },
  { id: 4, agentId: "grok", text: "Scanning for potential replay attack vulnerabilities. Suggesting we implement a timestamp check alongside the signature." },
];

const sampleDiff: FileDiff = {
  id: "diff-1",
  filePath: "server/routes/webhook.ts",
  operation: "create",
  additions: 32,
  deletions: 0,
  hunks: [
    {
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: 32,
      lines: [
        { type: "add", content: "import express from 'express';", newLineNumber: 1 },
        { type: "add", content: "import Stripe from 'stripe';", newLineNumber: 2 },
        { type: "add", content: "", newLineNumber: 3 },
        { type: "add", content: "const stripe = new Stripe(process.env.STRIPE_KEY!);", newLineNumber: 4 },
        { type: "add", content: "const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;", newLineNumber: 5 },
        { type: "add", content: "", newLineNumber: 6 },
        { type: "add", content: "export const webhookHandler = express.Router();", newLineNumber: 7 },
        { type: "add", content: "", newLineNumber: 8 },
        { type: "add", content: "webhookHandler.post('/', express.raw({type: 'application/json'}), async (req, res) => {", newLineNumber: 9 },
        { type: "add", content: "  const sig = req.headers['stripe-signature'] as string;", newLineNumber: 10 },
        { type: "add", content: "  let event: Stripe.Event;", newLineNumber: 11 },
        { type: "add", content: "", newLineNumber: 12 },
        { type: "add", content: "  try {", newLineNumber: 13 },
        { type: "add", content: "    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);", newLineNumber: 14 },
        { type: "add", content: "  } catch (err) {", newLineNumber: 15 },
        { type: "add", content: "    console.error('Webhook signature verification failed:', err);", newLineNumber: 16 },
        { type: "add", content: "    return res.status(400).send(`Webhook Error: ${err.message}`);", newLineNumber: 17 },
        { type: "add", content: "  }", newLineNumber: 18 },
        { type: "add", content: "", newLineNumber: 19 },
        { type: "add", content: "  // Handle the event", newLineNumber: 20 },
        { type: "add", content: "  switch (event.type) {", newLineNumber: 21 },
        { type: "add", content: "    case 'payment_intent.succeeded':", newLineNumber: 22 },
        { type: "add", content: "      await handlePaymentSuccess(event.data.object);", newLineNumber: 23 },
        { type: "add", content: "      break;", newLineNumber: 24 },
        { type: "add", content: "    case 'payment_intent.payment_failed':", newLineNumber: 25 },
        { type: "add", content: "      await handlePaymentFailure(event.data.object);", newLineNumber: 26 },
        { type: "add", content: "      break;", newLineNumber: 27 },
        { type: "add", content: "    default:", newLineNumber: 28 },
        { type: "add", content: "      console.log(`Unhandled event type ${event.type}`);", newLineNumber: 29 },
        { type: "add", content: "  }", newLineNumber: 30 },
        { type: "add", content: "", newLineNumber: 31 },
        { type: "add", content: "  res.json({ received: true });", newLineNumber: 32 },
        { type: "add", content: "});", newLineNumber: 33 },
      ],
    },
  ],
};

const initialPendingChanges: PendingChange[] = [
  {
    id: "change-1",
    description: "Add Stripe webhook handler with signature verification",
    files: [sampleDiff],
    status: "pending",
    createdAt: new Date().toISOString(),
    agentId: "gpt",
  },
];

export default function CodingStudio() {
  const [messages, setMessages] = useState(initialConversation);
  const [inputValue, setInputValue] = useState("");
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(initialPendingChanges);
  const [activeTab, setActiveTab] = useState<"editor" | "diff" | "monaco" | "traces">("editor");
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<Array<{ changeId: string; action: string; timestamp: string }>>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const pendingCount = pendingChanges.filter((c) => c.status === "pending").length;

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMsg = {
      id: messages.length + 1,
      agentId: "orchestrator",
      text: `User Request: ${inputValue}`,
    };
    
    setMessages([...messages, newMsg]);
    setInputValue("");
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        agentId: "claude",
        text: "Acknowledged. Analyzing request parameters and adjusting architecture...",
      }]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          agentId: "gpt",
          text: "Generating code changes. Once complete, they'll appear in the Diff Preview tab for your review.",
        }]);

        setTimeout(() => {
          const newChange: PendingChange = {
            id: `change-${Date.now()}`,
            description: `Changes for: ${inputValue.slice(0, 50)}${inputValue.length > 50 ? "..." : ""}`,
            files: [
              {
                id: `file-${Date.now()}`,
                filePath: "server/routes/api.ts",
                operation: "modify",
                additions: 5,
                deletions: 2,
                hunks: [
                  {
                    oldStart: 10,
                    oldLines: 5,
                    newStart: 10,
                    newLines: 8,
                    lines: [
                      { type: "context", content: "// API Routes", oldLineNumber: 10, newLineNumber: 10 },
                      { type: "remove", content: "app.get('/api/old', handler);", oldLineNumber: 11 },
                      { type: "remove", content: "app.get('/api/deprecated', handler);", oldLineNumber: 12 },
                      { type: "add", content: "// Updated based on user request", newLineNumber: 11 },
                      { type: "add", content: "app.get('/api/new', newHandler);", newLineNumber: 12 },
                      { type: "add", content: "app.post('/api/action', actionHandler);", newLineNumber: 13 },
                      { type: "add", content: "app.delete('/api/item/:id', deleteHandler);", newLineNumber: 14 },
                      { type: "add", content: "", newLineNumber: 15 },
                      { type: "context", content: "export default app;", oldLineNumber: 13, newLineNumber: 16 },
                    ],
                  },
                ],
              },
            ],
            status: "pending",
            createdAt: new Date().toISOString(),
            agentId: "gpt",
          };

          setPendingChanges((prev) => [...prev, newChange]);
          setActiveTab("diff");

          setMessages(prev => [...prev, {
            id: prev.length + 1,
            agentId: "orchestrator",
            text: "New changes are ready for review. Please check the Diff Preview tab to approve or reject.",
          }]);
        }, 1500);
      }, 1000);
    }, 1000);
  };

  const handleApprove = async (changeId: string) => {
    setIsProcessing(true);
    
    await new Promise((resolve) => setTimeout(resolve, 800));

    setPendingChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, status: "approved" as const } : c))
    );

    setApprovalHistory((prev) => [
      ...prev,
      { changeId, action: "approved", timestamp: new Date().toISOString() },
    ]);

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        agentId: "orchestrator",
        text: `Changes approved and applied successfully. The code has been committed to your working branch.`,
      },
    ]);

    setIsProcessing(false);
  };

  const handleReject = async (changeId: string) => {
    setIsProcessing(true);
    
    await new Promise((resolve) => setTimeout(resolve, 500));

    setPendingChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, status: "rejected" as const } : c))
    );

    setApprovalHistory((prev) => [
      ...prev,
      { changeId, action: "rejected", timestamp: new Date().toISOString() },
    ]);

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        agentId: "orchestrator",
        text: `Changes rejected. Would you like me to revise the approach?`,
      },
    ]);

    setIsProcessing(false);
  };

  const handleApproveAll = async () => {
    setIsProcessing(true);
    
    const pending = pendingChanges.filter((c) => c.status === "pending");
    
    for (const change of pending) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPendingChanges((prev) =>
        prev.map((c) => (c.id === change.id ? { ...c, status: "approved" as const } : c))
      );
      setApprovalHistory((prev) => [
        ...prev,
        { changeId: change.id, action: "approved", timestamp: new Date().toISOString() },
      ]);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        agentId: "orchestrator",
        text: `All ${pending.length} pending changes have been approved and applied.`,
      },
    ]);

    setIsProcessing(false);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
        
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                AI Swarm Chat
              </h2>
              <p className="text-xs text-muted-foreground">Real-time cross-agent collaboration</p>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                  data-testid="badge-pending-count"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {pendingCount} pending
                </Badge>
              )}
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">
                Active Session
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1 glass-panel rounded-xl p-4">
            <div className="space-y-6">
              {messages.map((msg, idx) => {
                const agent = agents.find(a => a.id === msg.agentId);
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col gap-2"
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${agent?.bg} ${agent?.color}`}>
                        {agent?.name[0]}
                      </div>
                      <span className={`text-xs font-bold ${agent?.color}`}>{agent?.name}</span>
                      <span className="text-[10px] text-muted-foreground border border-white/5 px-1.5 py-0.5 rounded-full">{agent?.role}</span>
                    </div>
                    
                    <div className="pl-8 text-sm text-muted-foreground leading-relaxed">
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="glass-panel p-2 rounded-xl flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Inject instructions into the swarm..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-3 py-2"
              data-testid="input-swarm-message"
            />
            <Button size="sm" onClick={handleSendMessage} className="bg-primary/20 hover:bg-primary/30 text-primary" data-testid="button-instruct">
              <Sparkles className="w-4 h-4 mr-2" /> Instruct
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden border-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "editor" | "diff" | "monaco")} className="flex-1 flex flex-col">
            <div className="h-12 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger 
                  value="editor" 
                  className="data-[state=active]:bg-white/10"
                  data-testid="tab-editor"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="monaco" 
                  className="data-[state=active]:bg-white/10"
                  data-testid="tab-monaco"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Code Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="diff" 
                  className="data-[state=active]:bg-white/10 relative"
                  data-testid="tab-diff"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Diff Preview
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="traces" 
                  className="data-[state=active]:bg-white/10"
                  data-testid="tab-traces"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Decision Trace
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <Switch id="auto-deploy" data-testid="switch-auto-deploy" />
                  <Label htmlFor="auto-deploy" className="text-xs text-muted-foreground cursor-pointer">Auto-Deploy</Label>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" data-testid="button-save"><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" data-testid="button-share"><Share2 className="w-4 h-4" /></Button>
                <Separator orientation="vertical" className="h-4" />
                <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500 text-white gap-2" data-testid="button-deploy">
                  <Play className="w-3 h-3" /> Deploy
                </Button>
              </div>
            </div>

            <TabsContent value="editor" className="flex-1 m-0 flex flex-col">
              <div className="flex-1 relative bg-[#0d1117] p-6 font-mono text-sm overflow-auto">
                <div 
                  className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="relative z-10 text-gray-300 leading-relaxed">
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">1</div>
                    <div><span className="text-purple-400">import</span> express <span className="text-purple-400">from</span> <span className="text-green-400">'express'</span>;</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">2</div>
                    <div><span className="text-purple-400">import</span> Stripe <span className="text-purple-400">from</span> <span className="text-green-400">'stripe'</span>;</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">3</div>
                    <div>&nbsp;</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">4</div>
                    <div><span className="text-blue-400">const</span> app = <span className="text-yellow-300">express</span>();</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">5</div>
                    <div><span className="text-blue-400">const</span> stripe = <span className="text-purple-400">new</span> <span className="text-yellow-300">Stripe</span>(process.env.STRIPE_KEY);</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">6</div>
                    <div>&nbsp;</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">7</div>
                    <div className="text-gray-500">// AI Generated: Webhook Handler for Payment Processing</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">8</div>
                    <div>app.<span className="text-yellow-300">post</span>(<span className="text-green-400">'/webhook'</span>, express.<span className="text-yellow-300">raw</span>(&#123;type: <span className="text-green-400">'application/json'</span>&#125;), (req, res) =&gt; &#123;</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">9</div>
                    <div>&nbsp;&nbsp;<span className="text-blue-400">const</span> sig = req.headers[<span className="text-green-400">'stripe-signature'</span>];</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-gray-600 select-none text-right w-6">10</div>
                    <div>&nbsp;&nbsp;<span className="text-blue-400">let</span> event;</div>
                  </div>
                </div>
                
                <motion.div 
                  className="w-2 h-4 bg-primary absolute top-[220px] left-[320px]"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              </div>

              <div className="h-48 border-t border-white/5 bg-black/40">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Output Console</span>
                </div>
                <div className="p-4 font-mono text-xs space-y-2">
                  <div className="text-green-400">➜  ~ npm run dev</div>
                  <div className="text-gray-400">   v4.1.2 ready in 345ms</div>
                  <div className="text-blue-400">   [Orchestrator] Watching for file changes...</div>
                  <div className="text-yellow-400">   [System] Memory usage at 45%</div>
                  {approvalHistory.length > 0 && (
                    <div className="text-green-400">
                      [System] {approvalHistory.length} change(s) applied to working branch
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="monaco" className="flex-1 m-0 overflow-hidden">
              <CodeEditor
                onSave={async (path, content) => {
                  console.log("Saving:", path, content.length, "chars");
                }}
              />
            </TabsContent>

            <TabsContent value="diff" className="flex-1 m-0 overflow-auto p-4 bg-black/20">
              <PendingChangesList
                changes={pendingChanges}
                onApprove={handleApprove}
                onReject={handleReject}
                onApproveAll={handleApproveAll}
                isProcessing={isProcessing}
              />

              {pendingChanges.filter((c) => c.status !== "pending").length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Change History</h3>
                  <div className="space-y-2">
                    {pendingChanges
                      .filter((c) => c.status !== "pending")
                      .map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center justify-between glass-panel p-3 rounded-lg"
                          data-testid={`history-${change.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {change.status === "approved" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className="text-sm">{change.description}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(change.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="traces" className="flex-1 m-0 overflow-auto p-4 bg-black/20">
              {currentRunId ? (
                <DecisionTraceViewer runId={currentRunId} isOpen={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center" data-testid="traces-empty-state">
                  <Brain className="w-12 h-12 text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">No Agent Run Selected</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Decision traces show the step-by-step reasoning behind AI agent decisions. 
                    Run an agent task to see the trace of why it made each choice.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter Run ID to view traces..."
                    className="mt-4 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary w-64"
                    onChange={(e) => setCurrentRunId(e.target.value || null)}
                    data-testid="input-run-id"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
