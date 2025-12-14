import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Share2
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import bgImage from "@assets/generated_images/futuristic_code_editor_background_with_subtle_data_streams.png";

// Mock data for the agents
const agents = [
  { id: "orchestrator", name: "Orchestrator", role: "Project Manager", color: "text-primary", bg: "bg-primary/10" },
  { id: "claude", name: "Claude 3.5", role: "Senior Architect", color: "text-orange-400", bg: "bg-orange-500/10" },
  { id: "gpt", name: "GPT-4o", role: "Code Generator", color: "text-green-400", bg: "bg-green-500/10" },
  { id: "grok", name: "Grok", role: "Optimization & Security", color: "text-purple-400", bg: "bg-purple-500/10" },
];

// Mock conversation
const initialConversation = [
  { id: 1, agentId: "orchestrator", text: "User Request: Create a secure API endpoint for processing Stripe payments with webhook verification." },
  { id: 2, agentId: "claude", text: "I'll outline the architecture. We need a middleware for signature verification and an async handler for the webhook events to prevent timeouts." },
  { id: 3, agentId: "gpt", text: "Agreed. I'm drafting the Express route handler and the Stripe verification logic now." },
  { id: 4, agentId: "grok", text: "Scanning for potential replay attack vulnerabilities. Suggesting we implement a timestamp check alongside the signature." },
  { id: 5, agentId: "gpt", text: "Code generated. Reviewing implementation...", code: `app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    return response.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      handlePaymentIntentSucceeded(paymentIntent);
      break;
    default:
      console.log(\`Unhandled event type \${event.type}\`);
  }

  response.send();
});` },
  { id: 6, agentId: "claude", text: "Structure looks solid. The error handling is robust." }
];

export default function CodingStudio() {
  const [messages, setMessages] = useState(initialConversation);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message mock
    const newMsg = {
      id: messages.length + 1,
      agentId: "orchestrator",
      text: `User Request: ${inputValue}`,
    };
    
    setMessages([...messages, newMsg]);
    setInputValue("");
    
    // Simulate AI response after delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        agentId: "claude",
        text: "Acknowledged. Analyzing request parameters and adjusting architecture...",
      }]);
    }, 1000);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
        
        {/* Left Panel: Collaborative Chat */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                AI Swarm Chat
              </h2>
              <p className="text-xs text-muted-foreground">Real-time cross-agent collaboration</p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">
              Active Session
            </Badge>
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
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col gap-2"
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
                      {msg.code && (
                        <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-blue-300 overflow-x-auto">
                          <pre>{msg.code}</pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* User Input Area */}
          <div className="glass-panel p-2 rounded-xl flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Inject instructions into the swarm..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-3 py-2"
            />
            <Button size="sm" onClick={handleSendMessage} className="bg-primary/20 hover:bg-primary/30 text-primary">
              <Sparkles className="w-4 h-4 mr-2" /> Instruct
            </Button>
          </div>
        </div>

        {/* Right Panel: Code Editor & Preview */}
        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden border-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          {/* Editor Toolbar */}
          <div className="h-12 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-muted-foreground">
                <Code2 className="w-3 h-3" />
                server/routes.ts
              </div>
              <span className="text-xs text-muted-foreground">Generated 2m ago</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Switch id="auto-deploy" />
                <Label htmlFor="auto-deploy" className="text-xs text-muted-foreground cursor-pointer">Auto-Deploy</Label>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Save className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Share2 className="w-4 h-4" /></Button>
              <Separator orientation="vertical" className="h-4" />
              <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500 text-white gap-2">
                <Play className="w-3 h-3" /> Deploy
              </Button>
            </div>
          </div>

          {/* Code Area */}
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
               {/* More fake code lines for visual density */}
               <div className="flex gap-4">
                 <div className="text-gray-600 select-none text-right w-6">9</div>
                 <div>&nbsp;&nbsp;<span className="text-blue-400">const</span> sig = req.headers[<span className="text-green-400">'stripe-signature'</span>];</div>
              </div>
              <div className="flex gap-4">
                 <div className="text-gray-600 select-none text-right w-6">10</div>
                 <div>&nbsp;&nbsp;<span className="text-blue-400">let</span> event;</div>
              </div>
            </div>
            
            {/* Cursor Animation */}
            <motion.div 
              className="w-2 h-4 bg-primary absolute top-[220px] left-[320px]"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          </div>

          {/* Terminal / Output */}
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
