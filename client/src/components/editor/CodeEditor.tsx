import { useState, useCallback } from "react";
import Editor, { DiffEditor, loader } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  File,
  Folder,
  FolderOpen,
  X,
  Save,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Plus,
  Code2,
  FileJson,
  FileCode,
  FileText,
  Loader2,
  GitCompare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" } });

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
  modified?: boolean;
}

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  content: string;
  originalContent: string;
  language: string;
  modified: boolean;
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedFile: string | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
}

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case "js":
    case "jsx":
      return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "json":
      return <FileJson className="w-4 h-4 text-amber-400" />;
    case "md":
      return <FileText className="w-4 h-4 text-gray-400" />;
    case "css":
    case "scss":
      return <FileCode className="w-4 h-4 text-pink-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "html":
      return "html";
    case "sql":
      return "sql";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}

function FileTreeItem({
  node,
  depth,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;

  return (
    <>
      <button
        className={`w-full flex items-center gap-1 px-2 py-1 hover:bg-white/5 transition-colors text-left text-sm ${
          isSelected ? "bg-primary/20 text-primary" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => (node.type === "folder" ? onToggleFolder(node.path) : onSelectFile(node))}
        data-testid={`file-tree-${node.path.replace(/\//g, "-")}`}
      >
        {node.type === "folder" ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate">{node.name}</span>
        {node.modified && <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />}
      </button>

      <AnimatePresence>
        {node.type === "folder" && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface CodeEditorProps {
  files: FileNode[];
  onSave?: (path: string, content: string) => Promise<void>;
  showDiff?: boolean;
  diffOriginal?: string;
  diffModified?: string;
  diffPath?: string;
}

const sampleFiles: FileNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    path: "src",
    children: [
      {
        id: "src/components",
        name: "components",
        type: "folder",
        path: "src/components",
        children: [
          {
            id: "src/components/Button.tsx",
            name: "Button.tsx",
            type: "file",
            path: "src/components/Button.tsx",
            content: `import React from 'react';\n\ninterface ButtonProps {\n  children: React.ReactNode;\n  onClick?: () => void;\n  variant?: 'primary' | 'secondary';\n}\n\nexport function Button({ children, onClick, variant = 'primary' }: ButtonProps) {\n  return (\n    <button\n      className={\`btn btn-\${variant}\`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n}`,
            language: "typescript",
          },
          {
            id: "src/components/Card.tsx",
            name: "Card.tsx",
            type: "file",
            path: "src/components/Card.tsx",
            content: `import React from 'react';\n\ninterface CardProps {\n  title: string;\n  children: React.ReactNode;\n}\n\nexport function Card({ title, children }: CardProps) {\n  return (\n    <div className="card">\n      <h2 className="card-title">{title}</h2>\n      <div className="card-content">{children}</div>\n    </div>\n  );\n}`,
            language: "typescript",
          },
        ],
      },
      {
        id: "src/App.tsx",
        name: "App.tsx",
        type: "file",
        path: "src/App.tsx",
        content: `import React from 'react';\nimport { Button } from './components/Button';\nimport { Card } from './components/Card';\n\nexport default function App() {\n  return (\n    <div className="app">\n      <Card title="Welcome">\n        <p>Hello, World!</p>\n        <Button onClick={() => console.log('clicked')}>Click Me</Button>\n      </Card>\n    </div>\n  );\n}`,
        language: "typescript",
      },
      {
        id: "src/index.tsx",
        name: "index.tsx",
        type: "file",
        path: "src/index.tsx",
        content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
        language: "typescript",
      },
    ],
  },
  {
    id: "server",
    name: "server",
    type: "folder",
    path: "server",
    children: [
      {
        id: "server/index.ts",
        name: "index.ts",
        type: "file",
        path: "server/index.ts",
        content: `import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\napp.use(express.json());\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Server running on port \${PORT}\`);\n});`,
        language: "typescript",
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    path: "package.json",
    content: `{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "start": "node dist/server.js"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "express": "^4.18.2"\n  }\n}`,
    language: "json",
  },
];

export function CodeEditor({
  files = sampleFiles,
  onSave,
  showDiff = false,
  diffOriginal,
  diffModified,
  diffPath,
}: CodeEditorProps) {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "server"]));
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"editor" | "diff">("editor");

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const selectFile = useCallback((node: FileNode) => {
    if (node.type !== "file") return;

    const existingTab = openTabs.find((t) => t.path === node.path);
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      const newTab: OpenTab = {
        id: node.id,
        name: node.name,
        path: node.path,
        content: node.content || "",
        originalContent: node.content || "",
        language: node.language || getLanguage(node.name),
        modified: false,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTab(newTab.id);
    }
  }, [openTabs]);

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTab === tabId && next.length > 0) {
        setActiveTab(next[Math.max(0, idx - 1)].id);
      } else if (next.length === 0) {
        setActiveTab(null);
      }
      return next;
    });
  }, [activeTab]);

  const handleEditorChange = useCallback((value: string | undefined, tabId: string) => {
    if (value === undefined) return;
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? { ...t, content: value, modified: value !== t.originalContent }
          : t
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    const tab = openTabs.find((t) => t.id === activeTab);
    if (!tab || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(tab.path, tab.content);
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab
            ? { ...t, originalContent: t.content, modified: false }
            : t
        )
      );
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, onSave, openTabs]);

  const handleRevert = useCallback(() => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab
          ? { ...t, content: t.originalContent, modified: false }
          : t
      )
    );
  }, [activeTab]);

  const currentTab = openTabs.find((t) => t.id === activeTab);
  const hasModified = openTabs.some((t) => t.modified);

  return (
    <div className="flex h-full bg-[#1e1e1e] rounded-lg overflow-hidden" data-testid="code-editor">
      <div className="w-56 border-r border-white/10 flex flex-col">
        <div className="p-2 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explorer
          </span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" data-testid="button-new-file">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-2">
            {files.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                expandedFolders={expandedFolders}
                selectedFile={currentTab?.path || null}
                onToggleFolder={toggleFolder}
                onSelectFile={selectFile}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-9 bg-[#252526] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center overflow-x-auto">
            {openTabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-3 h-9 text-sm border-r border-white/10 ${
                  activeTab === tab.id
                    ? "bg-[#1e1e1e] text-white"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.path.replace(/\//g, "-")}`}
              >
                {getFileIcon(tab.name)}
                <span>{tab.name}</span>
                {tab.modified && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                <button
                  className="ml-1 hover:bg-white/10 rounded p-0.5"
                  onClick={(e) => closeTab(tab.id, e)}
                  data-testid={`close-tab-${tab.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>

          {currentTab && (
            <div className="flex items-center gap-1 px-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setViewMode(viewMode === "editor" ? "diff" : "editor")}
                data-testid="button-toggle-diff"
              >
                <GitCompare className="w-4 h-4 mr-1" />
                {viewMode === "editor" ? "Diff" : "Editor"}
              </Button>
              {currentTab.modified && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={handleRevert}
                    data-testid="button-revert"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 bg-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    data-testid="button-save-file"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1">
          {!currentTab ? (
            <div className="h-full flex items-center justify-center text-muted-foreground" data-testid="editor-placeholder">
              <div className="text-center">
                <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Select a file to edit</p>
              </div>
            </div>
          ) : viewMode === "diff" && currentTab.modified ? (
            <DiffEditor
              original={currentTab.originalContent}
              modified={currentTab.content}
              language={currentTab.language}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
          ) : showDiff && diffOriginal !== undefined && diffModified !== undefined ? (
            <DiffEditor
              original={diffOriginal}
              modified={diffModified}
              language={getLanguage(diffPath || "")}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <Editor
              value={currentTab.content}
              language={currentTab.language}
              theme="vs-dark"
              onChange={(value) => handleEditorChange(value, currentTab.id)}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16 },
              }}
            />
          )}
        </div>

        {currentTab && (
          <div className="h-6 bg-[#007acc] text-white text-xs flex items-center px-3 gap-4" data-testid="editor-statusbar">
            <span>{currentTab.path}</span>
            <span className="ml-auto">{currentTab.language}</span>
            {currentTab.modified && (
              <Badge variant="outline" className="h-4 text-[10px] bg-white/20 border-white/30">
                Modified
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
