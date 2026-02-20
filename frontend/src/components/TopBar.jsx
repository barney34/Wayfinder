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
    <div className="flex-shrink-0 bg-[#1c1c1e] dark:bg-[#1c1c1e] border-b border-[#2c2c2e]" data-testid="topbar">
      {/* Row 1: Customer Name + Collapse Toggle */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">{customerName}</h1>
          {opportunity && (
            <span className="text-xs text-[#8e8e93] px-2 py-0.5 rounded-full bg-[#2c2c2e]">{opportunity}</span>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          {/* Stats pills - Home Assistant style */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2c2c2e]">
              <Building2 className="h-4 w-4 text-[#30d158]" />
              <span className="font-semibold text-white">{dataCenters.length}</span>
              <span className="text-[#8e8e93]">DCs</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2c2c2e]">
              <MapPin className="h-4 w-4 text-[#5e5ce6]" />
              <span className="font-semibold text-white">{sites.length}</span>
              <span className="text-[#8e8e93]">Sites</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2c2c2e]">
              <span className="text-[#8e8e93]">KW</span>
              <span className="font-semibold text-white">{formatKW(totalKW)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#32d74b]/10 border border-[#32d74b]/30">
              <Calculator className="h-4 w-4 text-[#32d74b]" />
              <span className="font-semibold text-[#32d74b]">{formatKW(activeIPs)}</span>
              <span className="text-[#32d74b]/70">IPs</span>
            </div>
          </div>
          
          {/* Collapse Toggle */}
          <button
            className="p-2 rounded-xl bg-[#2c2c2e] hover:bg-[#3c3c3e] transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="topbar-collapse-toggle"
          >
            {collapsed ? <ChevronDown className="h-4 w-4 text-[#8e8e93]" /> : <ChevronUp className="h-4 w-4 text-[#8e8e93]" />}
          </button>
        </div>
      </div>

      {/* Row 2: Cards Grid - Home Assistant style */}
      {!collapsed && (
      <div className="px-5 pb-4 grid grid-cols-4 gap-4">
        
        {/* Card 1: Data Centers */}
        <div className="bg-[#2c2c2e] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#30d158]/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#30d158]" />
            </div>
            <div>
              <div className="text-[#8e8e93] text-xs">Data Centers</div>
              <div className="text-2xl font-bold text-white">{dataCenters.length}</div>
            </div>
          </div>
          
          {/* DC Tags */}
          <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
            {dataCenters.map((dc, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3c3c3e] group">
                <span className="text-xs font-medium text-white">{dc.name}</span>
                <span className="text-[10px] text-[#30d158]">{formatKW(dc.knowledgeWorkers || 0)}</span>
                <button 
                  onClick={() => deleteDataCenter(idx)}
                  className="opacity-0 group-hover:opacity-100 ml-1"
                >
                  <X className="h-3 w-3 text-[#8e8e93] hover:text-[#ff453a]" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Add DC Input */}
          <div className="flex items-center gap-2">
            <input
              value={dcName}
              onChange={e => setDcName(e.target.value)}
              placeholder="Name"
              className="flex-1 h-9 px-3 rounded-xl bg-[#1c1c1e] border-0 text-sm text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#30d158]/50"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <input
              type="number"
              value={dcKW}
              onChange={e => setDcKW(e.target.value)}
              placeholder="KW"
              className="w-20 h-9 px-3 rounded-xl bg-[#1c1c1e] border-0 text-sm text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#30d158]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onKeyDown={e => e.key === 'Enter' && handleAddDC()}
            />
            <button
              onClick={handleAddDC}
              disabled={!dcName.trim()}
              className="h-9 w-9 rounded-xl bg-[#30d158] hover:bg-[#30d158]/80 disabled:bg-[#3c3c3e] disabled:text-[#8e8e93] flex items-center justify-center transition-colors"
            >
              <Plus className="h-4 w-4 text-black" />
            </button>
          </div>
        </div>

        {/* Card 2: Sites */}
        <div className="bg-[#2c2c2e] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#5e5ce6]/20 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-[#5e5ce6]" />
            </div>
            <div>
              <div className="text-[#8e8e93] text-xs">Sites</div>
              <div className="text-2xl font-bold text-white">{sites.length}</div>
            </div>
          </div>
          
          {/* Site Tags */}
          <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
            {sites.map((site, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3c3c3e] group">
                <span className="text-xs font-medium text-white">{site.name}</span>
                <span className="text-[10px] text-[#5e5ce6]">{formatKW(site.knowledgeWorkers || 0)}</span>
                <button 
                  onClick={() => deleteSite(idx)}
                  className="opacity-0 group-hover:opacity-100 ml-1"
                >
                  <X className="h-3 w-3 text-[#8e8e93] hover:text-[#ff453a]" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Add Site Input */}
          <div className="flex items-center gap-2">
            <input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              placeholder="Name"
              className="flex-1 h-9 px-3 rounded-xl bg-[#1c1c1e] border-0 text-sm text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#5e5ce6]/50"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <input
              type="number"
              value={siteKW}
              onChange={e => setSiteKW(e.target.value)}
              placeholder="KW"
              className="w-20 h-9 px-3 rounded-xl bg-[#1c1c1e] border-0 text-sm text-white placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#5e5ce6]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
            <button
              onClick={handleAddSite}
              disabled={!siteName.trim()}
              className="h-9 w-9 rounded-xl bg-[#5e5ce6] hover:bg-[#5e5ce6]/80 disabled:bg-[#3c3c3e] disabled:text-[#8e8e93] flex items-center justify-center transition-colors"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Card 3: Target Solutions */}
        <div className="bg-[#2c2c2e] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff9f0a]/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-[#ff9f0a]" />
            </div>
            <div>
              <div className="text-[#8e8e93] text-xs">Target Solutions</div>
              <div className="text-2xl font-bold text-white">{enabledSolutions.length}<span className="text-lg text-[#8e8e93]">/{TARGET_SOLUTIONS.length}</span></div>
            </div>
          </div>
          
          {/* Solution Toggles - HA style */}
          <div className="space-y-2">
            {TARGET_SOLUTIONS.map(sol => {
              const isOn = answers[sol.key] === 'Yes';
              return (
                <button
                  key={sol.key}
                  onClick={() => setAnswer(sol.key, isOn ? 'No' : 'Yes')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isOn 
                      ? 'bg-[#ff9f0a]/20 border border-[#ff9f0a]/30' 
                      : 'bg-[#3c3c3e] hover:bg-[#4c4c4e]'
                  }`}
                  data-testid={`toggle-${sol.key}`}
                >
                  <span className={`text-sm font-medium ${isOn ? 'text-[#ff9f0a]' : 'text-white'}`}>
                    {sol.label}
                  </span>
                  {/* Toggle pill */}
                  <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isOn ? 'bg-[#ff9f0a]' : 'bg-[#636366]'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 4: IP Calculator */}
        <div className="bg-[#2c2c2e] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#32d74b]/20 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-[#32d74b]" />
            </div>
            <div>
              <div className="text-[#8e8e93] text-xs">Active IPs</div>
              <div className="text-2xl font-bold text-[#32d74b]">{formatKW(activeIPs)}</div>
            </div>
          </div>
          
          {/* Calculator Inputs */}
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-[#8e8e93] mb-1.5">Knowledge Workers</div>
              <input
                type="number"
                value={answers['ud-1'] || ''}
                onChange={e => setAnswer('ud-1', e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-[#1c1c1e] border-0 text-white text-lg font-semibold placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#32d74b]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <div className="text-[10px] text-[#8e8e93] mb-1.5">Multiplier</div>
              <input
                type="number"
                step="0.1"
                value={answers['ipam-multiplier'] || '2.5'}
                onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#1c1c1e] border-0 text-white text-lg font-semibold placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#32d74b]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {/* Formula display */}
            <div className="flex items-center justify-center gap-2 pt-2 text-sm">
              <span className="text-[#8e8e93]">{formatKW(kw)}</span>
              <span className="text-[#8e8e93]">×</span>
              <span className="text-[#8e8e93]">{mult}</span>
              <span className="text-[#8e8e93]">=</span>
              <span className="font-bold text-[#32d74b]">{formatKW(activeIPs)}</span>
            </div>
          </div>
        </div>
        
      </div>
      )}
    </div>
  );
}
                    type="number"
                    value={siteKW}
                    onChange={e => setSiteKW(e.target.value)}
                    placeholder="0"
                    className="h-8 w-full text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-mono font-semibold text-green-700 dark:text-green-300"
                    onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                  />
                </div>
              </div>
              
              {/* Add Button */}
              <div className="pt-5">
                <Button 
                  size="sm" 
                  className="h-10 w-10 p-0 bg-green-500 hover:bg-green-600"
                  onClick={handleAddSite}
                  disabled={!siteName.trim()}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Site Tags - 2 columns, expandable (no scroll) */}
          {sites.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {sites.map((site, idx) => (
                <EditableTag
                  key={site.id || idx}
                  item={site}
                  color="green"
                  onUpdate={(updates) => updateSite(site.id, updates)}
                  onDelete={() => deleteSite(site.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Target Solutions - 2x2 Grid */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Target Solutions</div>
              <div className="text-lg font-bold leading-none text-purple-600">
                {TARGET_SOLUTIONS.filter(s => answers[s.key] === 'Yes').length}/{TARGET_SOLUTIONS.length}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-1">
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
                      className={`relative px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                        isOn 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : needsWhyNot 
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300' 
                            : 'bg-white dark:bg-slate-700 text-muted-foreground border border-border hover:bg-muted'
                      }`}
                    >
                      {isOn && <Check className="h-3.5 w-3.5 inline mr-1" />}
                      {sol.label}
                      {needsWhyNot && !whyNotValue && (
                        <AlertCircle className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
                      )}
                    </button>
                  </PopoverTrigger>
                  {needsWhyNot && (
                    <PopoverContent className="w-52 p-3" side="bottom">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Why not {sol.label}?</span>
                          {!whyNotValue && <Badge variant="outline" className="text-[9px] px-1 text-amber-600">Required</Badge>}
                        </div>
                        <Textarea
                          value={whyNotValue}
                          onChange={e => setAnswer(whyNotKey, e.target.value)}
                          placeholder={`Reason...`}
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

        {/* Column 4: IP Calculator */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">IP Calculator</div>
              <div className="text-lg font-bold leading-none text-green-500">{formatKW(activeIPs)} IPs</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 shadow-lg flex-1">
            {/* Calculator Layout */}
            <div className="space-y-2">
              {/* Knowledge Workers Row */}
              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Knowledge Workers</Label>
                <Input
                  type="number"
                  value={kw || ''}
                  onChange={e => setAnswer('ud-1', e.target.value)}
                  className="h-10 w-full text-lg text-center font-mono bg-slate-700/80 border-slate-600 text-white"
                  placeholder="0"
                  data-testid="ip-calc-kw-input"
                />
              </div>
              
              {/* Multiplier Row */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={mult}
                    onChange={e => setAnswer('ipam-multiplier', e.target.value)}
                    className="h-8 w-full text-sm text-center font-mono bg-slate-700/80 border-slate-600 text-white"
                  />
                </div>
                <div className="text-2xl text-slate-500 font-light pt-5">=</div>
                <div className="flex-1 bg-slate-700/50 rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-green-400 font-mono">{formatKW(activeIPs)}</div>
                  <div className="text-[9px] text-slate-400 uppercase">Active IPs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
