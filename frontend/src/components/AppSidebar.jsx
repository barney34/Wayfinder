import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, Users, Building2, MapPin, Plus, 
  Save, Download, Calculator, FileText, Settings, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useDiscoveryOptional } from "@/contexts/DiscoveryContext";

// Compact IP Calculator for sidebar
function SidebarIPCalc({ collapsed }) {
  const discoveryContext = useDiscoveryOptional();
  
  // Return nothing if not inside DiscoveryProvider
  if (!discoveryContext) {
    return null;
  }
  
  const { answers, setAnswer } = discoveryContext;
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const calculatedIPs = Math.ceil(kw * mult);
  const manualOverride = answers['ipam-1-override'] === 'true';
  const activeIPs = manualOverride ? (parseInt(answers['ipam-1']) || calculatedIPs) : calculatedIPs;

  const formatKW = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toString();
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg cursor-default">
              <Calculator className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-xs font-bold text-primary">{formatKW(activeIPs)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{formatKW(kw)} KW × {mult} = {formatKW(activeIPs)} IPs</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Calculator className="h-3 w-3" /> IP Calculator
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={kw || ''}
          onChange={e => setAnswer('ud-1', e.target.value)}
          className="w-16 h-7 text-xs text-center"
          placeholder="KW"
        />
        <span className="text-muted-foreground text-xs">×</span>
        <Input
          type="number"
          step="0.5"
          value={mult}
          onChange={e => setAnswer('ipam-multiplier', e.target.value)}
          className="w-10 h-7 text-xs text-center"
        />
        <span className="text-muted-foreground text-xs">=</span>
        <div className="flex-1 h-7 flex items-center justify-center bg-primary/10 rounded border border-primary/30">
          <span className="text-xs font-bold text-primary">{formatKW(activeIPs)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          const newVal = !manualOverride;
          setAnswer('ipam-1-override', newVal ? 'true' : 'false');
          if (!newVal) setAnswer('ipam-1', String(calculatedIPs));
        }}
        className={`w-full text-xs py-1 rounded transition-colors ${manualOverride ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
      >
        {manualOverride ? 'Manual Override' : 'Auto Calculate'}
      </button>
    </div>
  );
}

// Customer list item
function CustomerItem({ customer, isActive, onClick, collapsed }) {
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`w-full p-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{customer.name}</p>
            {customer.opportunity && <p className="text-muted-foreground text-xs">{customer.opportunity}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-2 rounded-lg text-left transition-colors ${isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{customer.name}</div>
          {customer.opportunity && (
            <div className="text-xs text-muted-foreground truncate">{customer.opportunity}</div>
          )}
        </div>
        {isActive && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
      </div>
    </button>
  );
}

export function AppSidebar({ 
  currentCustomer, 
  currentOpportunity,
  onCustomerSelect, 
  onBack,
  onSave,
  onExport,
  saving
}) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Use optional hook - returns null if not in provider
  const discoveryContext = useDiscoveryOptional();
  const dataCenters = discoveryContext?.dataCenters || [];
  const sites = discoveryContext?.sites || [];
  const sizingSummary = discoveryContext?.sizingSummary;

  // Fetch all customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiRequest('/api/customers'),
  });

  const formatKW = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toString();
  };

  return (
    <div className={`flex flex-col h-full bg-card border-r transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-2 border-b">
        {!collapsed && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Customers Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" /> Customers
            </div>
          </div>
        )}
        
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-1">
            {customers.map(c => (
              <CustomerItem
                key={c.id}
                customer={c}
                isActive={c.id === currentCustomer?.id}
                onClick={() => onCustomerSelect(c)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </ScrollArea>

        <Separator className="my-2" />

        {/* Current Working Section */}
        {currentCustomer && (
          <div className={`px-2 ${collapsed ? 'py-2' : 'pb-2'}`}>
            {!collapsed && (
              <div className="px-1 mb-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Working on</div>
                <div className="text-sm font-semibold truncate">{currentCustomer.name}</div>
                {currentOpportunity && (
                  <div className="text-xs text-muted-foreground truncate">{currentOpportunity}</div>
                )}
              </div>
            )}

            {/* DC/Site Summary */}
            <div className={`flex ${collapsed ? 'flex-col' : 'items-center'} gap-2 p-2 bg-muted/30 rounded-lg`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      {!collapsed && <span className="text-xs font-medium">{dataCenters.length} DC</span>}
                      {collapsed && <Badge variant="outline" className="text-[10px] px-1">{dataCenters.length}</Badge>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{dataCenters.length} Data Centers</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-green-500" />
                      {!collapsed && <span className="text-xs font-medium">{sites.length} Sites</span>}
                      {collapsed && <Badge variant="outline" className="text-[10px] px-1">{sites.length}</Badge>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{sites.length} Branch Sites</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* IP Calculator */}
        <div className="px-2 pb-2">
          <SidebarIPCalc collapsed={collapsed} />
        </div>

        {/* Sizing Summary */}
        {sizingSummary && !collapsed && (
          <div className="px-2 pb-2">
            <div className="p-2 bg-muted/30 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total IPs:</span>
                <span className="font-medium">{formatKW(sizingSummary.totalIPs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium">{formatKW(sizingSummary.totalTokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pack:</span>
                <Badge variant="outline" className="text-[10px] px-1">{sizingSummary.tokenPack}</Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Save/Export */}
      <div className={`p-2 border-t space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size={collapsed ? "icon" : "sm"}
                className={collapsed ? "h-8 w-8" : "w-full justify-start"}
                onClick={onSave}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {!collapsed && <span className="ml-2">{saving ? 'Saving...' : 'Save'}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Save</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={collapsed ? "icon" : "sm"}
                className={collapsed ? "h-8 w-8" : "w-full justify-start"}
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Export</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Export</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
