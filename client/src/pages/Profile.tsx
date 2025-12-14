import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Music, Video, Edit, Plus, Trash2, Save, 
  ExternalLink, Youtube, Headphones, Sparkles, Heart
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  youtubeVideos: string[] | null;
  audioFiles: string[] | null;
  theme: Record<string, string> | null;
  socialLinks: Record<string, string> | null;
}

function YouTubeEmbed({ videoUrl }: { videoUrl: string }) {
  const getVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };
  
  const videoId = getVideoId(videoUrl);
  if (!videoId) return null;
  
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden" data-testid={`youtube-embed-${videoId}`}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

function AudioPlayer({ audioUrl, name }: { audioUrl: string; name: string }) {
  return (
    <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20" data-testid={`audio-player-${name}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{name}</p>
          <audio controls className="w-full mt-2 h-8">
            <source src={audioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </Card>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    backgroundUrl: "",
  });
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [addVideoOpen, setAddVideoOpen] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) return { profile: null };
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
  });

  const profile: UserProfile | null = profileData?.profile;

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch('/api/profile', {
        method: profile ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setIsEditing(false);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: async (videoUrl: string) => {
      const currentVideos = profile?.youtubeVideos || [];
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ youtubeVideos: [...currentVideos, videoUrl] }),
      });
      if (!res.ok) throw new Error('Failed to add video');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setNewVideoUrl("");
      setAddVideoOpen(false);
      toast({ title: "Video added!", description: "Your video has been added to your profile." });
    },
  });

  const removeVideoMutation = useMutation({
    mutationFn: async (videoUrl: string) => {
      const currentVideos = profile?.youtubeVideos || [];
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ youtubeVideos: currentVideos.filter(v => v !== videoUrl) }),
      });
      if (!res.ok) throw new Error('Failed to remove video');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: "Video removed" });
    },
  });

  const startEditing = () => {
    setEditForm({
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      avatarUrl: profile?.avatarUrl || "",
      backgroundUrl: profile?.backgroundUrl || "",
    });
    setIsEditing(true);
  };

  const saveProfile = () => {
    updateMutation.mutate({
      displayName: editForm.displayName || null,
      bio: editForm.bio || null,
      avatarUrl: editForm.avatarUrl || null,
      backgroundUrl: editForm.backgroundUrl || null,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" data-testid="spinner-loading" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: profile?.backgroundUrl 
          ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${profile.backgroundUrl}) center/cover`
          : 'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)'
      }}
    >
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard">
          <span className="text-xl font-bold cursor-pointer hover:text-primary transition-colors" data-testid="link-dashboard">
            AI Orchestration Hub
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={startEditing} data-testid="button-edit-profile">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Card className="bg-card/80 backdrop-blur-xl border-primary/20 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500" />
            
            <CardContent className="relative pt-0 pb-8">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
                <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-primary" data-testid="avatar-profile">
                  <AvatarImage src={profile?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-3xl">
                    {profile?.displayName?.[0] || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-bold" data-testid="text-display-name">
                      {profile?.displayName || "Anonymous User"}
                    </h1>
                    <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 max-w-2xl" data-testid="text-bio">
                    {profile?.bio || "No bio yet. Click 'Edit Profile' to add one!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="videos" className="mt-8">
            <TabsList className="bg-card/80 backdrop-blur-xl">
              <TabsTrigger value="videos" className="gap-2" data-testid="tab-videos">
                <Youtube className="w-4 h-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-2" data-testid="tab-music">
                <Music className="w-4 h-4" />
                Music
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  My Videos
                </h2>
                <Dialog open={addVideoOpen} onOpenChange={setAddVideoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-add-video">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Video
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add YouTube Video</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="video-url">YouTube URL</Label>
                        <Input
                          id="video-url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          data-testid="input-video-url"
                        />
                      </div>
                      <Button 
                        onClick={() => addVideoMutation.mutate(newVideoUrl)}
                        disabled={!newVideoUrl || addVideoMutation.isPending}
                        data-testid="button-save-video"
                      >
                        {addVideoMutation.isPending ? "Adding..." : "Add Video"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(!profile?.youtubeVideos || profile.youtubeVideos.length === 0) ? (
                <Card className="p-12 text-center bg-card/50" data-testid="empty-videos">
                  <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No videos yet. Add your favorite YouTube videos!</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {profile.youtubeVideos.map((video, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group"
                    >
                      <YouTubeEmbed videoUrl={video} />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeVideoMutation.mutate(video)}
                        data-testid={`button-remove-video-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="music" className="mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  My Music
                </h2>
              </div>

              {(!profile?.audioFiles || profile.audioFiles.length === 0) ? (
                <Card className="p-12 text-center bg-card/50" data-testid="empty-music">
                  <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No music uploaded yet.</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {profile.audioFiles.map((audio, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AudioPlayer audioUrl={audio} name={`Track ${index + 1}`} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={editForm.displayName}
                onChange={(e) => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Your name"
                data-testid="input-display-name"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={4}
                data-testid="input-bio"
              />
            </div>
            <div>
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input
                id="avatar-url"
                value={editForm.avatarUrl}
                onChange={(e) => setEditForm(f => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-avatar-url"
              />
            </div>
            <div>
              <Label htmlFor="background-url">Background Image URL</Label>
              <Input
                id="background-url"
                value={editForm.backgroundUrl}
                onChange={(e) => setEditForm(f => ({ ...f, backgroundUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-background-url"
              />
            </div>
            <Button 
              onClick={saveProfile} 
              className="w-full"
              disabled={updateMutation.isPending}
              data-testid="button-save-profile"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
