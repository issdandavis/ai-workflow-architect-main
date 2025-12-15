import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Code2, Palette, FileText, FolderKanban, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Workspace {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  type: "code" | "design" | "docs" | "general";
  settings: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS = {
  code: Code2,
  design: Palette,
  docs: FileText,
  general: FolderKanban,
};

const TYPE_COLORS = {
  code: "text-green-400",
  design: "text-pink-400",
  docs: "text-blue-400",
  general: "text-orange-400",
};

export default function Workspaces() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "general" as "code" | "design" | "docs" | "general",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading, error } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Workspace created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setEditingWorkspace(null);
      resetForm();
      toast({ title: "Workspace updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setDeleteWorkspace(null);
      toast({ title: "Workspace deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "general",
    });
  };

  const openEditDialog = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || "",
      type: workspace.type,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (editingWorkspace) {
      updateMutation.mutate({ id: editingWorkspace.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 text-glow" data-testid="workspaces-title">
              Workspaces
            </h1>
            <p className="text-muted-foreground">
              Organize your projects and resources into dedicated workspaces.
            </p>
          </div>
          <Dialog open={isCreateOpen || !!editingWorkspace} onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingWorkspace(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2"
                data-testid="button-create-workspace"
              >
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingWorkspace ? "Edit Workspace" : "Create Workspace"}</DialogTitle>
                <DialogDescription>
                  {editingWorkspace ? "Update your workspace details." : "Set up a new workspace for your projects."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Workspace"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-workspace-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this workspace for?"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-workspace-description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "code" | "design" | "docs" | "general") => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-workspace-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <span className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-orange-400" />
                          General
                        </span>
                      </SelectItem>
                      <SelectItem value="code">
                        <span className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-green-400" />
                          Code
                        </span>
                      </SelectItem>
                      <SelectItem value="design">
                        <span className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-pink-400" />
                          Design
                        </span>
                      </SelectItem>
                      <SelectItem value="docs">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          Docs
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingWorkspace(null);
                    resetForm();
                  }}
                  data-testid="button-cancel-workspace"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-workspace"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : (editingWorkspace ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog open={!!deleteWorkspace} onOpenChange={(open) => !open && setDeleteWorkspace(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteWorkspace?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteWorkspace && deleteMutation.mutate(deleteWorkspace.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive" data-testid="error-card">
            <CardContent className="flex items-center gap-4 py-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Failed to load workspaces</CardTitle>
                <CardDescription>Please try refreshing the page.</CardDescription>
              </div>
            </CardContent>
          </Card>
        ) : workspaces.length === 0 ? (
          <Card className="border-dashed" data-testid="empty-state">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <FolderKanban className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="mb-2">No workspaces yet</CardTitle>
              <CardDescription className="mb-4">
                Create your first workspace to organize your projects.
              </CardDescription>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-workspace">
                <Plus className="w-4 h-4 mr-2" /> Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="workspaces-grid">
            {workspaces.map((workspace, index) => {
              const TypeIcon = TYPE_ICONS[workspace.type];
              return (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card hover:border-primary/50 transition-colors" data-testid={`card-workspace-${workspace.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-card ${TYPE_COLORS[workspace.type]}`}>
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg" data-testid={`text-workspace-name-${workspace.id}`}>
                              {workspace.name}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground capitalize" data-testid={`text-workspace-type-${workspace.id}`}>
                              {workspace.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      {workspace.description && (
                        <CardDescription className="line-clamp-2 mt-2" data-testid={`text-workspace-description-${workspace.id}`}>
                          {workspace.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-4" data-testid={`text-workspace-created-${workspace.id}`}>
                        Created {formatDate(workspace.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(workspace)}
                          data-testid={`button-edit-${workspace.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteWorkspace(workspace)}
                          data-testid={`button-delete-${workspace.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
