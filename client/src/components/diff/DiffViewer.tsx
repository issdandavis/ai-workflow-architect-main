import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, ChevronDown, ChevronRight, FileCode, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "remove";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  id: string;
  filePath: string;
  operation: "create" | "modify" | "delete";
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface PendingChange {
  id: string;
  description: string;
  files: FileDiff[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  agentId?: string;
}

interface DiffViewerProps {
  change: PendingChange;
  onApprove: (changeId: string) => void;
  onReject: (changeId: string) => void;
  isProcessing?: boolean;
}

export function DiffViewer({ change, onApprove, onReject, isProcessing }: DiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(change.files.map((f) => f.id))
  );

  const toggleFile = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const totalAdditions = change.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = change.files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="glass-panel rounded-xl overflow-hidden" data-testid={`diff-viewer-${change.id}`}>
      <div className="p-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-primary" />
            <span className="font-semibold">{change.description}</span>
            <Badge
              variant="outline"
              className={
                change.status === "pending"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : change.status === "approved"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }
              data-testid={`status-${change.id}`}
            >
              {change.status}
            </Badge>
          </div>

          {change.status === "pending" && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => onReject(change.id)}
                disabled={isProcessing}
                data-testid={`button-reject-${change.id}`}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white"
                onClick={() => onApprove(change.id)}
                disabled={isProcessing}
                data-testid={`button-approve-${change.id}`}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve & Apply
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{change.files.length} file{change.files.length !== 1 ? "s" : ""} changed</span>
          <span className="text-green-400">+{totalAdditions}</span>
          <span className="text-red-400">-{totalDeletions}</span>
          <span className="text-xs">{new Date(change.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="divide-y divide-white/5">
          {change.files.map((file) => (
            <div key={file.id}>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors text-left"
                onClick={() => toggleFile(file.id)}
                data-testid={`toggle-file-${file.id}`}
              >
                {expandedFiles.has(file.id) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-sm">{file.filePath}</span>
                <Badge
                  variant="outline"
                  className={
                    file.operation === "create"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : file.operation === "delete"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }
                >
                  {file.operation}
                </Badge>
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <span className="text-green-400">+{file.additions}</span>
                  <span className="text-red-400">-{file.deletions}</span>
                </span>
              </button>

              <AnimatePresence>
                {expandedFiles.has(file.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#0d1117] font-mono text-xs">
                      {file.hunks.map((hunk, hunkIdx) => (
                        <div key={hunkIdx}>
                          <div className="px-4 py-1 bg-blue-500/10 text-blue-300 border-y border-blue-500/20">
                            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                          </div>
                          {hunk.lines.map((line, lineIdx) => (
                            <div
                              key={lineIdx}
                              className={`flex ${
                                line.type === "add"
                                  ? "bg-green-500/10"
                                  : line.type === "remove"
                                  ? "bg-red-500/10"
                                  : ""
                              }`}
                            >
                              <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5">
                                {line.oldLineNumber || ""}
                              </div>
                              <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5">
                                {line.newLineNumber || ""}
                              </div>
                              <div className="w-6 flex items-center justify-center">
                                {line.type === "add" && <Plus className="w-3 h-3 text-green-400" />}
                                {line.type === "remove" && <Minus className="w-3 h-3 text-red-400" />}
                              </div>
                              <div
                                className={`flex-1 px-2 ${
                                  line.type === "add"
                                    ? "text-green-300"
                                    : line.type === "remove"
                                    ? "text-red-300"
                                    : "text-gray-400"
                                }`}
                              >
                                {line.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface PendingChangesListProps {
  changes: PendingChange[];
  onApprove: (changeId: string) => void;
  onReject: (changeId: string) => void;
  onApproveAll: () => void;
  isProcessing?: boolean;
}

export function PendingChangesList({
  changes,
  onApprove,
  onReject,
  onApproveAll,
  isProcessing,
}: PendingChangesListProps) {
  const pendingChanges = changes.filter((c) => c.status === "pending");

  if (pendingChanges.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center" data-testid="no-pending-changes">
        <FileCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No pending changes to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" data-testid="text-pending-count">
          {pendingChanges.length} Pending Change{pendingChanges.length !== 1 ? "s" : ""}
        </h3>
        {pendingChanges.length > 1 && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-500 text-white"
            onClick={onApproveAll}
            disabled={isProcessing}
            data-testid="button-approve-all"
          >
            <Check className="w-4 h-4 mr-1" />
            Approve All ({pendingChanges.length})
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {pendingChanges.map((change) => (
          <DiffViewer
            key={change.id}
            change={change}
            onApprove={onApprove}
            onReject={onReject}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </div>
  );
}

export function createUnifiedDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): FileDiff {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const diffLines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldLine === newLine) {
      diffLines.push({
        type: "context",
        content: oldLine || "",
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
      });
      oldIdx++;
      newIdx++;
    } else if (oldIdx < oldLines.length && (newIdx >= newLines.length || oldLine !== newLines[newIdx])) {
      diffLines.push({
        type: "remove",
        content: oldLine,
        oldLineNumber: oldIdx + 1,
      });
      deletions++;
      oldIdx++;
    } else {
      diffLines.push({
        type: "add",
        content: newLine,
        newLineNumber: newIdx + 1,
      });
      additions++;
      newIdx++;
    }
  }

  return {
    id: crypto.randomUUID(),
    filePath,
    operation: oldContent === "" ? "create" : newContent === "" ? "delete" : "modify",
    hunks: [
      {
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines: diffLines,
      },
    ],
    additions,
    deletions,
  };
}
