import "@/App.css";
import { Router, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh]">
      <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
      <p className="text-muted-foreground">Page not found</p>
    </div>
  );
}

function AppContent() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2 sticky top-0 bg-background z-30">
        <button 
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://customer-assets.emergentagent.com/job_dca12792-ec8f-4624-9d37-b020080620e2/artifacts/n7195zuv_Gemini_Generated_Image_lts0yllts0yllts0.png" 
            alt="Wayfinder Logo" 
            className="h-10 object-contain"
          />
        </button>
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/customers" component={Customers} />
          <Route path="/customers/:id" component={Customers} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
