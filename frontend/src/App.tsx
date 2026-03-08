import "@/App.css";
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Switch>
          <Route path="/" component={Customers} />
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
      <TooltipProvider delayDuration={0}>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
