import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, Calculator, Target, Plus, AlertCircle, Check, X, Pencil, ChevronDown, ChevronUp
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

export function TopBar({ customerName, opportunity }) {
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
      {/* Row 1: Customer Name + Stats */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-white">{customerName}</h1>
          {opportunity && (
            <span className="text-[10px] text-[#8e8e93] px-2 py-0.5 rounded-full bg-[#2c2c2e]">{opportunity}</span>
          )}
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
          
          <button
            className="p-1.5 rounded-lg bg-[#2c2c2e] hover:bg-[#3c3c3e]"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="topbar-collapse-toggle"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-[#8e8e93]" /> : <ChevronUp className="h-3.5 w-3.5 text-[#8e8e93]" />}
          </button>
        </div>
      </div>

      {/* Row 2: Compact Inputs - visible borders */}
      {!collapsed && (
      <div className="px-4 pb-3 grid grid-cols-4 gap-3">
        
        {/* Data Centers - compact */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-[#30d158]" />
            <span className="text-xs font-medium text-white">Data Centers</span>
          </div>
          
          {/* DC Tags */}
          {dataCenters.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {dataCenters.map((dc, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3c3c3e] group text-[11px]">
                  <span className="text-white">{dc.name}</span>
                  <span className="text-[#30d158]">{dc.knowledgeWorkers || 0}</span>
                  <button onClick={() => deleteDataCenter(idx)} className="opacity-0 group-hover:opacity-100">
                    <X className="h-2.5 w-2.5 text-[#ff453a]" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Inputs with visible borders */}
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
              className="h-7 w-7 rounded-lg bg-[#30d158] hover:bg-[#30d158]/80 disabled:bg-[#3c3c3e] flex items-center justify-center"
            >
              <Plus className="h-3.5 w-3.5 text-black" />
            </button>
          </div>
        </div>

        {/* Sites - compact */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-[#5e5ce6]" />
            <span className="text-xs font-medium text-white">Sites</span>
          </div>
          
          {/* Site Tags */}
          {sites.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {sites.map((site, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3c3c3e] group text-[11px]">
                  <span className="text-white">{site.name}</span>
                  <span className="text-[#5e5ce6]">{site.knowledgeWorkers || 0}</span>
                  <button onClick={() => deleteSite(idx)} className="opacity-0 group-hover:opacity-100">
                    <X className="h-2.5 w-2.5 text-[#ff453a]" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Inputs with visible borders */}
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
              className="h-7 w-7 rounded-lg bg-[#5e5ce6] hover:bg-[#5e5ce6]/80 disabled:bg-[#3c3c3e] flex items-center justify-center"
            >
              <Plus className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Target Solutions - compact toggles */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-[#ff9f0a]" />
            <span className="text-xs font-medium text-white">Solutions</span>
            <span className="text-[10px] text-[#8e8e93]">{enabledSolutions.length}/{TARGET_SOLUTIONS.length}</span>
          </div>
          
          {/* Compact toggle grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {TARGET_SOLUTIONS.map(sol => {
              const isOn = answers[sol.key] === 'Yes';
              return (
                <button
                  key={sol.key}
                  onClick={() => setAnswer(sol.key, isOn ? 'No' : 'Yes')}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all ${
                    isOn 
                      ? 'bg-[#ff9f0a]/20 border border-[#ff9f0a]/40 text-[#ff9f0a]' 
                      : 'bg-[#3c3c3e] text-[#8e8e93] hover:bg-[#4c4c4e]'
                  }`}
                  data-testid={`toggle-${sol.key}`}
                >
                  <span className="font-medium">{sol.label}</span>
                  <div className={`w-6 h-3.5 rounded-full p-0.5 ${isOn ? 'bg-[#ff9f0a]' : 'bg-[#636366]'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${isOn ? 'translate-x-2.5' : 'translate-x-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* IP Calculator - compact */}
        <div className="bg-[#2c2c2e] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#32d74b]" />
              <span className="text-xs font-medium text-white">Active IPs</span>
            </div>
            <span className="text-lg font-bold text-[#32d74b]">{formatKW(activeIPs)}</span>
          </div>
          
          {/* Inputs with visible borders */}
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
            <div className="flex gap-1.5 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-[#8e8e93] mb-0.5 block">Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={answers['ipam-multiplier'] || '2.5'}
                  onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                  className="w-full h-7 px-2 text-xs rounded-lg bg-[#1c1c1e] border border-[#4c4c4e] text-white focus:outline-none focus:border-[#32d74b] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="text-[10px] text-[#8e8e93] pb-1.5">
                {formatKW(kw)} × {mult} = <span className="text-[#32d74b] font-semibold">{formatKW(activeIPs)}</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      )}
    </div>
  );
}
