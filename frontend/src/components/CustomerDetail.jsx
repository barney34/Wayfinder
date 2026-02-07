import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Pencil, Download, Save, Plus, Trash2, Building2, MapPin, ChevronDown, ChevronRight, History, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { discoveryQuestions } from "@/lib/questions";
import { DiscoveryProvider, useDiscovery } from "@/contexts/DiscoveryContext";
import { AssessmentQuestions } from "./AssessmentQuestions";
import { MeetingNotesAI } from "./MeetingNotesAI";
import { TokenCalculatorSummary, UDSMembersTable } from "./sizing";
import { FloatingSaveButton } from "./FloatingSaveButton";
import yaml from "js-yaml";

// ===== Target Solution Toggles =====
function TargetSolutionToggles() {
  const { answers, setAnswer } = useDiscovery();
  const features = [
    { key: 'feature-uddi', label: 'UDDI' },
    { key: 'feature-security', label: 'Security' },
    { key: 'feature-asset insights', label: 'Asset Insights' },
  ];
  const platform = answers['ud-platform'] || 'NIOS (Physical/Virtual)';
  const platformShort = platform.includes('NIOS') && !platform.includes('UDDI') && !platform.includes('Hybrid') ? 'NIOS' : platform.includes('UDDI') ? 'UDDI' : 'Hybrid';

  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="platform-toggles">
      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">{platformShort}</Badge>
      {features.map(f => {
        const isOn = answers[f.key] === 'Yes';
        return (
          <Badge key={f.key} variant={isOn ? "default" : "outline"}
            className={`text-xs cursor-pointer transition-colors ${isOn ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-muted'}`}
            onClick={() => setAnswer(f.key, isOn ? 'No' : 'Yes')}
            data-testid={`toggle-${f.key}`}
          >{f.label}</Badge>
        );
      })}
    </div>
  );
}

// ===== Knowledge Workers Inline (IP Calculation Card) =====
function KnowledgeWorkersInline() {
  const { answers, setAnswer, defaultAnswers } = useDiscovery();
  const kw = answers['ud-1'] || '';
  const mult = answers['ipam-multiplier'] || defaultAnswers['ipam-multiplier'] || '2.5';
  const kwNum = parseInt(kw) || 0;
  const multNum = parseFloat(mult) || 2.5;
  const calculatedIPs = Math.round(kwNum * multNum);
  const knownIPsOverride = answers['ipam-1-override'] === 'true';
  const activeIPs = knownIPsOverride ? (parseInt(answers['ipam-1']) || 0) : calculatedIPs;

  useEffect(() => {
    if (!knownIPsOverride && kwNum > 0) {
      setAnswer('ipam-1', String(calculatedIPs));
    }
  }, [kwNum, multNum, knownIPsOverride, calculatedIPs, setAnswer]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-gradient-to-br from-muted/40 to-muted/60 rounded-xl border shadow-sm min-w-[180px]" data-testid="kw-inline">
      {/* Known IPs Toggle - Top Right */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        <label className="relative inline-flex items-center cursor-pointer" title="Toggle to manually enter known IP count">
          <input 
            type="checkbox" 
            checked={knownIPsOverride} 
            onChange={e => {
              setAnswer('ipam-1-override', e.target.checked ? 'true' : 'false');
              if (!e.target.checked) setAnswer('ipam-1', String(calculatedIPs));
            }} 
            className="sr-only peer" 
            data-testid="checkbox-known-ips" 
          />
          <div className="w-8 h-4 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Known</span>
      </div>
      
      {/* Title */}
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">IP Calculation</span>
      
      {/* Stacked Math Formula - Centered */}
      <div className="flex flex-col items-center gap-2">
        {/* KW Row */}
        <div className="flex items-center justify-center gap-2">
          <input 
            type="number" 
            value={kw} 
            onChange={e => setAnswer('ud-1', e.target.value)} 
            className="w-20 h-8 text-center text-sm font-mono bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            placeholder="0" 
            data-testid="input-kw" 
          />
          <span className="text-[10px] text-muted-foreground font-medium w-8">KW</span>
        </div>
        
        {/* Multiplier Row */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-muted-foreground font-medium w-4 text-center">×</span>
          <input 
            type="number" 
            step="0.5" 
            value={mult} 
            onChange={e => setAnswer('ipam-multiplier', e.target.value)} 
            className="w-14 h-8 text-center text-sm font-mono bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            data-testid="input-mult" 
          />
          <span className="text-[10px] text-muted-foreground font-medium w-8">mult</span>
        </div>
        
        {/* Divider */}
        <div className="w-24 h-px bg-border my-1" />
        
        {/* Result Row */}
        <div className="flex items-center justify-center gap-2">
          {knownIPsOverride ? (
            <input 
              type="number" 
              value={answers['ipam-1'] || ''} 
              onChange={e => setAnswer('ipam-1', e.target.value)} 
              className="w-20 h-8 text-center text-sm font-mono bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              data-testid="input-ips-override" 
            />
          ) : (
            <div className="w-20 h-8 flex items-center justify-center bg-primary/10 rounded-md">
              <span className="text-base font-bold tabular-nums text-primary" data-testid="calculated-ips">
                {activeIPs.toLocaleString()}
              </span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground font-medium w-8">IPs</span>
        </div>
      </div>
    </div>
  );
}

// ===== Dynamic Island Tag Component =====
function DynamicIslandTag({ id, name, kw, color, onUpdate, onDelete, testIdPrefix }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingKW, setIsEditingKW] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editKW, setEditKW] = useState(kw?.toString() || '');
  
  const colorClasses = color === 'blue' 
    ? 'bg-blue-500/15 border-blue-500/40 hover:bg-blue-500/25' 
    : 'bg-green-500/15 border-green-500/40 hover:bg-green-500/25';
  
  const handleNameSave = () => {
    if (editName.trim()) onUpdate({ name: editName.trim() });
    else setEditName(name);
    setIsEditingName(false);
  };
  
  const handleKWSave = () => {
    onUpdate({ knowledgeWorkers: parseInt(editKW) || 0 });
    setIsEditingKW(false);
  };

  // Format KW with K suffix for thousands
  const formatKW = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return val.toString();
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all duration-200 ${colorClasses}`}>
      {/* Name */}
      {isEditingName ? (
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(name); setIsEditingName(false); } }}
          className="w-14 h-4 px-1 text-[11px] bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      ) : (
        <span onClick={() => setIsEditingName(true)} className="font-medium cursor-pointer hover:underline truncate max-w-[60px]" title={name}>
          {name || 'Unnamed'}
        </span>
      )}
      
      <span className="text-muted-foreground/50">•</span>
      
      {/* KW */}
      {isEditingKW ? (
        <input
          type="number"
          value={editKW}
          onChange={e => setEditKW(e.target.value)}
          onBlur={handleKWSave}
          onKeyDown={e => { if (e.key === 'Enter') handleKWSave(); if (e.key === 'Escape') { setEditKW(kw?.toString() || ''); setIsEditingKW(false); } }}
          className="w-12 h-4 px-1 text-[11px] bg-background border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      ) : (
        <span onClick={() => setIsEditingKW(true)} className="tabular-nums cursor-pointer hover:underline">
          {formatKW(kw || 0)}
        </span>
      )}
      
      {/* Delete */}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20">
        <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// ===== Quick Capture Bar =====
function QuickCaptureBarInline() {
  const { dataCenters, sites, addDataCenter, deleteDataCenter, updateDataCenter, addSite, deleteSite, updateSite, setAnswer, answers, defaultAnswers } = useDiscovery();
  const [entryType, setEntryType] = useState('dc');
  const [entryName, setEntryName] = useState('');
  const [entryKW, setEntryKW] = useState('');
  const [showDCs, setShowDCs] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [lastAdded, setLastAdded] = useState(null);
  const nameInputRef = useRef(null);

  const totalDCKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0);
  const totalSiteKW = sites.reduce((sum, site) => sum + (site.knowledgeWorkers || 0), 0);
  const totalKW = totalDCKW + totalSiteKW;

  // IP Calculation
  const kw = answers['ud-1'] || '';
  const mult = answers['ipam-multiplier'] || defaultAnswers['ipam-multiplier'] || '2.5';
  const kwNum = parseInt(kw) || 0;
  const multNum = parseFloat(mult) || 2.5;
  const calculatedIPs = Math.round(kwNum * multNum);
  const manualOverride = answers['ipam-1-override'] === 'true';
  const activeIPs = manualOverride ? (parseInt(answers['ipam-1']) || 0) : calculatedIPs;

  // Auto-sync
  useEffect(() => { setAnswer('ud-5', dataCenters.length.toString()); }, [dataCenters.length, setAnswer]);
  useEffect(() => { setAnswer('ud-7', sites.length.toString()); }, [sites.length, setAnswer]);
  useEffect(() => {
    if (!manualOverride && kwNum > 0) setAnswer('ipam-1', String(calculatedIPs));
  }, [kwNum, multNum, manualOverride, calculatedIPs, setAnswer]);

  // Rapid entry handler
  const handleAdd = () => {
    if (!entryName.trim()) return;
    const kwVal = parseInt(entryKW) || 0;
    let newId;
    if (entryType === 'dc') {
      newId = addDataCenter(entryName.trim(), kwVal);
    } else {
      newId = addSite(entryName.trim(), '', kwVal);
    }
    setLastAdded(newId);
    setEntryName('');
    setEntryKW('');
    setTimeout(() => setLastAdded(null), 1000);
    nameInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  // Format KW with K suffix
  const formatKW = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return val.toString();
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border" data-testid="quick-capture-bar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Quick Capture</span>
      </div>
      
      {/* Rapid Entry Bar */}
      <div className="flex items-center gap-3 p-2 bg-background rounded-md border">
        {/* DC/Site Radio */}
        <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
          <button
            type="button"
            onClick={() => { setEntryType('dc'); nameInputRef.current?.focus(); }}
            onKeyDown={(e) => { if (e.key === 'd' || e.key === 'D') setEntryType('dc'); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${entryType === 'dc' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="entry-type-dc"
          >
            DC
          </button>
          <button
            type="button"
            onClick={() => { setEntryType('site'); nameInputRef.current?.focus(); }}
            onKeyDown={(e) => { if (e.key === 's' || e.key === 'S') setEntryType('site'); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${entryType === 'site' ? 'bg-green-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="entry-type-site"
          >
            Site
          </button>
        </div>
        
        {/* Name Input */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Name</span>
          <input
            ref={nameInputRef}
            type="text"
            value={entryName}
            onChange={e => setEntryName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={entryType === 'dc' ? 'e.g. Atlanta-DC1' : 'e.g. LA-Branch'}
            className="w-32 h-7 px-2 text-sm bg-background border rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="entry-name"
          />
        </div>
        
        {/* KW Input */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">KW</span>
          <input
            type="number"
            value={entryKW}
            onChange={e => setEntryKW(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-20 h-7 px-2 text-sm bg-background border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="entry-kw"
          />
        </div>
        
        {/* Add Button */}
        <Button
          variant="default"
          size="sm"
          className="h-7 px-3"
          onClick={handleAdd}
          disabled={!entryName.trim()}
          data-testid="entry-add"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
        
        <span className="text-[10px] text-muted-foreground ml-auto">Press Enter ↵ to add</span>
      </div>
      
      {/* Two Column Grid: DCs | Sites */}
      <div className="grid grid-cols-2 gap-4">
        {/* Data Centers Column */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowDCs(!showDCs)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${showDCs ? 'rotate-90' : ''}`} />
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium">Data Centers</span>
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-semibold">{dataCenters.length}</span>
            <span className="text-muted-foreground">• {formatKW(totalDCKW)} KW</span>
          </button>
          
          {showDCs && dataCenters.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pl-5 animate-in fade-in slide-in-from-top-1 duration-200">
              {dataCenters.map(dc => (
                <DynamicIslandTag
                  key={dc.id}
                  id={dc.id}
                  name={dc.name}
                  kw={dc.knowledgeWorkers}
                  color="blue"
                  onUpdate={(updates) => updateDataCenter(dc.id, updates)}
                  onDelete={() => deleteDataCenter(dc.id)}
                  testIdPrefix="dc"
                />
              ))}
            </div>
          )}
          
          {showDCs && dataCenters.length === 0 && (
            <div className="pl-5 text-xs text-muted-foreground italic">No data centers yet</div>
          )}
        </div>
        
        {/* Sites Column */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowSites(!showSites)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${showSites ? 'rotate-90' : ''}`} />
            <MapPin className="h-3.5 w-3.5 text-green-500" />
            <span className="font-medium">Sites</span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-semibold">{sites.length}</span>
            <span className="text-muted-foreground">• {formatKW(totalSiteKW)} KW</span>
          </button>
          
          {showSites && sites.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pl-5 animate-in fade-in slide-in-from-top-1 duration-200">
              {sites.map(site => (
                <DynamicIslandTag
                  key={site.id}
                  id={site.id}
                  name={site.name}
                  kw={site.knowledgeWorkers}
                  color="green"
                  onUpdate={(updates) => updateSite(site.id, updates)}
                  onDelete={() => deleteSite(site.id)}
                  testIdPrefix="site"
                />
              ))}
            </div>
          )}
          
          {showSites && sites.length === 0 && (
            <div className="pl-5 text-xs text-muted-foreground italic">No sites yet</div>
          )}
        </div>
      </div>
      
      {/* IP Calculation Row */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">IP Calculation:</span>
          <div className="flex items-center gap-1.5 text-sm">
            <input
              type="number"
              value={kw}
              onChange={e => setAnswer('ud-1', e.target.value)}
              className="w-16 h-6 px-1.5 text-center text-xs font-mono bg-background border rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
              data-testid="ip-calc-kw"
            />
            <span className="text-muted-foreground">×</span>
            <input
              type="number"
              step="0.5"
              value={mult}
              onChange={e => setAnswer('ipam-multiplier', e.target.value)}
              className="w-12 h-6 px-1.5 text-center text-xs font-mono bg-background border rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="ip-calc-mult"
            />
            <span className="text-muted-foreground">=</span>
            {manualOverride ? (
              <input
                type="number"
                value={answers['ipam-1'] || ''}
                onChange={e => setAnswer('ipam-1', e.target.value)}
                className="w-20 h-6 px-1.5 text-center text-xs font-mono bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid="ip-calc-override"
              />
            ) : (
              <span className="font-bold tabular-nums text-primary" data-testid="ip-calc-result">{activeIPs.toLocaleString()}</span>
            )}
            <span className="text-xs text-muted-foreground">IPs</span>
          </div>
        </div>
        
        {/* Auto/Manual Toggle */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${!manualOverride ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Auto</span>
          <button
            type="button"
            onClick={() => {
              const newVal = !manualOverride;
              setAnswer('ipam-1-override', newVal ? 'true' : 'false');
              if (!newVal) setAnswer('ipam-1', String(calculatedIPs));
            }}
            className={`relative w-10 h-5 rounded-full transition-colors ${manualOverride ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
            data-testid="ip-calc-toggle"
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${manualOverride ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-xs ${manualOverride ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>Manual</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="text-[10px] text-muted-foreground text-center border-t pt-2">
        DC = Data Center(s) • KW = Knowledge Workers
      </div>
    </div>
  );
}

// ===== Context Fields (SmartFill) =====
function ContextFields() {
  const { contextFields, setContextField, answers, notes } = useDiscovery();
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const [generating, setGenerating] = useState({});

  const fields = [
    { key: 'environment', label: 'Customer Environment', description: 'IPAM, DNS, DHCP, Locations, Integrations' },
    { key: 'outcomes', label: 'Project Outcomes', description: 'Goals, pain points, timeline' },
    { key: 'endState', label: 'Target End State', description: 'Architecture, migration path' },
  ];

  const handleGenerate = async (contextType) => {
    setGenerating(prev => ({ ...prev, [contextType]: true }));
    try {
      const res = await fetch(`${API_URL}/api/generate-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType, answers, notes }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setContextField(contextType, data.summary);
    } catch (err) {
      console.error('Context generation failed:', err);
    } finally {
      setGenerating(prev => ({ ...prev, [contextType]: false }));
    }
  };

  return (
    <div className="space-y-4" data-testid="context-fields">
      <h3 className="text-lg font-semibold">Context Summaries</h3>
      <p className="text-sm text-muted-foreground">AI-generated summaries based on your discovery answers. Click Generate to create or update.</p>
      {fields.map(f => (
        <div key={f.key} className="space-y-2 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{f.label}</h4>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleGenerate(f.key)} disabled={generating[f.key]} data-testid={`generate-${f.key}`}>
              {generating[f.key] ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          <textarea className="w-full min-h-[100px] p-2 text-sm bg-background border rounded-md resize-y" value={contextFields[f.key] || ''} onChange={e => setContextField(f.key, e.target.value)} placeholder={`${f.label} summary will appear here...`} data-testid={`context-${f.key}`} />
        </div>
      ))}
    </div>
  );
}

// ===== Export Button =====
function ExportButton({ customerName, customerId }) {
  const { answers, notes, contextFields, meetingNotes, enabledSections, dataCenters, sites } = useDiscovery();
  const { toast } = useToast();

  const buildExportData = () => {
    const sections = {};
    discoveryQuestions.forEach(q => {
      if (!sections[q.section]) sections[q.section] = [];
      sections[q.section].push({
        id: q.id,
        question: q.question,
        answer: answers[q.id] || '',
        note: notes[q.id] || '',
        ...(q.subsection && { subsection: q.subsection }),
        ...(q.group && { group: q.group }),
      });
    });
    return {
      customer: customerName,
      exportedAt: new Date().toISOString(),
      dataCenters, sites, contextFields, meetingNotes,
      sections,
    };
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Saved as ${filename}` });
  };

  const exportYAML = () => downloadFile(yaml.dump(buildExportData(), { noRefs: true, lineWidth: -1 }), `${customerName.replace(/\s+/g, '_')}_discovery.yaml`, 'text/yaml');

  const exportCSV = () => {
    const rows = [['Section', 'Subsection', 'Question ID', 'Question', 'Answer', 'Note']];
    discoveryQuestions.forEach(q => {
      rows.push([q.section, q.subsection || '', q.id, q.question, answers[q.id] || '', notes[q.id] || '']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `${customerName.replace(/\s+/g, '_')}_discovery.csv`, 'text/csv');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid="export-button"><Download className="h-4 w-4 mr-1" />Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportYAML} data-testid="export-yaml">Export YAML</DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} data-testid="export-csv">Export CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ===== Save Button =====
function HeaderSaveButton({ customerName, customerId }) {
  const { answers, notes, contextFields, meetingNotes, enabledSections, isDirty } = useDiscovery();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    try {
      // Create revision snapshot
      const exportData = {
        customer: customerName,
        exportDate: new Date().toISOString(),
        meetingNotes: meetingNotes || '',
        discoveryAnswers: { ...answers },
        discoveryNotes: { ...notes },
        contextSummaries: { ...contextFields },
        enabledSections,
      };
      addDynamicRevision(customerId, {
        exportedAt: new Date().toISOString(),
        format: 'save',
        customerName,
        name: `Save ${formatRevisionDate()}`,
        payload: JSON.stringify(exportData, null, 2),
      });
      toast({ title: "Saved", description: "Discovery data saved to revision history." });
    } catch (err) {
      toast({ title: "Save failed", description: "Failed to save data.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}
      className="border-green-600 text-green-600 hover:bg-green-600/10 dark:border-green-500 dark:text-green-500"
      data-testid="save-button">
      <Save className="h-4 w-4 mr-1" />
      {saving ? 'Saving...' : 'Save'}
    </Button>
  );
}

// ===== Revision Helpers (localStorage-based, matching source) =====
function formatRevisionDate(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function getRevisionStorage(customerId) {
  try {
    const stored = localStorage.getItem(`discovery-${customerId}-revisions`);
    if (!stored) return { dynamic: [], personal: [] };
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return { dynamic: parsed.map(r => ({ ...r, name: r.name || `Save ${formatRevisionDate(new Date(r.exportedAt))}` })), personal: [] };
    return parsed;
  } catch { return { dynamic: [], personal: [] }; }
}

function saveRevisionStorage(customerId, storage) {
  localStorage.setItem(`discovery-${customerId}-revisions`, JSON.stringify(storage));
}

function addDynamicRevision(customerId, revision) {
  const storage = getRevisionStorage(customerId);
  storage.dynamic.unshift({ ...revision, id: crypto.randomUUID() });
  storage.dynamic = storage.dynamic.slice(0, 10);
  saveRevisionStorage(customerId, storage);
}

function promoteToPersonal(customerId, revisionId, newName) {
  const storage = getRevisionStorage(customerId);
  const idx = storage.dynamic.findIndex(r => r.id === revisionId);
  if (idx === -1) return;
  storage.personal.unshift({ ...storage.dynamic[idx], id: crypto.randomUUID(), name: newName });
  storage.dynamic.splice(idx, 1);
  storage.personal = storage.personal.slice(0, 5);
  saveRevisionStorage(customerId, storage);
}

function renamePersonalRevision(customerId, revisionId, newName) {
  const storage = getRevisionStorage(customerId);
  const idx = storage.personal.findIndex(r => r.id === revisionId);
  if (idx !== -1) { storage.personal[idx].name = newName; saveRevisionStorage(customerId, storage); }
}

// ===== Version Control =====
function VersionControl({ customerId }) {
  const { updateAnswers, setMeetingNotes, setContextField, setNote } = useDiscovery();
  const { toast } = useToast();
  const [revisionStorage, setRevisionStorage] = useState(() => getRevisionStorage(customerId));
  const [renamingRevision, setRenamingRevision] = useState(null);
  const [renamingName, setRenamingName] = useState('');

  const refreshRevisions = () => setRevisionStorage(getRevisionStorage(customerId));

  const handleRestoreRevision = (revision) => {
    try {
      const data = JSON.parse(revision.payload);
      if (data.discoveryAnswers) updateAnswers(data.discoveryAnswers);
      if (data.meetingNotes) setMeetingNotes(data.meetingNotes);
      if (data.contextSummaries) Object.entries(data.contextSummaries).forEach(([k, v]) => { if (typeof v === 'string') setContextField(k, v); });
      if (data.discoveryNotes) Object.entries(data.discoveryNotes).forEach(([k, v]) => { if (typeof v === 'string') setNote(k, v); });
      toast({ title: "Revision restored", description: `Restored data from ${new Date(revision.exportedAt).toLocaleString()}` });
    } catch (err) {
      toast({ title: "Restore failed", description: "Failed to restore revision data.", variant: "destructive" });
    }
  };

  const handlePromote = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: false }); setRenamingName(revision.name); };
  const handleRenamePersonal = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: true }); setRenamingName(revision.name); };

  const handleSaveRenaming = () => {
    if (!renamingRevision) return;
    if (renamingRevision.isPersonal) renamePersonalRevision(customerId, renamingRevision.id, renamingName);
    else promoteToPersonal(customerId, renamingRevision.id, renamingName);
    refreshRevisions();
    setRenamingRevision(null);
    toast({ title: renamingRevision.isPersonal ? "Renamed" : "Saved to Personal", description: renamingRevision.isPersonal ? "Personal save renamed." : "Revision saved as a personal save." });
  };

  const handleCancelRenaming = () => { setRenamingRevision(null); setRenamingName(''); };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Versions</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Named Revisions */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4" />Named Revisions ({revisionStorage.personal.length}/5)</Label>
          {revisionStorage.personal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">No named revisions yet. Click "Rename" on any auto-save to add it here.</p>
          ) : (
            <div className="space-y-2">
              {revisionStorage.personal.map((rev, i) => (
                <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20 gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingRevision?.id === rev.id && renamingRevision.isPersonal ? (
                      <div className="flex items-center gap-2">
                        <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Revision name..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-personal-revision-name-${i}`} />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ) : (
                      <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{new Date(rev.exportedAt).toLocaleString()}</p></div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleRenamePersonal(rev)} data-testid={`button-rename-personal-${i}`}>Rename</Button>
                    <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-personal-${i}`}>Restore</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Auto-Saves */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Auto-Saves ({revisionStorage.dynamic.length}/10)</Label>
            <Button variant="ghost" size="sm" onClick={refreshRevisions} data-testid="button-refresh-revisions">Refresh</Button>
          </div>
          {revisionStorage.dynamic.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No auto-saves yet. Saves, exports, and imports will appear here.</p>
          ) : (
            <ScrollArea className="h-[250px] rounded-md border">
              <div className="p-4 space-y-2">
                {revisionStorage.dynamic.map((rev, i) => (
                  <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 gap-2">
                    <div className="flex-1 min-w-0">
                      {renamingRevision?.id === rev.id && !renamingRevision.isPersonal ? (
                        <div className="flex items-center gap-2">
                          <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Save as personal..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-revision-name-${i}`} />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      ) : (
                        <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{rev.format?.toUpperCase() || 'SAVE'}</p></div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handlePromote(rev)} data-testid={`button-rename-${i}`}>Rename</Button>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-${i}`}>Restore</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Clear Data Button =====
function ClearDataButton() {
  const { clearAllData } = useDiscovery();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div>
      {confirmOpen ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">Clear all data? This cannot be undone.</span>
          <Button variant="destructive" size="sm" onClick={() => { clearAllData(); setConfirmOpen(false); toast({ title: "Data cleared", description: "All discovery data has been reset." }); }} data-testid="confirm-clear-data">Yes, Clear</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} data-testid="clear-data-button" className="text-destructive border-destructive/50 hover:bg-destructive/10">Clear All Data</Button>
      )}
    </div>
  );
}

// ===== Main CustomerDetail Component =====
export function CustomerDetail({ customer, onBack }) {
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingOpportunity, setIsEditingOpportunity] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editOpportunity, setEditOpportunity] = useState(customer.opportunity || '');
  const [currentName, setCurrentName] = useState(customer.name);
  const [currentOpportunity, setCurrentOpportunity] = useState(customer.opportunity || '');

  const updateCustomerMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await apiRequest('PATCH', `/api/customers/${customer.id}`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      if (data.name) { setCurrentName(data.name); setEditName(data.name); }
      if (data.opportunity !== undefined) { setCurrentOpportunity(data.opportunity); setEditOpportunity(data.opportunity); }
      toast({ title: "Customer updated" });
    },
    onError: () => {
      setEditName(currentName);
      setEditOpportunity(currentOpportunity);
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    },
  });

  const handleSaveName = () => { if (editName.trim() && editName !== currentName) updateCustomerMutation.mutate({ name: editName.trim() }); setIsEditingName(false); };
  const handleSaveOpportunity = () => { if (editOpportunity !== currentOpportunity) updateCustomerMutation.mutate({ opportunity: editOpportunity.trim() }); setIsEditingOpportunity(false); };

  // Tab-specific question filters (matching source)
  const discoveryTabQuestions = discoveryQuestions.filter(q =>
    q.id !== 'ud-1' && q.id !== 'ipam-1' &&
    q.section !== 'Users - Devices - Sites' &&
    !(q.section === 'Security' && q.subsection === 'Token Calculator') &&
    q.section !== 'Sizing Data' && q.section !== 'UDDI'
  );
  const sizingTabQuestions = discoveryQuestions.filter(q => q.section === 'Sizing Data');
  const securityTokenQuestions = discoveryQuestions.filter(q => q.section === 'Security' && q.subsection === 'Token Calculator');
  const uddiTokenQuestions = discoveryQuestions.filter(q => q.section === 'UDDI');

  return (
    <DiscoveryProvider customerId={customer.id}>
      <div className="space-y-6 pb-10">
        <Tabs defaultValue="discovery" className="w-full">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 bg-background pb-2 space-y-3 border-b border-border/50">
            {/* Row 1: Back + Customer/Opportunity | Platform | Save/Export */}
            <div className="flex items-start justify-between pt-4 gap-4">
              <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="mt-1" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button>
                <div className="flex flex-col gap-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-base font-medium h-8 w-48" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditName(currentName); setIsEditingName(false); } }} data-testid="input-edit-name" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveName}><Check className="h-3 w-3 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditName(currentName); setIsEditingName(false); }}><X className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-sm text-muted-foreground">Customer:</span>
                      <span className="text-base font-medium text-foreground">{currentName}</span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6" onClick={() => setIsEditingName(true)} data-testid="button-edit-name"><Pencil className="h-3 w-3" /></Button>
                    </div>
                  )}
                  {isEditingOpportunity ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Opportunity:</span>
                      <Input value={editOpportunity} onChange={e => setEditOpportunity(e.target.value)} className="text-base font-medium h-8 w-48" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveOpportunity(); if (e.key === 'Escape') { setEditOpportunity(currentOpportunity); setIsEditingOpportunity(false); } }} data-testid="input-edit-opportunity" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveOpportunity}><Check className="h-3 w-3 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditOpportunity(currentOpportunity); setIsEditingOpportunity(false); }}><X className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-sm text-muted-foreground">Opportunity:</span>
                      <span className="text-base font-medium text-foreground">{currentOpportunity || '-'}</span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6" onClick={() => setIsEditingOpportunity(true)} data-testid="button-edit-opportunity"><Pencil className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-xs text-muted-foreground font-medium">Platform Chosen</span>
                <TargetSolutionToggles />
              </div>
              <div className="flex items-center gap-2">
                <HeaderSaveButton customerName={currentName} customerId={customer.id} />
                <ExportButton customerName={currentName} customerId={customer.id} />
              </div>
            </div>

            {/* Row 2: Quick Capture + Knowledge Workers */}
            <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-full text-center">
                <span className="text-sm font-medium text-foreground">Quick Capture & Sizing Requirements</span>
              </div>
              <div className="flex flex-wrap items-start gap-8">
                <div className="flex-1 min-w-[400px]">
                  <QuickCaptureBarInline />
                </div>
                <div className="border-l border-border/50 self-stretch" />
                <div className="flex-shrink-0">
                  <KnowledgeWorkersInline />
                </div>
              </div>
            </div>

            {/* Row 3: Tabs */}
            <div className="flex justify-center w-full">
              <TabsList className="bg-transparent gap-1.5 p-0 flex-nowrap overflow-x-auto">
                {['discovery', 'sizing', 'tokens', 'notes', 'import', 'versions'].map(tab => (
                  <TabsTrigger key={tab} value={tab} data-testid={`tab-${tab}`}
                    className="data-[state=active]:border-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent border border-input rounded-md px-3 py-1.5 text-sm">
                    {tab === 'notes' ? 'SmartFill' : tab === 'versions' ? 'Versions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="discovery">
            <AssessmentQuestions questions={discoveryTabQuestions} />
          </TabsContent>

          <TabsContent value="sizing">
            <div className="space-y-6">
              <TokenCalculatorSummary />
              <UDSMembersTable />
              <AssessmentQuestions questions={sizingTabQuestions} />
            </div>
          </TabsContent>

          <TabsContent value="tokens">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Calculators</h2>
              <AssessmentQuestions questions={[...securityTokenQuestions, ...uddiTokenQuestions]} />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <MeetingNotesAI />
            <ContextFields />
          </TabsContent>

          <TabsContent value="import">
            <ImportSection customerId={customer.id} />
          </TabsContent>

          <TabsContent value="versions">
            <div className="space-y-6">
              <VersionControl customerId={customer.id} />
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Data Management</h3>
                <ClearDataButton />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating Save Button */}
      <FloatingSaveButton />
    </DiscoveryProvider>
  );
}

// ===== Import Section =====
function ImportSection({ customerId }) {
  const { updateAnswers } = useDiscovery();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let data;
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        data = yaml.load(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const idIdx = headers.indexOf('Question ID');
        const ansIdx = headers.indexOf('Answer');
        if (idIdx === -1 || ansIdx === -1) throw new Error('CSV must have "Question ID" and "Answer" columns');
        const imported = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].match(/(".*?"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
          if (cols[idIdx] && cols[ansIdx]) imported[cols[idIdx]] = cols[ansIdx];
        }
        data = { answers: imported };
      } else {
        throw new Error('Unsupported file format. Use .json, .yaml, or .csv');
      }

      // Extract answers from various formats
      if (data.answers) {
        updateAnswers(data.answers);
        toast({ title: "Import successful", description: `Imported ${Object.keys(data.answers).length} answers.` });
      } else if (data.sections) {
        const imported = {};
        Object.values(data.sections).forEach(section => {
          if (Array.isArray(section)) {
            section.forEach(q => { if (q.id && q.answer) imported[q.id] = q.answer; });
          }
        });
        updateAnswers(imported);
        toast({ title: "Import successful", description: `Imported ${Object.keys(imported).length} answers.` });
      } else {
        toast({ title: "Import failed", description: "Could not find answers in the file.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 p-4" data-testid="import-section">
      <h2 className="text-lg font-semibold">Import Data</h2>
      <p className="text-sm text-muted-foreground">Import discovery data from a previously exported file (JSON, YAML, or CSV).</p>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input type="file" accept=".json,.yaml,.yml,.csv" onChange={handleFileImport} className="hidden" data-testid="import-file-input" />
          <Button variant="outline" asChild disabled={importing}><span>{importing ? 'Importing...' : 'Choose File'}</span></Button>
        </label>
        <span className="text-xs text-muted-foreground">Supports .json, .yaml, .csv</span>
      </div>
    </div>
  );
}
