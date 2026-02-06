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

// ===== Knowledge Workers Inline (Stacked Math Formula) =====
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
    <div className="flex items-center gap-4" data-testid="kw-inline">
      {/* Stacked Math Formula */}
      <div className="flex flex-col items-center gap-0.5 p-2 bg-muted/50 rounded-md border">
        <div className="flex items-center gap-1">
          <Input type="number" value={kw} onChange={e => setAnswer('ud-1', e.target.value)} className="w-20 h-6 text-sm text-center" placeholder="0" data-testid="input-kw" />
          <span className="text-xs text-muted-foreground">KW</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">×</span>
          <Input type="number" step="0.5" value={mult} onChange={e => setAnswer('ipam-multiplier', e.target.value)} className="w-14 h-6 text-sm text-center" data-testid="input-mult" />
          <span className="text-xs text-muted-foreground">mult</span>
        </div>
        <div className="border-t border-border w-full my-0.5" />
        <div className="flex items-center gap-1">
          {knownIPsOverride ? (
            <Input type="number" value={answers['ipam-1'] || ''} onChange={e => setAnswer('ipam-1', e.target.value)} className="w-20 h-6 text-sm text-center border-amber-400" data-testid="input-ips-override" />
          ) : (
            <span className="text-sm font-bold tabular-nums text-primary" data-testid="calculated-ips">{activeIPs.toLocaleString()}</span>
          )}
          <span className="text-xs text-muted-foreground">IPs</span>
        </div>
      </div>
      
      {/* Known IPs Override with Tooltip */}
      <div className="flex items-center gap-1.5">
        <input type="checkbox" checked={knownIPsOverride} onChange={e => {
          setAnswer('ipam-1-override', e.target.checked ? 'true' : 'false');
          if (!e.target.checked) setAnswer('ipam-1', String(calculatedIPs));
        }} className="h-3.5 w-3.5" data-testid="checkbox-known-ips" id="known-ips-checkbox" />
        <label htmlFor="known-ips-checkbox" className="text-xs text-muted-foreground cursor-pointer" title="Override calculated IPs with a known value. Use this when you have actual IP counts from the customer's existing infrastructure.">
          Known IPs
        </label>
        <span className="text-muted-foreground cursor-help" title="Check this to manually enter the IP count instead of calculating from Knowledge Workers">
          <Info className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

// ===== Quick Capture Bar Inline =====
function QuickCaptureBarInline() {
  const { dataCenters, sites, addDataCenter, deleteDataCenter, updateDataCenter, addSite, deleteSite, updateSite, setAnswer } = useDiscovery();
  const [newDCName, setNewDCName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [showDCDetails, setShowDCDetails] = useState(false);
  const [showSiteDetails, setShowSiteDetails] = useState(false);

  const totalDCKW = dataCenters.reduce((sum, dc) => sum + (dc.knowledgeWorkers || 0), 0);
  const totalSiteKW = sites.reduce((sum, site) => sum + (site.knowledgeWorkers || 0), 0);

  // Auto-sync DC/Site counts to sizing answers
  useEffect(() => { setAnswer('ud-5', dataCenters.length.toString()); }, [dataCenters.length, setAnswer]);
  useEffect(() => { setAnswer('ud-7', sites.length.toString()); }, [sites.length, setAnswer]);

  const handleAddDC = () => { if (newDCName.trim()) { addDataCenter(newDCName.trim()); setNewDCName(''); } };
  const handleAddSiteIndependent = () => { if (newSiteName.trim()) { addSite(newSiteName.trim(), ''); setNewSiteName(''); } };

  return (
    <div className="flex flex-col gap-3" data-testid="quick-capture-bar">
      {/* DC Row */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowDCDetails(!showDCDetails)} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1" data-testid="toggle-dc-tags">
            <ChevronRight className={`h-4 w-4 transition-transform ${showDCDetails ? 'rotate-90' : ''}`} />
            <Building2 className="h-3.5 w-3.5" />
            DCs: {dataCenters.length}
          </button>
          <span className="text-sm text-muted-foreground font-medium">KW: {totalDCKW.toLocaleString()}</span>
          <div className="flex items-center gap-1 ml-2">
            <Input placeholder="DC name" value={newDCName} onChange={e => setNewDCName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDC()} className="w-[100px] h-7 text-sm" data-testid="input-new-dc-name" />
            <Button variant="default" size="sm" className="h-7 w-7 p-0" onClick={handleAddDC} disabled={!newDCName.trim()} data-testid="button-add-dc"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {showDCDetails && dataCenters.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-5 pt-1">
            {dataCenters.map(dc => (
              <div key={dc.id} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 rounded-md px-2 py-1">
                <Building2 className="h-3 w-3 text-blue-500" />
                <Input value={dc.name} onChange={e => updateDataCenter(dc.id, { name: e.target.value })} className="w-[90px] h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0" placeholder="Name" data-testid={`input-dc-name-${dc.id}`} />
                <span className="text-xs text-muted-foreground">|</span>
                <Input type="number" placeholder="KW" value={dc.knowledgeWorkers || ''} onChange={e => updateDataCenter(dc.id, { knowledgeWorkers: parseInt(e.target.value) || 0 })} className="w-[50px] h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 text-right" data-testid={`input-dc-kw-${dc.id}`} />
                <span className="text-xs text-muted-foreground">KW</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => deleteDataCenter(dc.id)} data-testid={`delete-dc-${dc.id}`}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Site Row */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSiteDetails(!showSiteDetails)} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1" data-testid="toggle-site-tags">
            <ChevronRight className={`h-4 w-4 transition-transform ${showSiteDetails ? 'rotate-90' : ''}`} />
            <MapPin className="h-3.5 w-3.5" />
            Sites: {sites.length}
          </button>
          <span className="text-sm text-muted-foreground font-medium">KW: {totalSiteKW.toLocaleString()}</span>
          <div className="flex items-center gap-1 ml-2">
            <Input placeholder="Site name" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSiteIndependent()} className="w-[100px] h-7 text-sm" data-testid="input-new-site-name" />
            <Button variant="default" size="sm" className="h-7 w-7 p-0" onClick={handleAddSiteIndependent} disabled={!newSiteName.trim()} data-testid="button-add-site"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {showSiteDetails && sites.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-5 pt-1">
            {sites.map(site => (
              <div key={site.id} className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 rounded-md px-2 py-1">
                <MapPin className="h-3 w-3 text-green-500" />
                <Input value={site.name} onChange={e => updateSite(site.id, { name: e.target.value })} className="w-[90px] h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0" placeholder="Name" data-testid={`input-site-name-${site.id}`} />
                <span className="text-xs text-muted-foreground">|</span>
                <Input type="number" placeholder="KW" value={site.knowledgeWorkers || ''} onChange={e => updateSite(site.id, { knowledgeWorkers: parseInt(e.target.value) || 0 })} className="w-[50px] h-6 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 text-right" data-testid={`input-site-kw-${site.id}`} />
                <span className="text-xs text-muted-foreground">KW</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => deleteSite(site.id)} data-testid={`delete-site-${site.id}`}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
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
            <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-full text-center">
                <span className="text-sm font-medium text-foreground">Quick Capture</span>
              </div>
              <div className="flex flex-wrap items-stretch gap-4">
                <QuickCaptureBarInline />
                <div className="border-l border-border/50 mx-2" />
                <KnowledgeWorkersInline />
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
