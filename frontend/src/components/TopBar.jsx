import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, AlertCircle, Check, X, Pencil, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDiscovery } from "@/contexts/DiscoveryContext";

// Format numbers
const formatKW = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return n.toString();
};

// Target Solutions config
const TARGET_SOLUTIONS = [
  { key: 'feature-nios', label: 'NIOS', noWhyNot: true },
  { key: 'feature-uddi', label: 'UDDI', noWhyNot: false },
  { key: 'feature-security', label: 'Security', noWhyNot: false },
  { key: 'feature-asset insights', label: 'Asset', noWhyNot: false },
];

// Editable Tag Component
function EditableTag({ item, color, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editKW, setEditKW] = useState(item.knowledgeWorkers?.toString() || '0');

  const colorClasses = color === 'blue' 
    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15' 
    : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15';
  
  const textColor = color === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300';
  const kwColor = color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400';

  const handleSave = () => {
    onUpdate({ 
      name: editName.trim() || item.name, 
      knowledgeWorkers: parseInt(editKW) || 0 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditKW(item.knowledgeWorkers?.toString() || '0');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 ${color === 'blue' ? 'border-blue-500' : 'border-green-500'} bg-background`}>
        <Input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="Name"
          className="h-6 w-20 text-xs border-0 bg-transparent focus-visible:ring-0 px-1"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
        />
        <Input
          type="number"
          value={editKW}
          onChange={e => setEditKW(e.target.value)}
          placeholder="KW"
          className="h-6 w-16 text-xs border-0 bg-transparent focus-visible:ring-0 text-right px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
        />
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={handleSave}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={handleCancel}>
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${colorClasses}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className={`font-medium text-xs truncate max-w-[70px] ${textColor}`}>
        {item.name}
      </span>
      <span className="text-muted-foreground/50">·</span>
      <span className={`tabular-nums text-xs font-semibold ${kwColor}`}>
        {formatKW(item.knowledgeWorkers || 0)}
      </span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 ml-0.5" />
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
      </button>
    </div>
  );
}

export function TopBar({ customerName, opportunity, onNameChange, onOpportunityChange, onNameBlur, onOpportunityBlur }) {
  const { answers, setAnswer, dataCenters, sites, addDataCenter, addSite, deleteDataCenter, deleteSite, updateDataCenter, updateSite, setPlatformMode } = useDiscovery();
  const [collapsed, setCollapsed] = useState(false);
  
  // DC/Site entry state
  const [dcName, setDcName] = useState('');
  const [dcKW, setDcKW] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteKW, setSiteKW] = useState('');

  // IP Calculator values
  const kw = parseInt(answers['ud-1']) || 0;
  const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
  const activeIPs = Math.ceil(kw * mult);

  // Total KW
  const totalKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0) + sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);

  // Enabled solutions count
  const enabledSolutions = TARGET_SOLUTIONS.filter(s => answers[s.key] === 'Yes');

  // Target solution keys
  const niosEnabled = answers['feature-nios'] === 'Yes';
  const uddiEnabled = answers['feature-uddi'] === 'Yes';
  const assetEnabled = answers['feature-asset insights'] === 'Yes';

  // Cloud Management auto-selects UDDI
  const cloudMgmtActive = answers['uddi-1'] === 'Yes' || answers['uddi-4'] === 'Yes';
  const prevCloudMgmt = useRef(cloudMgmtActive);
  
  useEffect(() => {
    if (cloudMgmtActive && !prevCloudMgmt.current && !uddiEnabled) {
      setAnswer('feature-uddi', 'Yes');
    }
    prevCloudMgmt.current = cloudMgmtActive;
  }, [cloudMgmtActive, uddiEnabled, setAnswer]);

  // Auto-set deployment model based on target solutions
  useEffect(() => {
    if (niosEnabled && (uddiEnabled || assetEnabled)) {
      setPlatformMode('Hybrid');
    } else if (uddiEnabled && !niosEnabled) {
      setPlatformMode('UDDI');
    } else if (niosEnabled && !uddiEnabled && !assetEnabled) {
      setPlatformMode('NIOS');
    }
  }, [niosEnabled, uddiEnabled, assetEnabled, setPlatformMode]);

  // Add DC handler
  const handleAddDC = () => {
    if (!dcName.trim()) return;
    addDataCenter(dcName.trim(), parseInt(dcKW) || 0);
    setDcName('');
    setDcKW('');
  };

  // Add Site handler
  const handleAddSite = () => {
    if (!siteName.trim()) return;
    addSite(siteName.trim(), '', parseInt(siteKW) || 0);
    setSiteName('');
    setSiteKW('');
  };

  return (
    <div className="flex-shrink-0 bg-[#1c1c1e] border-b border-[#2c2c2e]" data-testid="topbar">
      {/* Row 1: Customer Info - Clickable to expand/collapse */}
      <div 
        className="px-4 py-2 flex items-center justify-between border-b border-[#2c2c2e] cursor-pointer hover:bg-[#2c2c2e]/30"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
          {/* Customer Name - Editable inline */}
          <div>
            <label className="text-[9px] text-[#8e8e93] uppercase tracking-wide block mb-0.5">Customer</label>
            <input
              value={customerName}
              onChange={e => onNameChange?.(e.target.value)}
              onBlur={() => onNameBlur?.()}
              className="text-sm font-semibold text-white bg-transparent border-0 border-b border-transparent hover:border-[#4c4c4e] focus:border-[#0a84ff] focus:outline-none px-0 py-0.5 min-w-[80px] max-w-[200px]"
              placeholder="Customer Name"
              data-testid="topbar-customer-name"
            />
          </div>
          
          {/* Opportunity - Editable inline */}
          <div>
            <label className="text-[9px] text-[#8e8e93] uppercase tracking-wide block mb-0.5">Opportunity</label>
            <input
              value={opportunity || ''}
              onChange={e => onOpportunityChange?.(e.target.value)}
              onBlur={() => onOpportunityBlur?.()}
              className="text-xs text-[#ff9f0a] bg-transparent border-0 border-b border-transparent hover:border-[#4c4c4e] focus:border-[#ff9f0a] focus:outline-none px-0 py-0.5 min-w-[80px] max-w-[200px] placeholder:text-[#6e6e73]"
              placeholder="Opportunity..."
              data-testid="topbar-opportunity"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Compact stats */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#2c2c2e]">
              <Building2 className="h-3 w-3 text-[#30d158]" />
              <span className="font-semibold text-white">{dataCenters.length}</span>
              <span className="text-[#8e8e93]">DCs</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#2c2c2e]">
              <MapPin className="h-3 w-3 text-[#5e5ce6]" />
              <span className="font-semibold text-white">{sites.length}</span>
              <span className="text-[#8e8e93]">Sites</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#2c2c2e]">
              <span className="text-[#8e8e93]">KW</span>
              <span className="font-semibold text-white">{formatKW(totalKW)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#32d74b]/10 border border-[#32d74b]/30">
              <Calculator className="h-3 w-3 text-[#32d74b]" />
              <span className="font-semibold text-[#32d74b]">{formatKW(activeIPs)}</span>
              <span className="text-[#32d74b]/70">IPs</span>
            </div>
          </div>
          
          <div className="p-1.5 rounded-lg bg-[#2c2c2e]">
            {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-[#8e8e93]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#8e8e93]" />}
          </div>
        </div>
      </div>

      {/* Row 2: Inputs */}
      {!collapsed && (
      <div className="px-4 py-3 grid grid-cols-4 gap-3">
        
        {/* Data Centers */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#30d158]" />
              <span className="text-xs font-medium text-white">Data Centers</span>
            </div>
          </div>
          
          {/* DC Pills - Editable */}
          {dataCenters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {dataCenters.map((dc) => (
                <div key={dc.id} className="flex items-center bg-[#3c3c3e] rounded-lg overflow-hidden">
                  <input
                    value={dc.name}
                    onChange={e => updateDataCenter(dc.id, { name: e.target.value })}
                    className="w-16 px-2 py-1 text-[11px] text-white bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e]"
                  />
                  <input
                    type="number"
                    value={dc.knowledgeWorkers || ''}
                    onChange={e => updateDataCenter(dc.id, { knowledgeWorkers: e.target.value })}
                    className="w-12 px-1 py-1 text-[11px] text-[#30d158] bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    onClick={() => deleteDataCenter(dc.id)}
                    className="px-1.5 py-1 hover:bg-[#ff453a]/20"
                  >
                    <X className="h-3 w-3 text-[#ff453a]" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add new DC */}
          <div className="flex gap-1.5">
            <input
              value={dcName}
              onChange={e => setDcName(e.target.value)}
              placeholder="Name"
              className="flex-1 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#30d158]"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <input
              type="number"
              value={dcKW}
              onChange={e => setDcKW(e.target.value)}
              placeholder="KW"
              className="w-14 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#30d158] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <button
              onClick={handleAddDC}
              disabled={!dcName.trim()}
              className="h-7 px-2 rounded-lg bg-[#30d158] hover:bg-[#30d158]/80 disabled:bg-[#3c3c3e] flex items-center justify-center gap-1 text-[10px] font-semibold text-black disabled:text-[#8e8e93]"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        {/* Sites */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#5e5ce6]" />
              <span className="text-xs font-medium text-white">Sites</span>
            </div>
          </div>
          
          {/* Site Pills - Editable */}
          {sites.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sites.map((site) => (
                <div key={site.id} className="flex items-center bg-[#3c3c3e] rounded-lg overflow-hidden">
                  <input
                    value={site.name}
                    onChange={e => updateSite(site.id, { name: e.target.value })}
                    className="w-16 px-2 py-1 text-[11px] text-white bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e]"
                  />
                  <input
                    type="number"
                    value={site.knowledgeWorkers || ''}
                    onChange={e => updateSite(site.id, { knowledgeWorkers: e.target.value })}
                    className="w-12 px-1 py-1 text-[11px] text-[#5e5ce6] bg-transparent border-0 focus:outline-none focus:bg-[#4c4c4e] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    onClick={() => deleteSite(site.id)}
                    className="px-1.5 py-1 hover:bg-[#ff453a]/20"
                  >
                    <X className="h-3 w-3 text-[#ff453a]" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add new Site */}
          <div className="flex gap-1.5">
            <input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              placeholder="Name"
              className="flex-1 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#5e5ce6]"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <input
              type="number"
              value={siteKW}
              onChange={e => setSiteKW(e.target.value)}
              placeholder="KW"
              className="w-14 h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#5e5ce6] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <button
              onClick={handleAddSite}
              disabled={!siteName.trim()}
              className="h-7 px-2 rounded-lg bg-[#5e5ce6] hover:bg-[#5e5ce6]/80 disabled:bg-[#3c3c3e] flex items-center justify-center gap-1 text-[10px] font-semibold text-white disabled:text-[#8e8e93]"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        {/* Deployment - with deployment model logic */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-[#ff9f0a]" />
            <span className="text-xs font-medium text-white">Deployment</span>
          </div>
          
          {(() => {
            const isNIOS = answers['feature-nios'] === 'Yes';
            const isUDDI = answers['feature-uddi'] === 'Yes';
            const isSecurity = answers['feature-security'] === 'Yes';
            const isAsset = answers['feature-asset insights'] === 'Yes';
            const isHybrid = isNIOS && isUDDI;
            
            const handleNIOSToggle = () => {
              setAnswer('feature-nios', !isNIOS ? 'Yes' : 'No');
            };
            
            const handleUDDIToggle = () => {
              setAnswer('feature-uddi', !isUDDI ? 'Yes' : 'No');
            };
            
            const handleHybridToggle = () => {
              if (isHybrid) {
                setAnswer('feature-nios', 'No');
                setAnswer('feature-uddi', 'No');
              } else {
                setAnswer('feature-nios', 'Yes');
                setAnswer('feature-uddi', 'Yes');
              }
            };
            
            return (
              <div className="space-y-1.5">
                {/* Row 1: NIOS + UDDI */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleNIOSToggle}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isNIOS 
                        ? 'bg-[#30d158] text-black' 
                        : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'
                    }`}
                    data-testid="toggle-feature-nios"
                  >
                    NIOS
                    {isNIOS && isAsset && (
                      <div className="relative group">
                        <Info className="h-3 w-3" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          +Mgmt Tokens Added
                        </div>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleUDDIToggle}
                    className={`flex items-center justify-center px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isUDDI 
                        ? 'bg-[#0a84ff] text-white' 
                        : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'
                    }`}
                    data-testid="toggle-feature-uddi"
                  >
                    UDDI
                  </button>
                </div>
                
                {/* Row 2: Security + Asset Insight */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setAnswer('feature-security', isSecurity ? 'No' : 'Yes')}
                    className={`flex items-center justify-center px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isSecurity 
                        ? 'bg-[#ff453a] text-white' 
                        : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'
                    }`}
                    data-testid="toggle-feature-security"
                  >
                    Security
                  </button>
                  <button
                    onClick={() => setAnswer('feature-asset insights', isAsset ? 'No' : 'Yes')}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isAsset 
                        ? 'bg-[#bf5af2] text-white' 
                        : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'
                    }`}
                    data-testid="toggle-feature-asset"
                  >
                    Asset Insight
                    {isAsset && isNIOS && (
                      <div className="relative group">
                        <Info className="h-3 w-3" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          +Mgmt Tokens Added
                        </div>
                      </div>
                    )}
                  </button>
                </div>
                
                {/* Hybrid Button - Center */}
                <button
                  onClick={handleHybridToggle}
                  className={`w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    isHybrid 
                      ? 'bg-gradient-to-r from-[#30d158] to-[#0a84ff] text-white shadow-lg' 
                      : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e] border border-dashed border-[#5c5c5e]'
                  }`}
                  data-testid="toggle-hybrid"
                >
                  <span>Hybrid</span>
                  {isHybrid && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })()}
        </div>

        {/* IP Calculator */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#32d74b]" />
              <span className="text-xs font-medium text-white">Active IPs</span>
            </div>
            <span className="text-lg font-bold text-[#32d74b]">{formatKW(activeIPs)}</span>
          </div>
          
          {/* Inputs */}
          <div className="space-y-1.5">
            <div>
              <label className="text-[10px] text-[#8e8e93] mb-0.5 block">Knowledge Workers</label>
              <input
                type="number"
                value={answers['ud-1'] || ''}
                onChange={e => setAnswer('ud-1', e.target.value)}
                placeholder="0"
                className="w-full h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white placeholder:text-[#6e6e73] focus:outline-none focus:border-[#32d74b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8e8e93] mb-0.5 block">Multiplier</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const current = parseFloat(answers['ipam-multiplier'] || '2.5');
                    setAnswer('ipam-multiplier', Math.max(0.5, current - 0.5).toString());
                  }}
                  className="h-7 w-7 rounded-lg bg-[#3c3c3e] hover:bg-[#4c4c4e] flex items-center justify-center text-white"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  step="0.5"
                  value={answers['ipam-multiplier'] || '2.5'}
                  onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs text-center rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white focus:outline-none focus:border-[#32d74b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => {
                    const current = parseFloat(answers['ipam-multiplier'] || '2.5');
                    setAnswer('ipam-multiplier', (current + 0.5).toString());
                  }}
                  className="h-7 w-7 rounded-lg bg-[#3c3c3e] hover:bg-[#4c4c4e] flex items-center justify-center text-white"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="text-[10px] text-[#8e8e93] text-center pt-1">
              {formatKW(kw)} × {mult} = <span className="text-[#32d74b] font-semibold">{formatKW(activeIPs)}</span>
            </div>
          </div>
        </div>
        
      </div>
      )}
    </div>
  );
}
