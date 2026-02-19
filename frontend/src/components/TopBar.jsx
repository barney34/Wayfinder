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
    <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b shadow-sm" data-testid="topbar">
      {/* Row 1: Customer Name + Collapse Toggle */}
      <div className="px-5 py-2 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">{customerName}</h1>
          {opportunity && (
            <Badge variant="secondary" className="text-xs font-medium">{opportunity}</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Collapsed summary stats */}
          {collapsed && (
            <div className="flex items-center gap-4 text-sm" data-testid="topbar-collapsed-summary">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-bold text-blue-600">{dataCenters.length}</span>
                <span className="text-muted-foreground">DCs</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-green-600" />
                <span className="font-bold text-green-600">{sites.length}</span>
                <span className="text-muted-foreground">Sites</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">KW:</span>
                <span className="font-bold">{formatKW(totalKW)}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-green-500" />
                <span className="font-bold text-green-500">{formatKW(activeIPs)}</span>
                <span className="text-muted-foreground">IPs</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-purple-600" />
                <span className="font-bold text-purple-600">{enabledSolutions.length}/{TARGET_SOLUTIONS.length}</span>
                {enabledSolutions.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({enabledSolutions.map(s => s.label).join(', ')})
                  </span>
                )}
              </div>
            </div>
          )}
          
          {!collapsed && (
            <div className="text-sm text-muted-foreground">
              Total Knowledge Workers: <span className="font-bold text-foreground text-lg">{formatKW(totalKW)}</span>
            </div>
          )}
          
          {/* Collapse/Expand Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="topbar-collapse-toggle"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Row 2: 4 Equal Columns - only visible when expanded */}
      {!collapsed && (
      <div className="px-5 py-3 grid grid-cols-4 gap-6">
        
        {/* Column 1: Data Centers */}
        <div className="flex flex-col">
          {/* DC Header with count */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Data Centers</div>
                <div className="text-lg font-bold leading-none text-blue-600">{dataCenters.length}</div>
              </div>
            </div>
          </div>
          
          {/* DC Entry Form - Clear separation */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              {/* Name Input Box */}
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-1">Name</div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-1">
                  <Input
                    value={dcName}
                    onChange={e => setDcName(e.target.value)}
                    placeholder="Enter DC name..."
                    className="h-8 w-full text-sm border-0 bg-transparent focus-visible:ring-0"
                    onKeyDown={e => e.key === 'Enter' && handleAddDC()}
                  />
                </div>
              </div>
              
              {/* KW Input Box - Separate */}
              <div className="w-28">
                <div className="text-[10px] text-muted-foreground mb-1">Knowledge Workers</div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-1">
                  <Input
                    type="number"
                    value={dcKW}
                    onChange={e => setDcKW(e.target.value)}
                    placeholder="0"
                    className="h-8 w-full text-sm border-0 bg-transparent focus-visible:ring-0 text-center font-mono font-semibold text-blue-700 dark:text-blue-300"
                    onKeyDown={e => e.key === 'Enter' && handleAddDC()}
                  />
                </div>
              </div>
              
              {/* Add Button */}
              <div className="pt-5">
                <Button 
                  size="sm" 
                  className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600"
                  onClick={handleAddDC}
                  disabled={!dcName.trim()}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* DC Tags - 2 columns, expandable (no scroll) */}
          {dataCenters.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {dataCenters.map((dc, idx) => (
                <EditableTag
                  key={dc.id || idx}
                  item={dc}
                  color="blue"
                  onUpdate={(updates) => updateDataCenter(dc.id, updates)}
                  onDelete={() => deleteDataCenter(dc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Sites */}
        <div className="flex flex-col">
          {/* Sites Header with count */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">Sites</div>
                <div className="text-lg font-bold leading-none text-green-600">{sites.length}</div>
              </div>
            </div>
          </div>
          
          {/* Site Entry Form - Clear separation */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              {/* Name Input Box */}
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-1">Name</div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-1">
                  <Input
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    placeholder="Enter site name..."
                    className="h-8 w-full text-sm border-0 bg-transparent focus-visible:ring-0"
                    onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                  />
                </div>
              </div>
              
              {/* KW Input Box - Separate */}
              <div className="w-28">
                <div className="text-[10px] text-muted-foreground mb-1">Knowledge Workers</div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 p-1">
                  <Input
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
