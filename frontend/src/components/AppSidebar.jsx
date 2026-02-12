import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, ChevronDown, Users, Building2, MapPin, 
  Save, Download, Calculator, Home, Cpu, Package, Search, BarChart3,
  Ticket, Sparkles, Clock, Plus, Check
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

// Navigation items
const NAV_ITEMS = [
  { id: 'discovery', label: 'Discovery', icon: Search },
  { id: 'sizing', label: 'Sizing', icon: BarChart3 },
  { id: 'tokens', label: 'Tokens', icon: Ticket },
  { id: 'smartfill', label: 'SmartFill', icon: Sparkles },
  { id: 'history', label: 'History', icon: Clock },
];

// Collapsible Section Header
function SectionHeader({ icon: Icon, label, badge, isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {badge !== undefined && <Badge variant="outline" className="text-[9px] px-1 py-0">{badge}</Badge>}
      </div>
      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
    </button>
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
              className={`w-full p-1.5 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mx-auto ${isActive ? 'bg-primary-foreground/20' : 'bg-primary/20'}`}>
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
      className={`w-full px-2 py-1.5 rounded-md text-left transition-colors flex items-center gap-2 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isActive ? 'bg-primary-foreground/20' : 'bg-primary/20'}`}>
        {customer.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{customer.name}</div>
      </div>
      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

// Navigation item
function NavItem({ item, isActive, onClick, collapsed }) {
  const Icon = item.icon;
  
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              data-testid={`nav-${item.id}`}
              className={`w-full p-2 rounded-md transition-colors flex items-center justify-center ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      onClick={onClick}
      data-testid={`nav-${item.id}`}
      className={`w-full px-3 py-2 rounded-md text-left transition-colors flex items-center gap-3 ${isActive ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[14px]' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm">{item.label}</span>
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
  saving,
  activeTab,
  onTabChange
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [calculatorOpen, setCalculatorOpen] = useState(true);
  
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
    queryKey: ['/api/customers'],
    queryFn: () => apiRequest('/api/customers'),
  });

  return (
    <div className={`flex flex-col h-full bg-card border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Header with Logo & Collapse */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IB</span>
            </div>
            <span className="font-semibold text-sm">Sizing Planner</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 shrink-0 ${collapsed ? 'mx-auto' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className={`${collapsed ? 'px-1.5' : 'px-2'} py-2 space-y-1`}>
          
          {/* Dashboard Link */}
          <NavItem 
            item={{ id: 'dashboard', label: 'Dashboard', icon: Home }} 
            isActive={false} 
            onClick={onBack}
            collapsed={collapsed}
          />

          {/* Customers Section - Collapsible */}
          {collapsed ? (
            <div className="space-y-1 py-2">
              {customers.slice(0, 5).map(c => (
                <CustomerItem
                  key={c.id}
                  customer={c}
                  isActive={c.id === currentCustomer?.id}
                  onClick={() => onCustomerSelect(c)}
                  collapsed={true}
                />
              ))}
            </div>
          ) : (
            <div className="py-1">
              <SectionHeader 
                icon={Users} 
                label="Customers" 
                badge={customers.length}
                isOpen={customersOpen} 
                onToggle={() => setCustomersOpen(!customersOpen)} 
              />
              {customersOpen && (
                <div className="space-y-0.5 mt-1 max-h-[200px] overflow-y-auto">
                  {customers.map(c => (
                    <CustomerItem
                      key={c.id}
                      customer={c}
                      isActive={c.id === currentCustomer?.id}
                      onClick={() => onCustomerSelect(c)}
                      collapsed={false}
                    />
                  ))}
                  <button 
                    onClick={onBack}
                    className="w-full px-2 py-1.5 rounded-md text-left transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">New Customer</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Section - Collapsible, Only show when customer selected */}
          {currentCustomer && (
            <>
              <Separator className="my-2" />
              
              {collapsed ? (
                <div className="space-y-0.5">
                  {NAV_ITEMS.map(item => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange?.(item.id)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-1">
                  <SectionHeader 
                    icon={BarChart3} 
                    label="Navigation" 
                    isOpen={navigationOpen} 
                    onToggle={() => setNavigationOpen(!navigationOpen)} 
                  />
                  {navigationOpen && (
                    <div className="space-y-0.5 mt-1">
                      {NAV_ITEMS.map(item => (
                        <NavItem
                          key={item.id}
                          item={item}
                          isActive={activeTab === item.id}
                          onClick={() => onTabChange?.(item.id)}
                          collapsed={collapsed}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* IP Calculator & Stats - Only show when customer selected */}
          {currentCustomer && discoveryContext && (
            <>
              <Separator className="my-2" />
              
              {/* IP Calculator - Collapsible */}
              {collapsed ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-lg bg-muted/30 p-2 flex flex-col items-center gap-1">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-primary">{formatKW(activeIPs)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{formatKW(kw)} KW × {mult} = {formatKW(activeIPs)} IPs</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => setCalculatorOpen(!calculatorOpen)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IP Calculator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!calculatorOpen && <span className="text-xs font-bold text-primary">{formatKW(activeIPs)}</span>}
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${calculatorOpen ? '' : '-rotate-90'}`} />
                    </div>
                  </button>
                  {calculatorOpen && (
                    <div className="mt-1 rounded-lg bg-muted/30 p-2.5 space-y-2">
                      {/* Formula display: KW × Mult = IPs */}
                      <div className="flex items-center gap-1.5 text-sm">
                        <Input
                          type="number"
                          value={kw || ''}
                          onChange={e => setAnswer('ud-1', e.target.value)}
                          className="w-16 h-7 text-xs text-center px-1 font-mono"
                          placeholder="KW"
                        />
                        <span className="text-muted-foreground font-medium">×</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={mult}
                          onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                          className="w-12 h-7 text-xs text-center px-1 font-mono"
                        />
                        <span className="text-muted-foreground font-medium">=</span>
                        <div className="flex-1 h-7 flex items-center justify-center bg-primary/10 rounded border border-primary/30 min-w-[50px]">
                          <span className="text-xs font-bold text-primary">{formatKW(activeIPs)}</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newVal = !manualOverride;
                          setAnswer('ipam-1-override', newVal ? 'true' : 'false');
                          if (!newVal) setAnswer('ipam-1', String(calculatedIPs));
                        }}
                        className={`w-full text-[10px] py-1 rounded transition-colors font-medium ${manualOverride ? 'bg-amber-500 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                      >
                        {manualOverride ? 'Manual Override' : 'Auto Calculate'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stats Summary */}
              <div className={`rounded-lg bg-muted/30 ${collapsed ? 'p-2' : 'p-2.5'} space-y-1.5`}>
                <div className={`flex ${collapsed ? 'flex-col' : ''} items-center gap-2`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                          <span className={`font-semibold ${collapsed ? 'text-[10px]' : 'text-xs'}`}>{dataCenters.length}</span>
                          {!collapsed && <span className="text-[10px] text-muted-foreground">DC</span>}
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
                          <span className={`font-semibold ${collapsed ? 'text-[10px]' : 'text-xs'}`}>{sites.length}</span>
                          {!collapsed && <span className="text-[10px] text-muted-foreground">Sites</span>}
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
                      <span className="font-semibold">{formatKW(sizingSummary.totalIPs)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Tokens</span>
                      <span className="font-semibold">{formatKW(sizingSummary.totalTokens)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pack</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">{sizingSummary.tokenPack || '—'}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Save/Export */}
      {currentCustomer && (
        <div className={`p-2 border-t ${collapsed ? 'space-y-1' : 'flex gap-1.5'}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className={collapsed ? "w-full h-9 px-0" : "flex-1 h-8"}
                  onClick={onSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {!collapsed && <span className="ml-1.5 text-xs">{saving ? 'Saving...' : 'Save'}</span>}
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
                  className={collapsed ? "w-full h-9 px-0" : "flex-1 h-8"}
                  onClick={onExport}
                >
                  <Download className="h-4 w-4" />
                  {!collapsed && <span className="ml-1.5 text-xs">Export</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Export</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
