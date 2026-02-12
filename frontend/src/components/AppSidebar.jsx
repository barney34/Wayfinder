import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, Users, Building2, MapPin, 
  Save, Download, Calculator, Home, Cpu, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useDiscoveryOptional } from "@/contexts/DiscoveryContext";

// Format numbers
const formatKW = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return n.toString();
};

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
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mx-auto">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{customer.name}</p>
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
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
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
  const answers = discoveryContext?.answers || {};
  const setAnswer = discoveryContext?.setAnswer || (() => {});

  // IP Calculator values
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const calculatedIPs = Math.ceil(kw * mult);
  const manualOverride = answers['ipam-1-override'] === 'true';
  const activeIPs = manualOverride ? (parseInt(answers['ipam-1']) || calculatedIPs) : calculatedIPs;

  // Fetch all customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiRequest('/api/customers'),
  });

  return (
    <div className={`flex flex-col h-full bg-card border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-2 border-b">
        {!collapsed && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 shrink-0 ${collapsed ? 'mx-auto' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Customers Section */}
          {!collapsed && (
            <div className="px-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                <Users className="h-3 w-3" /> Customers
              </div>
            </div>
          )}
          
          <div className="space-y-1">
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

          {/* Current Customer Section - Calculator & Stats */}
          {currentCustomer && discoveryContext && (
            <>
              <Separator />
              
              {/* Working On */}
              {!collapsed && (
                <div className="px-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Working on</div>
                  <div className="text-sm font-semibold truncate">{currentCustomer.name}</div>
                  {currentOpportunity && (
                    <div className="text-xs text-muted-foreground truncate">{currentOpportunity}</div>
                  )}
                </div>
              )}

              {/* IP Calculator - Compact */}
              <div className={`rounded-lg bg-muted/30 ${collapsed ? 'p-2' : 'p-2.5'}`}>
                {collapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-1">
                          <Calculator className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-bold text-primary">{formatKW(activeIPs)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{formatKW(kw)} KW × {mult} = {formatKW(activeIPs)} IPs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calculator className="h-3 w-3" /> IP Calculator
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={kw || ''}
                        onChange={e => setAnswer('ud-1', e.target.value)}
                        className="w-14 h-7 text-xs text-center px-1"
                        placeholder="KW"
                      />
                      <span className="text-muted-foreground text-xs">×</span>
                      <Input
                        type="number"
                        step="0.5"
                        value={mult}
                        onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                        className="w-10 h-7 text-xs text-center px-1"
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
                      className={`w-full text-[10px] py-1 rounded transition-colors ${manualOverride ? 'bg-amber-500 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      {manualOverride ? 'Manual Override' : 'Auto Calculate'}
                    </button>
                  </div>
                )}
              </div>

              {/* DC/Site + Sizing Summary */}
              <div className={`rounded-lg bg-muted/30 ${collapsed ? 'p-2' : 'p-2.5'} space-y-2`}>
                {/* DC/Sites */}
                <div className={`flex ${collapsed ? 'flex-col' : ''} items-center gap-2`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                          <span className={`font-medium ${collapsed ? 'text-[10px]' : 'text-xs'}`}>{dataCenters.length}</span>
                          {!collapsed && <span className="text-xs text-muted-foreground">DC</span>}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{dataCenters.length} Data Centers</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-green-500" />
                          <span className={`font-medium ${collapsed ? 'text-[10px]' : 'text-xs'}`}>{sites.length}</span>
                          {!collapsed && <span className="text-xs text-muted-foreground">Sites</span>}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{sites.length} Branch Sites</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Sizing Stats */}
                {!collapsed && sizingSummary && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> IPs</span>
                      <span className="font-medium">{formatKW(sizingSummary.totalIPs)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Tokens</span>
                      <span className="font-medium">{formatKW(sizingSummary.totalTokens)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pack</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sizingSummary.tokenPack || '—'}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Save/Export */}
      <div className={`p-2 border-t ${collapsed ? 'space-y-1' : 'space-y-1.5'}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className={collapsed ? "w-full h-9 px-0" : "w-full justify-start h-8"}
                onClick={onSave}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {!collapsed && <span className="ml-2 text-xs">{saving ? 'Saving...' : 'Save'}</span>}
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
                size="sm"
                className={collapsed ? "w-full h-9 px-0" : "w-full justify-start h-8"}
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
                {!collapsed && <span className="ml-2 text-xs">Export</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Export</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
