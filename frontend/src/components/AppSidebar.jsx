import { Home, Users, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Customers", url: "/customers", icon: Users },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();

  return (
    <>
      {/* Toggle Button for Mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setIsCollapsed(!isCollapsed)}
        data-testid="button-sidebar-toggle"
      >
        {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </Button>

      {/* Sidebar - Narrower width */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          isCollapsed ? "w-14" : "w-48",
          "hidden md:block"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-14 items-center border-b px-3 justify-between">
            {!isCollapsed && (
              <span className="text-base font-semibold text-primary">Discovery</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-testid="button-collapse-sidebar"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {!isCollapsed && (
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Customer Discovery
              </div>
            )}
            {items.map((item) => {
              const isActive = location === item.url || 
                (item.url !== "/" && location.startsWith(item.url));
              return (
                <Link key={item.title} href={item.url}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
                      isCollapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm">{item.title}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {!isCollapsed && (
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen bg-card border-r w-48 md:hidden"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-3">
              <span className="text-base font-semibold text-primary">Discovery</span>
            </div>
            <nav className="flex-1 space-y-1 p-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Customer Discovery
              </div>
              {items.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <Link key={item.title} href={item.url}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => setIsCollapsed(true)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}
