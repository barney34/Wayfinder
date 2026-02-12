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
import { TopBar } from "./TopBar";
import { DeploymentModel } from "./PlatformSelection";
import { SizingMathHelp } from "./SizingMathHelp";
import { VersionControl } from "./VersionControl";
import { ImportExportSection } from "./ImportExportSection";
import { addDynamicRevision } from "@/lib/revisionHelpers";
import yaml from "js-yaml";

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
    <div className="flex h-[calc(100vh-60px)] bg-muted/30">
      {/* Sidebar with Navigation */}
      <AppSidebar
        currentCustomer={customer}
        currentOpportunity={currentOpportunity}
        onCustomerSelect={(c) => {
          if (c.id !== customer.id) {
            window.location.href = `/customers/${c.id}`;
          }
        }}
        onBack={onBack}
        onSave={handleSave}
        onExport={handleExport}
        saving={saving}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Gap between sidebar and content */}
      <div className="w-3 bg-muted/50" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Bar with Target Solutions, DC/Site Entry, IP Calculator */}
        <TopBar customerName={currentName} opportunity={currentOpportunity} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Discovery Tab */}
            {activeTab === 'discovery' && (
              <div className="space-y-4" data-testid="tab-content-discovery">
                <AssessmentQuestions questions={discoveryTabQuestions} compact={true} />
              </div>
            )}

            {/* Sizing Tab */}
            {activeTab === 'sizing' && (
              <div className="space-y-4" data-testid="tab-content-sizing">
                <DeploymentModel />
                <SizingMathHelp />
                <TokenCalculatorSummary />
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
