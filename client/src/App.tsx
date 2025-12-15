import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PublicHome from "@/pages/PublicHome";
import Shop from "@/pages/Shop";
import Storage from "@/pages/Storage";
import CodingStudio from "@/pages/CodingStudio";
import Settings from "@/pages/Settings";
import Integrations from "@/pages/Integrations";
import Agents from "@/pages/Agents";
import Usage from "@/pages/Usage";
import Roundtable from "@/pages/Roundtable";
import AgentDev from "@/pages/AgentDev";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Status from "@/pages/Status";
import Logs from "@/pages/Logs";
import Workflows from "@/pages/Workflows";
import Workspaces from "@/pages/Workspaces";
import Gallery from "@/pages/Gallery";
import WebsiteBuilder from "@/pages/WebsiteBuilder";
import ShopifyOnboarding from "@/pages/ShopifyOnboarding";
import ShopifyDashboard from "@/pages/ShopifyDashboard";

const PUBLIC_ROUTES = ["/", "/shop", "/login", "/signup", "/gallery"];

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/shop" component={Shop} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/gallery" component={Gallery} />

      {/* Backend / Dashboard Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/storage" component={Storage} />
      <Route path="/studio" component={CodingStudio} />
      <Route path="/coding-studio" component={CodingStudio} />
      <Route path="/settings" component={Settings} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/agents" component={Agents} />
      <Route path="/usage" component={Usage} />
      <Route path="/roundtable" component={Roundtable} />
      <Route path="/agent-dev" component={AgentDev} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route path="/status" component={Status} />
      <Route path="/logs" component={Logs} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/workspaces" component={Workspaces} />
      <Route path="/website-builder" component={WebsiteBuilder} />
      
      {/* Shopify Routes */}
      <Route path="/shopify/onboarding" component={ShopifyOnboarding} />
      <Route path="/shopify/dashboard" component={ShopifyDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function ConditionalAssistant() {
  const [location] = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.includes(location);
  
  if (isPublicRoute) {
    return null;
  }
  
  return <AssistantPanel />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <ConditionalAssistant />
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
