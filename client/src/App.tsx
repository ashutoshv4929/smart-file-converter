import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useTheme } from "@/components/theme-provider";
import { RefreshCw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Files from "@/pages/files";
import History from "@/pages/history";
import Settings from "@/pages/settings";

function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <RefreshCw className="text-xl" size={20} />
        <h1 className="text-lg font-medium">Smart File Converter</h1>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-primary-dark transition-colors"
        >
          {theme === 'dark' ? (
            <i className="fas fa-sun text-sm"></i>
          ) : (
            <i className="fas fa-moon text-sm"></i>
          )}
        </button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/files" component={Files} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="max-w-md mx-auto bg-surface dark:bg-surface-dark min-h-screen shadow-lg">
      <AppHeader />
      <main>
        <Router />
      </main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="font-roboto bg-background dark:bg-background-dark text-on-background dark:text-white min-h-screen">
            <AppContent />
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
