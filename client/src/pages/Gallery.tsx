import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Eye, Download, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import bookCoverImage from "@assets/Book_Cover_Spiral_Purple_n_gold_1765780034021.png";

interface ArtworkItem {
  id: string;
  title: string;
  artist: string;
  description: string;
  imageSrc: string;
  tags: string[];
}

const artworks: ArtworkItem[] = [
  {
    id: "spiral-purple-gold",
    title: "Spiral Codex",
    artist: "AI Orchestration Hub",
    description: "A mystical book cover featuring golden spirals and runic inscriptions on a deep purple leather background.",
    imageSrc: bookCoverImage,
    tags: ["Fantasy", "Book Cover", "Gold"],
  },
  {
    id: "placeholder-1",
    title: "Neural Dreamscape",
    artist: "Community Artist",
    description: "Abstract visualization of neural network patterns in vibrant colors.",
    imageSrc: "",
    tags: ["Abstract", "AI Art", "Neural"],
  },
  {
    id: "placeholder-2",
    title: "Digital Horizons",
    artist: "Community Artist",
    description: "Futuristic landscape generated through multi-model AI collaboration.",
    imageSrc: "",
    tags: ["Landscape", "Futuristic", "Sci-Fi"],
  },
  {
    id: "placeholder-3",
    title: "Quantum Gardens",
    artist: "Community Artist",
    description: "Organic patterns meeting digital aesthetics in a harmonious blend.",
    imageSrc: "",
    tags: ["Nature", "Digital", "Abstract"],
  },
];

function ArtworkCard({ artwork, index }: { artwork: ArtworkItem; index: number }) {
  const hasImage = artwork.imageSrc !== "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        className="overflow-hidden group hover:shadow-lg transition-all duration-300"
        data-testid={`card-artwork-${artwork.id}`}
      >
        <div className="relative aspect-square bg-gradient-to-br from-purple-900/20 to-blue-900/20 overflow-hidden">
          {hasImage ? (
            <img 
              src={artwork.imageSrc} 
              alt={artwork.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              data-testid={`img-artwork-${artwork.id}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-6">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">Coming Soon</p>
              </div>
            </div>
          )}
          {hasImage && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" data-testid={`button-view-${artwork.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Size
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 overflow-hidden">
                  <img 
                    src={artwork.imageSrc} 
                    alt={artwork.title}
                    className="w-full h-auto"
                    data-testid={`img-fullsize-${artwork.id}`}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1" data-testid={`text-title-${artwork.id}`}>
            {artwork.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2" data-testid={`text-artist-${artwork.id}`}>
            by {artwork.artist}
          </p>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {artwork.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {artwork.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Gallery() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="border-b border-border bg-card/80 backdrop-blur-xl px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <a href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </a>
          <a href="/" className="text-lg md:text-xl font-bold cursor-pointer hover:text-primary transition-colors" data-testid="link-home">
            AI Orchestration Hub
          </a>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <a href="/shop">
            <Button variant="ghost" size="sm" data-testid="link-shop">
              Pricing
            </Button>
          </a>
          <a href="/login">
            <Button variant="ghost" size="sm" data-testid="button-login">Log In</Button>
          </a>
          <a href="/signup">
            <Button size="sm" data-testid="button-signup">Get Started</Button>
          </a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-4" data-testid="badge-gallery">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Art Gallery
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="text-heading">
            Artwork Showcase
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-subheading">
            Explore stunning AI-generated artwork created using our multi-model orchestration platform.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12 p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
        >
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <Sparkles className="w-10 h-10 text-purple-500 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-lg mb-1" data-testid="text-about-title">
                About This Gallery
              </h2>
              <p className="text-muted-foreground" data-testid="text-about-description">
                This gallery showcases the creative possibilities of AI-generated art. Each piece is crafted using 
                our advanced multi-AI orchestration system, combining the strengths of multiple AI models to produce 
                unique and captivating artwork. Submit your own creations to be featured!
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="grid-artworks">
          {artworks.map((artwork, index) => (
            <ArtworkCard key={artwork.id} artwork={artwork} index={index} />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Card className="inline-block p-6 bg-muted/50">
            <h3 className="font-semibold text-lg mb-2" data-testid="text-submit-title">
              Want to Feature Your Art?
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create amazing AI-generated artwork with our platform and submit it for a chance to be featured in our gallery.
            </p>
            <a href="/signup">
              <Button data-testid="button-start-creating">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Creating
              </Button>
            </a>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
