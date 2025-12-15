import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Network, 
  Bot, 
  Settings, 
  Terminal, 
  Cpu,
  Code2,
  Store,
  CreditCard,
  Lock,
  HardDrive,
  Cloud,
  LogOut,
  Globe,
  BarChart3,
  FolderKanban,
  Wand2
} from "lucide-react";
import bgImage from "@assets/generated_images/dark_abstract_neural_network_background_for_ai_dashboard.png";
import { ShopifyBanner } from "@/components/ShopifyBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Updated navigation structure based on user request
  const publicNavItems = [
    { icon: Globe, label: "Public Home", href: "/" },
    { icon: Store, label: "Shop", href: "/shop" },
  ];

  const backendNavItems = [
    { icon: LayoutDashboard, label: "Command Deck", href: "/dashboard" },
    { icon: Code2, label: "Coding Studio", href: "/studio" },
    { icon: Wand2, label: "Website Builder", href: "/website-builder" },
    { icon: Bot, label: "AI Agents", href: "/agents" },
    { icon: FolderKanban, label: "Workspaces", href: "/workspaces" },
    { icon: HardDrive, label: "Storage", href: "/storage" },
    { icon: Network, label: "Integrations", href: "/integrations" },
    { icon: BarChart3, label: "Usage & Costs", href: "/usage" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-hidden flex">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-border/40 glass-panel z-10 flex flex-col items-center lg:items-stretch py-6 backdrop-blur-xl">
        <div className="px-4 mb-10 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">AI<span className="text-primary">.Core</span></span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-6 touch-scroll">
          {/* Public Section */}
          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:block">Public Facing</div>
            <nav className="flex flex-col gap-2">
              {publicNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                      "flex items-center gap-3 px-3 py-3 min-h-11 rounded-xl transition-all duration-300 group",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white active:bg-white/10"
                    )}>
                      <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                      <span className="hidden lg:block font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Backend Section */}
          <div>
            <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:block">Backend Operations</div>
            <nav className="flex flex-col gap-2">
              {backendNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                      "flex items-center gap-3 px-3 py-3 min-h-11 rounded-xl transition-all duration-300 group",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,255,255,0.1)]" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white active:bg-white/10"
                    )}>
                      <item.icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                      <span className="hidden lg:block font-medium">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_currentColor] hidden lg:block" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto px-4 py-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 p-3 min-h-11 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors text-left group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 ring-2 ring-white/10 flex items-center justify-center">
               <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="hidden lg:block overflow-hidden">
              <div className="text-sm font-medium truncate">Admin Mode</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Secure Connection
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 z-10 overflow-y-auto h-screen relative flex flex-col touch-scroll">
        <div className="flex-1 max-w-7xl mx-auto p-6 lg:p-10 space-y-8 pb-20 w-full">
          {children}
        </div>
        <ShopifyBanner shopUrl="https://aethermore-works.myshopify.com" />
      </main>
    </div>
  );
}
