import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Target,
  RotateCcw,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface DecisionTrace {
  id: string;
  agentRunId: string;
  stepNumber: number;
  stepType: string;
  decision: string;
  reasoning: string;
  confidence: string | null;
  alternatives: unknown[] | null;
  contextUsed: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt: string;
}

const stepTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  provider_selection: { icon: Target, color: "text-blue-400", label: "Provider Selection" },
  retry: { icon: RotateCcw, color: "text-yellow-400", label: "Retry" },
  fallback: { icon: AlertTriangle, color: "text-orange-400", label: "Fallback" },
  model_selection: { icon: Brain, color: "text-purple-400", label: "Model Selection" },
  context_analysis: { icon: Zap, color: "text-cyan-400", label: "Context Analysis" },
  tool_call: { icon: Zap, color: "text-green-400", label: "Tool Call" },
  response_generation: { icon: MessageSquare, color: "text-emerald-400", label: "Response Generated" },
  error_handling: { icon: AlertCircle, color: "text-red-400", label: "Error Handling" },
};

interface DecisionTraceViewerProps {
  runId: string;
  isOpen?: boolean;
}

export function DecisionTraceViewer({ runId, isOpen = true }: DecisionTraceViewerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const { data: traces, isLoading, error } = useQuery<DecisionTrace[]>({
    queryKey: ["decision-traces", runId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/run/${runId}/traces`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch traces");
      return res.json();
    },
    enabled: isOpen && !!runId,
    refetchInterval: 5000,
  });

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <Card className="bg-gray-900/50 border-gray-700" data-testid="decision-trace-viewer">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4 text-purple-400" />
          Decision Trace
          {traces && <Badge variant="outline" className="ml-2">{traces.length} steps</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8" data-testid="trace-loading">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading traces...</span>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm py-4" data-testid="trace-error">
            Failed to load decision traces
          </div>
        )}

        {traces && traces.length === 0 && (
          <div className="text-gray-500 text-sm py-4 text-center" data-testid="trace-empty">
            No decision traces recorded yet
          </div>
        )}

        {traces && traces.length > 0 && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              <AnimatePresence>
                {traces.map((trace, index) => {
                  const config = stepTypeConfig[trace.stepType] || {
                    icon: Brain,
                    color: "text-gray-400",
                    label: trace.stepType,
                  };
                  const Icon = config.icon;
                  const isExpanded = expandedSteps.has(trace.stepNumber);
                  const confidence = trace.confidence ? parseFloat(trace.confidence) * 100 : null;

                  return (
                    <motion.div
                      key={trace.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      data-testid={`trace-step-${trace.stepNumber}`}
                    >
                      <div
                        className="bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                        onClick={() => toggleStep(trace.stepNumber)}
                      >
                        <div className="p-3 flex items-start gap-3">
                          <div className="relative">
                            <div className={`p-2 rounded-full bg-gray-800 ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {index < traces.length - 1 && (
                              <div className="absolute top-10 left-1/2 w-px h-6 bg-gray-700 -translate-x-1/2" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs ${config.color} border-current`}>
                                  {config.label}
                                </Badge>
                                {confidence !== null && (
                                  <div className="flex items-center gap-1.5">
                                    <Progress 
                                      value={confidence} 
                                      className="w-12 h-1.5" 
                                    />
                                    <span className={`text-xs ${confidence >= 70 ? 'text-green-400' : confidence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {confidence.toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {trace.durationMs && (
                                  <span className="text-xs text-gray-500">{trace.durationMs}ms</span>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-gray-200 truncate" data-testid={`trace-decision-${trace.stepNumber}`}>
                              {trace.decision}
                            </p>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 space-y-3 overflow-hidden"
                                >
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Reasoning</p>
                                    <p className="text-sm text-gray-300" data-testid={`trace-reasoning-${trace.stepNumber}`}>
                                      {trace.reasoning}
                                    </p>
                                  </div>

                                  {trace.alternatives && Array.isArray(trace.alternatives) && trace.alternatives.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Alternatives Considered</p>
                                      <div className="flex flex-wrap gap-1">
                                        {trace.alternatives.map((alt, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {String(alt)}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {trace.contextUsed && Object.keys(trace.contextUsed).length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Context Used</p>
                                      <pre className="text-xs bg-gray-900/50 p-2 rounded overflow-x-auto text-gray-400">
                                        {JSON.stringify(trace.contextUsed, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
