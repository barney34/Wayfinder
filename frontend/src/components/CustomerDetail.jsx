import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Pencil, Download, Save, Plus, Trash2, Building2, MapPin, ChevronDown, ChevronRight, History, Star, Info, Server, Cpu, Package, DollarSign, Search, BarChart3, Ticket, Sparkles, FolderSync, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { discoveryQuestions } from "@/lib/questions";
import { DiscoveryProvider, useDiscovery } from "@/contexts/DiscoveryContext";
import { AssessmentQuestions } from "./AssessmentQuestions";
import { MeetingNotesAI } from "./MeetingNotesAI";
import { TokenCalculatorSummary, UDSMembersTable } from "./sizing";
import { FloatingSaveButton } from "./FloatingSaveButton";
import { AppSidebar } from "./AppSidebar";
import { QuickSiteEntry } from "./QuickSiteEntry";
import { TargetSolutions, DeploymentModel } from "./PlatformSelection";
import { SizingMathHelp } from "./SizingMathHelp";
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

// ===== Dynamic Island Tag Component (Responsive) =====
function DynamicIslandTag({ id, name, kw, color, onUpdate, onDelete }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingKW, setIsEditingKW] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editKW, setEditKW] = useState(kw?.toString() || '');
  
  const colorClasses = color === 'blue' 
    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' 
    : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20';
  
  const handleNameSave = () => {
    if (editName.trim()) onUpdate({ name: editName.trim() });
    else setEditName(name);
    setIsEditingName(false);
  };
  
  const handleKWSave = () => {
    onUpdate({ knowledgeWorkers: parseInt(editKW) || 0 });
    setIsEditingKW(false);
  };

  const formatKW = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return val.toString();
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded-md border text-xs lg:text-sm transition-all duration-150 ${colorClasses}`}>
      {isEditingName ? (
        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleNameSave}
          onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(name); setIsEditingName(false); } }}
          className="w-16 lg:w-24 h-5 lg:h-6 px-1 text-xs lg:text-sm bg-background border rounded focus:outline-none" autoFocus />
      ) : (
        <span onClick={() => setIsEditingName(true)} className="font-medium cursor-pointer hover:underline truncate max-w-[60px] lg:max-w-[100px]" title={name}>
          {name || '?'}
        </span>
      )}
      <span className="text-muted-foreground/40">·</span>
      {isEditingKW ? (
        <input type="number" value={editKW} onChange={e => setEditKW(e.target.value)} onBlur={handleKWSave}
          onKeyDown={e => { if (e.key === 'Enter') handleKWSave(); if (e.key === 'Escape') { setEditKW(kw?.toString() || ''); setIsEditingKW(false); } }}
          className="w-16 lg:w-20 h-5 lg:h-6 px-1 text-xs lg:text-sm bg-background border rounded text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" autoFocus />
      ) : (
        <span onClick={() => setIsEditingKW(true)} className="tabular-nums cursor-pointer hover:underline">{formatKW(kw || 0)}</span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="ml-1 p-0.5 rounded hover:bg-destructive/20">
        <X className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground/50 hover:text-destructive" />
      </button>
    </div>
  );
}

// ===== Quick Capture Bar =====
function QuickCaptureBarInline() {
  const { dataCenters, sites, addDataCenter, deleteDataCenter, updateDataCenter, addSite, deleteSite, updateSite, setAnswer, answers, defaultAnswers, platformMode, setPlatformMode, sizingSummary } = useDiscovery();
  const [entryType, setEntryType] = useState('dc');
  const [entryName, setEntryName] = useState('');
  const [entryKW, setEntryKW] = useState('');
  const [showDCs, setShowDCs] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const nameInputRef = useRef(null);

  const totalDCKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0);
  const totalSiteKW = sites.reduce((sum, site) => sum + (site.knowledgeWorkers || 0), 0);

  // IP Calculation
  const kw = answers['ud-1'] || '';
  const mult = answers['ipam-multiplier'] || defaultAnswers['ipam-multiplier'] || '2.5';
  const kwNum = parseInt(kw) || 0;
  const multNum = parseFloat(mult) || 2.5;
  const calculatedIPs = Math.round(kwNum * multNum);
  const manualOverride = answers['ipam-1-override'] === 'true';
  const manualIPs = parseInt(answers['ipam-1']) || 0;
  const activeIPs = manualOverride ? manualIPs : calculatedIPs;

  // Auto-sync
  useEffect(() => { setAnswer('ud-5', dataCenters.length.toString()); }, [dataCenters.length, setAnswer]);
  useEffect(() => { setAnswer('ud-7', sites.length.toString()); }, [sites.length, setAnswer]);
  useEffect(() => {
    if (!manualOverride && kwNum > 0) setAnswer('ipam-1', String(calculatedIPs));
  }, [kwNum, multNum, manualOverride, calculatedIPs, setAnswer]);

  // Auto-populate KW when DC selected - use IP Calc KW (or manual override value)
  useEffect(() => {
    if (entryType === 'dc' && entryKW === '') {
      if (manualOverride && manualIPs > 0) {
        setEntryKW(manualIPs.toString());
      } else if (kwNum > 0) {
        setEntryKW(kwNum.toString());
      }
    }
  }, [entryType, kwNum, manualOverride, manualIPs]);

  // When switching to DC, pre-fill KW
  const handleEntryTypeChange = (type) => {
    setEntryType(type);
    if (type === 'dc') {
      if (manualOverride && manualIPs > 0) {
        setEntryKW(manualIPs.toString());
      } else if (kwNum > 0) {
        setEntryKW(kwNum.toString());
      }
    } else {
      setEntryKW('');
    }
    nameInputRef.current?.focus();
  };

  // Rapid entry handler
  const handleAdd = () => {
    if (!entryName.trim()) return;
    // For DC in manual mode, use the override value
    const kwVal = entryType === 'dc' && manualOverride && manualIPs > 0 
      ? manualIPs 
      : (parseInt(entryKW) || 0);
    
    if (entryType === 'dc') {
      addDataCenter(entryName.trim(), kwVal);
    } else {
      addSite(entryName.trim(), '', parseInt(entryKW) || 0);
    }
    setEntryName('');
    // Reset KW - will auto-populate again for DC
    if (entryType === 'dc') {
      setEntryKW(manualOverride && manualIPs > 0 ? manualIPs.toString() : kwNum.toString());
    } else {
      setEntryKW('');
    }
    nameInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  const formatKW = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return val.toString();
  };

  // Platform modes
  const PLATFORM_MODES = [
    { value: 'NIOS', label: 'NIOS' },
    { value: 'UDDI', label: 'UDDI' },
    { value: 'Hybrid', label: 'Hybrid' },
  ];

  return (
    <div className="flex items-center gap-4 py-1" data-testid="quick-capture-bar">
      {/* IP Calculator - Inline compact */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border">
        <span className="text-xs text-muted-foreground font-medium">IP Calc:</span>
        <input
          type="number"
          value={kw}
          onChange={e => setAnswer('ud-1', e.target.value)}
          className="w-16 h-7 text-center text-sm font-mono bg-muted/50 border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="KW"
          data-testid="ip-calc-kw"
        />
        <span className="text-muted-foreground text-sm">×</span>
        <input
          type="number"
          step="0.5"
          value={mult}
          onChange={e => setAnswer('ipam-multiplier', e.target.value)}
          className="w-12 h-7 text-center text-sm font-mono bg-muted/50 border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          data-testid="ip-calc-mult"
        />
        <span className="text-muted-foreground">=</span>
        {manualOverride ? (
          <input
            type="number"
            value={answers['ipam-1'] || ''}
            onChange={e => setAnswer('ipam-1', e.target.value)}
            className="w-20 h-7 text-center text-sm font-bold font-mono bg-amber-100 dark:bg-amber-900/30 border border-amber-400 rounded focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="ip-calc-override"
          />
        ) : (
          <span className="w-20 h-7 flex items-center justify-center bg-primary/10 rounded border border-primary/30 text-sm font-bold tabular-nums text-primary">
            {formatKW(activeIPs)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">IPs</span>
        <button
          type="button"
          onClick={() => {
            const newVal = !manualOverride;
            setAnswer('ipam-1-override', newVal ? 'true' : 'false');
            if (!newVal) setAnswer('ipam-1', String(calculatedIPs));
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${manualOverride ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
          data-testid="ip-calc-toggle"
        >
          {manualOverride ? 'Manual' : 'Auto'}
        </button>
      </div>

      {/* DC/Site Tags - Compact */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium">{dataCenters.length} DC</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">{sites.length} Sites</span>
        </div>
      </div>

      {/* Sizing Summary - Compact */}
      {sizingSummary && (
        <div className="flex items-center gap-3 ml-auto text-xs">
          <div className="flex items-center gap-1">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatKW(sizingSummary.totalIPs)} IPs</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatKW(sizingSummary.totalTokens)} Tokens</span>
          </div>
          <Badge variant="outline" className="text-xs py-0 px-2">{sizingSummary.tokenPack}</Badge>
        </div>
      )}
    </div>
  );
}

// ===== Context Fields removed - now integrated into MeetingNotesAI =====

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
      <CustomerDetailContent 
        customer={customer}
        currentName={currentName}
        currentOpportunity={currentOpportunity}
        onBack={onBack}
        discoveryTabQuestions={discoveryTabQuestions}
        sizingTabQuestions={sizingTabQuestions}
        securityTokenQuestions={securityTokenQuestions}
        uddiTokenQuestions={uddiTokenQuestions}
      />
    </DiscoveryProvider>
  );
}

// Inner component that uses DiscoveryContext
function CustomerDetailContent({ 
  customer, 
  currentName, 
  currentOpportunity, 
  onBack, 
  discoveryTabQuestions,
  sizingTabQuestions,
  securityTokenQuestions,
  uddiTokenQuestions
}) {
  const [activeTab, setActiveTab] = useState('discovery');
  const discoveryContext = useDiscovery();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      await discoveryContext.saveToServer?.();
      toast({ title: "Saved", description: "All changes saved successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Export handler
  const handleExport = () => {
    const data = {
      customer: { name: currentName, opportunity: currentOpportunity },
      answers: discoveryContext.answers || {},
      dataCenters: discoveryContext.dataCenters || [],
      sites: discoveryContext.sites || [],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentName.replace(/\s+/g, '_')}_sizing_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Data exported as JSON." });
  };

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* Sidebar with Navigation */}
      <AppSidebar
        currentCustomer={customer}
        currentOpportunity={currentOpportunity}
        onCustomerSelect={(c) => {
          if (c.id !== customer.id) {
            window.location.href = `/?customer=${c.id}`;
          }
        }}
        onBack={onBack}
        onSave={handleSave}
        onExport={handleExport}
        saving={saving}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header Bar - Current Customer Info */}
        <div className="flex-shrink-0 bg-card border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{currentName}</h1>
            {currentOpportunity && (
              <Badge variant="outline" className="text-xs">{currentOpportunity}</Badge>
            )}
          </div>
          <TargetSolutionToggles />
        </div>

        {/* Scrollable Content - No more nested Tabs, just direct content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Discovery Tab */}
            {activeTab === 'discovery' && (
              <div className="space-y-4" data-testid="tab-content-discovery">
                <QuickSiteEntry />
                <TargetSolutions />
                <AssessmentQuestions questions={discoveryTabQuestions} compact={true} />
              </div>
            )}

            {/* Sizing Tab */}
            {activeTab === 'sizing' && (
              <div className="space-y-4" data-testid="tab-content-sizing">
                <QuickSiteEntry />
                <DeploymentModel />
                <SizingMathHelp />
                <TokenCalculatorSummary />
                <UDSMembersTable />
                <AssessmentQuestions questions={sizingTabQuestions} />
              </div>
            )}

            {/* Tokens Tab */}
            {activeTab === 'tokens' && (
              <div data-testid="tab-content-tokens">
                <AssessmentQuestions questions={[...securityTokenQuestions, ...uddiTokenQuestions]} />
              </div>
            )}

            {/* SmartFill Tab */}
            {activeTab === 'smartfill' && (
              <div data-testid="tab-content-smartfill">
                <MeetingNotesAI />
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4" data-testid="tab-content-history">
                <VersionControl customerId={customer.id} />
                <ImportExportSection customerId={customer.id} customerName={currentName} />
                <div className="pt-4 border-t border-border">
                  <ClearDataButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <FloatingSaveButton />
    </div>
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

// ===== Combined Import/Export Section =====
function ImportExportSection({ customerId, customerName }) {
  const { answers, notes, meetingNotes, contextFields, updateAnswers } = useDiscovery();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [exportType, setExportType] = useState('discovery');

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

  const exportData = (format) => {
    const data = {
      customer: customerName,
      exportedAt: new Date().toISOString(),
      type: exportType,
      answers,
      notes,
      meetingNotes,
      contextFields,
    };

    let content, filename, mimeType;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `${customerName}-${exportType}-export.json`;
      mimeType = 'application/json';
    } else if (format === 'yaml') {
      content = yaml.dump(data);
      filename = `${customerName}-${exportType}-export.yaml`;
      mimeType = 'text/yaml';
    } else if (format === 'csv') {
      const rows = [['Question ID', 'Answer', 'Note']];
      Object.entries(answers).forEach(([id, answer]) => {
        rows.push([id, answer || '', notes[id] || '']);
      });
      content = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      filename = `${customerName}-${exportType}-export.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export successful", description: `Exported ${exportType} data as ${format.toUpperCase()}.` });
  };

  return (
    <div className="space-y-6" data-testid="import-export-section">
      <div className="flex items-center justify-between">
        <h2 className="text-base lg:text-lg font-semibold flex items-center gap-2">
          <FolderSync className="h-5 w-5" />
          Import / Export
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import discovery data from a previously exported file.
            </p>
            <label className="cursor-pointer inline-block">
              <input type="file" accept=".json,.yaml,.yml,.csv" onChange={handleFileImport} className="hidden" data-testid="import-file-input" />
              <Button variant="outline" asChild disabled={importing}>
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {importing ? 'Importing...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground">Supports .json, .yaml, .csv</p>
          </CardContent>
        </Card>

        {/* Export Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 rotate-180" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your discovery data to share or backup.
            </p>
            
            {/* Export Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Export Type</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="w-full" data-testid="export-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discovery">Discovery Questions</SelectItem>
                  <SelectItem value="sizing">Sizing Data</SelectItem>
                  <SelectItem value="tokens">Token Calculations</SelectItem>
                  <SelectItem value="all">All Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportData('json')} data-testid="export-json">
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData('yaml')} data-testid="export-yaml">
                YAML
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData('csv')} data-testid="export-csv">
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
