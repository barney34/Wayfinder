import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, ChevronDown, Users, Building2, MapPin, 
  Save, Download, Calculator, Home, Cpu, Package, Search, BarChart3,
  Ticket, Sparkles, Clock, Plus, Check, Target, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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

// Target Solutions - NIOS doesn't need why not, others do
const TARGET_SOLUTIONS = [
  { key: 'feature-nios', label: 'NIOS', noWhyNot: true },
  { key: 'feature-uddi', label: 'UDDI', noWhyNot: false },
  { key: 'feature-security', label: 'Security', noWhyNot: false },
  { key: 'feature-asset insights', label: 'Asset', noWhyNot: false },
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

// Navigation item with optional subsection
function NavItem({ item, isActive, onClick, collapsed, children }) {
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
    <div>
      <button
        onClick={onClick}
        data-testid={`nav-${item.id}`}
        className={`w-full px-3 py-2 rounded-md text-left transition-colors flex items-center gap-3 ${isActive ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[14px]' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm">{item.label}</span>
      </button>
      {/* Subsection - shows when this nav item is active */}
      {isActive && children && (
        <div className="ml-4 mt-2 mb-2 pl-3 border-l-2 border-primary/30">
          {children}
        </div>
      )}
    </div>
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

  // IP Calculator component (true calculator style)
  const IPCalculatorCard = () => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-blue-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">IP Calculator</span>
      </div>
      
      {/* Calculator display */}
      <div className="bg-slate-700/50 rounded-md p-2 mb-2 font-mono">
        <div className="text-right text-2xl font-bold text-green-400">
          {formatKW(activeIPs)}
        </div>
        <div className="text-right text-[10px] text-slate-400">
          Active IPs
        </div>
      </div>
      
      {/* Calculator inputs */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <Input
            type="number"
            value={kw || ''}
            onChange={e => setAnswer('ud-1', e.target.value)}
            className="h-8 text-xs text-center font-mono bg-slate-700 border-slate-600 text-white"
            placeholder="KW"
          />
          <div className="text-[9px] text-slate-500 mt-0.5">KW</div>
        </div>
        <div className="flex items-center justify-center text-slate-400 font-bold">×</div>
        <div>
          <Input
            type="number"
            step="0.1"
            value={mult}
            onChange={e => setAnswer('ipam-multiplier', e.target.value)}
            className="h-8 text-xs text-center font-mono bg-slate-700 border-slate-600 text-white"
          />
          <div className="text-[9px] text-slate-500 mt-0.5">Mult</div>
        </div>
      </div>
    </div>
  );

  // Target Solutions subsection (2x2 grid with why not)
  const TargetSolutionsSubsection = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
        <Target className="h-3 w-3" />
        <span>Target Solutions</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {TARGET_SOLUTIONS.map(sol => {
          const isOn = answers[sol.key] === 'Yes';
          const whyNotKey = `${sol.key}-why-not`;
          const whyNotValue = answers[whyNotKey] || '';
          const needsWhyNot = !isOn && !sol.noWhyNot;
          
          return (
            <Popover key={sol.key}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => {
                    if (!needsWhyNot) {
                      e.preventDefault();
                      setAnswer(sol.key, isOn ? 'No' : 'Yes');
                    }
                  }}
                  className={`relative px-2 py-1.5 text-[10px] rounded-md font-medium transition-colors text-center ${
                    isOn 
                      ? 'bg-green-500 text-white' 
                      : needsWhyNot 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {sol.label}
                  {needsWhyNot && !whyNotValue && (
                    <AlertCircle className="h-2.5 w-2.5 absolute -top-1 -right-1 text-amber-500" />
                  )}
                </button>
              </PopoverTrigger>
              {needsWhyNot && (
                <PopoverContent className="w-48 p-2" side="right">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Why not {sol.label}?</span>
                      {!whyNotValue && <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600">Required</Badge>}
                    </div>
                    <Textarea
                      value={whyNotValue}
                      onChange={e => setAnswer(whyNotKey, e.target.value)}
                      placeholder={`Reason for not selecting ${sol.label}...`}
                      className="text-xs min-h-[60px] resize-none"
                    />
                    <Button 
                      size="sm" 
                      className="w-full h-7 text-xs"
                      onClick={() => setAnswer(sol.key, 'Yes')}
                    >
                      Enable {sol.label}
                    </Button>
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>
    </div>
  );

  // Sizing Stats subsection
  const SizingStatsSubsection = () => (
    <div className="space-y-2">
      {/* DC/Sites */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded">
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-bold">{dataCenters.length}</span>
          <span className="text-muted-foreground text-[10px]">DC</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded">
          <MapPin className="h-3.5 w-3.5 text-green-500" />
          <span className="font-bold">{sites.length}</span>
          <span className="text-muted-foreground text-[10px]">Sites</span>
        </div>
      </div>
      
      {/* Tokens */}
      {sizingSummary && (
        <div className="flex items-center gap-2 text-xs bg-purple-500/10 px-2 py-1.5 rounded">
          <Ticket className="h-3.5 w-3.5 text-purple-500" />
          <span className="font-bold">{formatKW(sizingSummary.totalTokens)}</span>
          <span className="text-muted-foreground text-[10px]">Tokens</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto">{sizingSummary.tokenPack || '—'}</Badge>
        </div>
      )}
    </div>
  );

  // Discovery subsection - Target Solutions + IP Calculator
  const DiscoverySubsection = () => (
    <div className="space-y-3">
      <TargetSolutionsSubsection />
      <Separator className="my-2" />
      <IPCalculatorCard />
    </div>
  );

  // Sizing subsection - IP Calculator + Stats
  const SizingSubsection = () => (
    <div className="space-y-3">
      <IPCalculatorCard />
      <Separator className="my-2" />
      <SizingStatsSubsection />
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-card border-r shadow-lg transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header with Logo & Collapse */}
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
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
        <div className={`${collapsed ? 'px-1.5' : 'px-3'} py-3 space-y-1`}>
          
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
                <div className="space-y-0.5 mt-1 max-h-[180px] overflow-y-auto">
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

          {/* Navigation Section - Only show when customer selected */}
          {currentCustomer && (
            <>
              <Separator className="my-3" />
              
              <div className="space-y-0.5">
                {NAV_ITEMS.map(item => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange?.(item.id)}
                    collapsed={collapsed}
                  >
                    {/* Contextual subsections */}
                    {item.id === 'discovery' && discoveryContext && <DiscoverySubsection />}
                    {item.id === 'sizing' && discoveryContext && <SizingSubsection />}
                  </NavItem>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Save/Export */}
      {currentCustomer && (
        <div className={`p-3 border-t ${collapsed ? 'space-y-1' : 'flex gap-2'}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className={collapsed ? "w-full h-9 px-0" : "flex-1 h-9"}
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
                  className={collapsed ? "w-full h-9 px-0" : "flex-1 h-9"}
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
