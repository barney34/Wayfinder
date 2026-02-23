import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, ChevronDown, Users, 
  Save, Download, Home, Search, BarChart3,
  Ticket, Sparkles, Clock, Plus, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  
  // Use optional hook
  const discoveryContext = useDiscoveryOptional();
  const sizingSummary = discoveryContext?.sizingSummary;

  // Fetch all customers
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: () => apiRequest('/api/customers'),
  });

  return (
    <div className={`flex flex-col h-full bg-card border-r shadow-lg transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Header with WAYFINDER text and collapse button */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 border-b`}>
        {!collapsed && (
          <span className="font-bold text-sm text-[#00BD4D] tracking-wide">WAYFINDER</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
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
                  />
                ))}
              </div>

              {/* Tokens Summary - compact */}
              {!collapsed && sizingSummary && (
                <>
                  <Separator className="my-3" />
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</div>
                    {sizingSummary.platformMode !== 'NIOS' && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tokens</span>
                          <span className="font-bold">{formatKW(sizingSummary.totalTokens)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Token Packs</span>
                          <Badge variant="outline" className="text-xs">{sizingSummary.tokenPack || '—'}</Badge>
                        </div>
                      </>
                    )}
                    {sizingSummary.platformMode === 'NIOS' && (
                      <div className="text-xs text-muted-foreground italic">NIOS mode - no tokens</div>
                    )}
                  </div>
                </>
              )}
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
