import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Sparkles, ChevronDown, ChevronRight, FileText, Loader2, Check, X, Cloud, CloudOff, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import yaml from 'js-yaml';
import {
  TDNiosSection,
  DossierInput,
  LookalikeInput,
  AssetConfigInput,
  SocInsightsInput,
  DomainTakedownInput,
  ReportingInput,
  UDDIEstimator,
  safeParseTDNios,
  safeParseDossier,
  safeParseLookalike,
  safeParseDomainTakedown,
  safeParseAssetConfig,
  safeParseSocInsights,
  safeParseReporting,
  safeParseUDDI,
  DOSSIER_TOKENS_PER_UNIT,
  LOOKALIKE_TOKENS_PER_UNIT,
  DOMAIN_TAKEDOWN_TOKENS_PER_UNIT,
} from "@/components/sizing";

const statusColors = {
  "not-submitted": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "submitted": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "started": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "reviewed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const psarArbLabels = {
  "not-submitted": "Not Submitted",
  "submitted": "Submitted",
  "not-relevant": "N/A",
};

const designLabels = {
  "not-started": "Not Started",
  "started": "Started",
  "reviewed": "Reviewed w/ Customer",
};

// Section icons and colors
const sectionConfig = {
  "Users - Devices - Sites": { color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  "Sizing Data": { color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  "IPAM": { color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
  "UDDI": { color: "text-sky-600", bgColor: "bg-sky-50 dark:bg-sky-950/30" },
  "Internal DNS": { color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  "External DNS": { color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  "DHCP": { color: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Services": { color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Microsoft Management": { color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  "Asset/ Network Insight": { color: "text-teal-600", bgColor: "bg-teal-50 dark:bg-teal-950/30" },
  "Security": { color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  "Professional Services": { color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
};

function QuestionField({ question, value, onChange, answers, onNoteChange, note }) {
  const { id, fieldType, options, allowFreeform, defaultValue, conditionalOn } = question;
  
  // Check if this question should be shown based on conditions
  if (conditionalOn) {
    const dependentValue = answers[conditionalOn.questionId];
    if (dependentValue !== conditionalOn.value) {
      return null;
    }
  }

  const currentValue = value ?? defaultValue ?? "";

  // Render different field types
  switch (fieldType) {
    case "yesno":
      return (
        <div className="flex items-center gap-4">
          <Button variant={currentValue === "Yes" ? "default" : "outline"} size="sm" onClick={() => onChange(id, "Yes")} data-testid={`${id}-yes`}>Yes</Button>
          <Button variant={currentValue === "No" ? "default" : "outline"} size="sm" onClick={() => onChange(id, "No")} data-testid={`${id}-no`}>No</Button>
        </div>
      );

    case "select":
      return (
        <Select value={currentValue} onValueChange={(val) => onChange(id, val)}>
          <SelectTrigger className="w-full max-w-md" data-testid={`${id}-select`}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selectedValues = currentValue ? currentValue.split(", ").filter(Boolean) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {options?.map((opt) => (
              <Button key={opt} variant={selectedValues.includes(opt) ? "default" : "outline"} size="sm" onClick={() => { const newValues = selectedValues.includes(opt) ? selectedValues.filter(v => v !== opt) : [...selectedValues, opt]; onChange(id, newValues.join(", ")); }} data-testid={`${id}-${opt.toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedValues.includes(opt) && <Check className="h-3 w-3 mr-1" />}{opt}
              </Button>
            ))}
          </div>
          {allowFreeform && (
            <Input placeholder="Add other (comma-separated)..." className="max-w-md mt-2" onBlur={(e) => { if (e.target.value) { const existing = selectedValues.filter(v => !options?.includes(v)); const newOther = e.target.value.split(",").map(s => s.trim()).filter(Boolean); const newValues = [...selectedValues.filter(v => options?.includes(v)), ...existing, ...newOther]; onChange(id, [...new Set(newValues)].join(", ")); e.target.value = ""; } }} data-testid={`${id}-other`} />
          )}
        </div>
      );
    }

    case "number":
      return <Input type="number" value={currentValue} onChange={(e) => onChange(id, e.target.value)} className="max-w-xs" placeholder="Enter a number" data-testid={`${id}-input`} />;

    case "leaseTime": {
      const leaseOptions = [
        { label: "1 hour", value: "3600" }, { label: "4 hours", value: "14400" }, { label: "8 hours", value: "28800" },
        { label: "1 day", value: "86400" }, { label: "3 days", value: "259200" }, { label: "7 days", value: "604800" },
        { label: "14 days", value: "1209600" }, { label: "30 days", value: "2592000" },
      ];
      return (
        <Select value={currentValue} onValueChange={(val) => onChange(id, val)}>
          <SelectTrigger className="w-full max-w-md" data-testid={`${id}-select`}><SelectValue placeholder="Select lease time" /></SelectTrigger>
          <SelectContent>{leaseOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }

    case "enableSwitch":
      return (
        <div className="flex items-center gap-2">
          <Switch checked={currentValue === "Yes"} onCheckedChange={(checked) => onChange(id, checked ? "Yes" : "No")} data-testid={`${id}-switch`} />
          <span className="text-sm text-muted-foreground">{currentValue === "Yes" ? "Enabled" : "Disabled"}</span>
        </div>
      );

    case "ipCalculated":
    case "dnsAggregateCalculated":
    case "dnsPerServerCalculated":
      return (
        <div className="space-y-2">
          <Input type="text" value={currentValue} onChange={(e) => onChange(id, e.target.value)} className="max-w-xs" placeholder="Calculated or enter manually" data-testid={`${id}-input`} />
          <p className="text-xs text-muted-foreground">Auto-calculated based on other inputs, or enter manually</p>
        </div>
      );

    case "siteConfiguration":
      return (
        <SiteConfigurationField value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} answers={answers} />
      );

    case "tdNiosSection":
      return <TDNiosSection value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} />;

    case "assetConfigInput":
      return <AssetConfigInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} knowledgeWorkers={answers['ud-1']} />;

    case "reportingInput":
      return <ReportingInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} knowledgeWorkers={answers['ud-1']} assetConfigValue={answers['beta-asset-config']} />;

    case "dossierInput":
      return <DossierInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} />;

    case "lookalikeInput":
      return <LookalikeInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} />;

    case "domainTakedownInput":
      return <DomainTakedownInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} />;

    case "socInsightsInput":
      return <SocInsightsInput value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} knowledgeWorkers={answers['ud-1']} assetConfigValue={answers['beta-asset-config']} />;

    case "uddiEstimator":
      return <UDDIEstimator value={currentValue} onChange={(val) => onChange(id, val)} questionId={id} />;

    case "tokenTotal":
      return <TokenTotalDisplay answers={answers} />;

    default: {
      const isLongQuestion = question.question.length > 60;
      if (isLongQuestion) return <Textarea value={currentValue} onChange={(e) => onChange(id, e.target.value)} placeholder="Enter your answer..." rows={3} data-testid={`${id}-textarea`} />;
      return <Input type="text" value={currentValue} onChange={(e) => onChange(id, e.target.value)} placeholder="Enter your answer..." data-testid={`${id}-input`} />;
    }
  }
}

function SiteConfigurationField({ value, onChange, questionId, answers }) {
  const [sites, setSites] = useState(() => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  });

  const addSite = () => {
    const newSite = {
      id: `site-${Date.now()}`, name: `Site ${sites.length + 1}`,
      numIPs: 0, role: 'DNS/DHCP', platform: 'NIOS', dhcpPercent: 80,
    };
    const updated = [...sites, newSite];
    setSites(updated);
    onChange(JSON.stringify(updated));
  };

  const removeSite = (id) => {
    const updated = sites.filter(s => s.id !== id);
    setSites(updated);
    onChange(JSON.stringify(updated));
  };

  const updateSite = (id, field, val) => {
    const updated = sites.map(s => s.id === id ? { ...s, [field]: val } : s);
    setSites(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-3" data-testid={`site-config-${questionId}`}>
      {sites.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-muted-foreground px-2">
            <span>Site Name</span><span># IPs</span><span>Role</span><span>Platform</span><span>DHCP %</span><span></span>
          </div>
          {sites.map((site) => (
            <div key={site.id} className="grid grid-cols-6 gap-2 items-center bg-muted/40 rounded-md p-2">
              <Input value={site.name} onChange={(e) => updateSite(site.id, 'name', e.target.value)} className="h-8 text-sm" />
              <Input type="number" value={site.numIPs || ''} onChange={(e) => updateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
              <Select value={site.role} onValueChange={(v) => updateSite(site.id, 'role', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNS/DHCP">DNS/DHCP</SelectItem><SelectItem value="DNS">DNS Only</SelectItem>
                  <SelectItem value="DHCP">DHCP Only</SelectItem><SelectItem value="GM">GM</SelectItem><SelectItem value="GMC">GMC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={site.platform} onValueChange={(v) => updateSite(site.id, 'platform', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIOS">NIOS</SelectItem><SelectItem value="NIOS-HA">NIOS-HA</SelectItem>
                  <SelectItem value="NX">NIOS-X</SelectItem><SelectItem value="NXaaS">NXaaS</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" min="0" max="100" value={site.dhcpPercent} onChange={(e) => updateSite(site.id, 'dhcpPercent', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
              <Button variant="ghost" size="icon" onClick={() => removeSite(site.id)} className="h-8 w-8"><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={addSite} data-testid={`site-config-add-${questionId}`}>+ Add Site</Button>
      {sites.length > 0 && (
        <div className="text-xs text-muted-foreground">{sites.length} site(s) configured, {sites.reduce((s, site) => s + (site.numIPs || 0), 0).toLocaleString()} total IPs</div>
      )}
    </div>
  );
}

function TokenTotalDisplay({ answers }) {
  const assetConfig = safeParseAssetConfig(answers['beta-asset-config']);
  const tdNios = safeParseTDNios(answers['beta-td-nios-section']);
  const reporting = safeParseReporting(answers['beta-reporting']);
  const dossier = safeParseDossier(answers['beta-dossier']);
  const lookalike = safeParseLookalike(answers['beta-lookalike']);
  const domainTakedown = safeParseDomainTakedown(answers['beta-domain-takedown']);
  const socInsights = safeParseSocInsights(answers['beta-soc-insights']);

  const tdCloudTokens = assetConfig.tdCloudEnabled ? (assetConfig.totalAssets || 0) * 3 : 0;
  const tdNiosTokens = tdNios.enabled ? tdNios.tokens.reduce((sum, t) => sum + (t.tokens * (t.quantity || 1)), 0) : 0;
  const dossierTokens = dossier.enabled ? (dossier.quantity || 0) * DOSSIER_TOKENS_PER_UNIT : 0;
  const lookalikeTokens = lookalike.enabled ? (lookalike.quantity || 0) * LOOKALIKE_TOKENS_PER_UNIT : 0;
  const domainTakedownTokens = domainTakedown.enabled ? (domainTakedown.quantity || 0) * DOMAIN_TAKEDOWN_TOKENS_PER_UNIT : 0;
  const socInsightsTokens = socInsights.enabled ? (socInsights.calculatedTokens || 0) : 0;
  const reportingTokens = reporting.enabled ? (reporting.securityEventsTokens || 0) : 0;

  const totalTokens = tdCloudTokens + tdNiosTokens + dossierTokens + lookalikeTokens + domainTakedownTokens + socInsightsTokens + reportingTokens;
  const tokenPacks = Math.ceil(totalTokens / 1000);

  const items = [
    { label: "TD Cloud", tokens: tdCloudTokens, show: assetConfig.tdCloudEnabled },
    { label: "TD for NIOS", tokens: tdNiosTokens, show: tdNios.enabled },
    { label: "Dossier", tokens: dossierTokens, show: dossier.enabled },
    { label: "Lookalike", tokens: lookalikeTokens, show: lookalike.enabled },
    { label: "Domain Takedown", tokens: domainTakedownTokens, show: domainTakedown.enabled },
    { label: "SOC Insights", tokens: socInsightsTokens, show: socInsights.enabled },
    { label: "Reporting", tokens: reportingTokens, show: reporting.enabled },
  ].filter(i => i.show);

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid="token-total-display">
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono">{item.tokens.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
            <span>Total Tokens</span>
            <span className="font-mono text-lg">{totalTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Token Packs (1,000 per pack)</span>
            <span className="font-mono">{tokenPacks.toLocaleString()}</span>
          </div>
        </div>
      )}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Enable security features above to see token summary</p>
      )}
    </div>
  );
}

export function CustomerDetail({ customer, onBack }) {
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [meetingNotes, setMeetingNotes] = useState("");
  const [expandedSections, setExpandedSections] = useState(new Set(["IPAM"]));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const { toast } = useToast();

  // Fetch questions from API
  const { data: questions = [] } = useQuery({
    queryKey: ['/api/questions'],
  });

  // Fetch discovery data from API
  const { data: discoveryData, isLoading: isLoadingDiscovery } = useQuery({
    queryKey: [`/api/customers/${customer.id}/discovery`],
    enabled: !!customer.id,
  });

  // Load discovery data when fetched
  useEffect(() => {
    if (discoveryData) {
      setAnswers(discoveryData.answers || {});
      setNotes(discoveryData.notes || {});
      setMeetingNotes(discoveryData.meetingNotes || "");
      setLastSaved(discoveryData.lastSaved);
      setHasUnsavedChanges(false);
    }
  }, [discoveryData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('PUT', `/api/customers/${customer.id}/discovery`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setHasUnsavedChanges(false);
      setLastSaved(data.lastSaved);
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Saved to Cloud",
        description: "Discovery data synced successfully.",
      });
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save data to API
  const saveData = useCallback(() => {
    saveMutation.mutate({
      answers,
      notes,
      meetingNotes,
      contextFields: {},
      enabledSections: {},
    });
  }, [answers, notes, meetingNotes, saveMutation]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNoteChange = (questionId, value) => {
    setNotes(prev => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
  };

  // Group questions by section
  const sections = questions.reduce((acc, q) => {
    if (q.hidden) return acc;
    const section = q.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(q);
    return acc;
  }, {});

  const sectionNames = Object.keys(sections);

  // Calculate progress - only count visible (non-conditional-hidden) questions
  const visibleQuestions = questions.filter(q => {
    if (q.hidden) return false;
    if (q.conditionalOn) {
      return answers[q.conditionalOn.questionId] === q.conditionalOn.value;
    }
    return true;
  });
  const answeredCount = visibleQuestions.filter(q => answers[q.id]?.trim()).length;
  const totalQuestions = visibleQuestions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // AI Analysis
  const handleAnalyzeNotes = async () => {
    if (!meetingNotes.trim()) {
      toast({
        title: "No notes",
        description: "Please enter meeting notes to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/analyze-notes", {
        notes: meetingNotes,
      });
      const data = await response.json();
      
      if (data.matches && data.matches.length > 0) {
        setAiMatches(data.matches);
        setAiDialogOpen(true);
      } else {
        toast({
          title: "No matches found",
          description: "The AI couldn't extract any answers from the notes. Try adding more detail.",
        });
      }
    } catch (error) {
      console.error("Error analyzing notes:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze meeting notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiMatches = () => {
    const newAnswers = { ...answers };
    aiMatches.forEach(match => {
      newAnswers[match.questionId] = match.answer;
    });
    setAnswers(newAnswers);
    setHasUnsavedChanges(true);
    setAiDialogOpen(false);
    toast({
      title: "Applied",
      description: `Applied ${aiMatches.length} answers from AI analysis.`,
    });
  };

  // Export to YAML
  const exportToYAML = () => {
    const exportData = {
      customer: {
        name: customer.name,
        nickname: customer.nickname || '',
        opportunity: customer.opportunity || '',
        seName: customer.seName || '',
        psar: customer.psar,
        arb: customer.arb,
        design: customer.design,
      },
      exportDate: new Date().toISOString(),
      discovery: {
        answers: {},
        notes: notes,
        meetingNotes: meetingNotes,
      },
    };

    // Map answers with question text for readability
    questions.forEach(q => {
      if (answers[q.id]) {
        exportData.discovery.answers[q.id] = {
          section: q.section,
          question: q.question,
          answer: answers[q.id],
        };
      }
    });

    const yamlStr = yaml.dump(exportData, { lineWidth: -1, noRefs: true });
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customer.name.replace(/\s+/g, '_')}_discovery_${new Date().toISOString().split('T')[0]}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported YAML",
      description: `Exported discovery data for ${customer.name}`,
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    // Build headers: Customer info + all question IDs
    const questionIds = questions.filter(q => !q.hidden).map(q => q.id);
    const headers = [
      'Customer Name',
      'Nickname', 
      'Opportunity',
      'SE Name',
      'PSAR',
      'ARB',
      'Design',
      'Export Date',
      ...questionIds.map(id => {
        const q = questions.find(q => q.id === id);
        return q ? `${q.section}: ${q.question}` : id;
      })
    ];

    // Build row values
    const row = [
      customer.name,
      customer.nickname || '',
      customer.opportunity || '',
      customer.seName || '',
      customer.psar,
      customer.arb,
      customer.design,
      new Date().toISOString().split('T')[0],
      ...questionIds.map(id => {
        const val = answers[id] || '';
        // Escape quotes and wrap in quotes if contains comma
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
    ];

    // Escape headers too
    const escapedHeaders = headers.map(h => {
      if (h.includes(',') || h.includes('"')) {
        return `"${h.replace(/"/g, '""')}"`;
      }
      return h;
    });

    const csvContent = [escapedHeaders.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customer.name.replace(/\s+/g, '_')}_discovery_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported CSV",
      description: `Exported discovery data for ${customer.name}`,
    });
  };

  return (
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.opportunity || 'No opportunity set'} • SE: {customer.seName || 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Cloud className="h-4 w-4" />
              Synced
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <CloudOff className="h-4 w-4" />
              Unsaved changes
            </span>
          )}
          <Button 
            onClick={saveData} 
            disabled={saveMutation.isPending || !hasUnsavedChanges}
            data-testid="button-save"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Save to Cloud
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToYAML} data-testid="export-yaml">
                Export as YAML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV} data-testid="export-csv">
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PSAR</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.psar]}>
              {psarArbLabels[customer.psar] || customer.psar}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ARB</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.arb]}>
              {psarArbLabels[customer.arb] || customer.arb}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Design</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.design]}>
              {designLabels[customer.design] || customer.design}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount} of {totalQuestions} questions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="discovery" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="discovery" data-testid="tab-discovery">
            <FileText className="h-4 w-4 mr-2" />
            Discovery Questions
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* Discovery Questions Tab */}
        <TabsContent value="discovery" className="mt-6">
          <div className="space-y-4">
            {sectionNames.map((sectionName) => {
              const sectionQuestions = sections[sectionName];
              const isExpanded = expandedSections.has(sectionName);
              const config = sectionConfig[sectionName] || { color: "text-gray-600", bgColor: "bg-gray-50" };
              
              // Count answered in section
              const sectionAnswered = sectionQuestions.filter(q => answers[q.id]?.trim()).length;
              
              return (
                <Collapsible
                  key={sectionName}
                  open={isExpanded}
                  onOpenChange={(open) => {
                    setExpandedSections(prev => {
                      const next = new Set(prev);
                      if (open) next.add(sectionName);
                      else next.delete(sectionName);
                      return next;
                    });
                  }}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className={`cursor-pointer hover:bg-muted/50 ${config.bgColor}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className={`h-5 w-5 ${config.color}`} />
                            ) : (
                              <ChevronRight className={`h-5 w-5 ${config.color}`} />
                            )}
                            <CardTitle className={`text-lg ${config.color}`}>
                              {sectionName}
                            </CardTitle>
                          </div>
                          <Badge variant="outline">
                            {sectionAnswered}/{sectionQuestions.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4 space-y-6">
                        {sectionQuestions.map((q) => {
                          // Check conditional visibility at parent level
                          if (q.conditionalOn) {
                            const depValue = answers[q.conditionalOn.questionId];
                            if (depValue !== q.conditionalOn.value) return null;
                          }
                          return (
                          <div key={q.id} className="space-y-2 pb-4 border-b last:border-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium">
                                    {q.question}
                                    {q.technicalOnly && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Technical
                                      </Badge>
                                    )}
                                  </Label>
                                  {q.tooltip && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent className="max-w-xs"><p className="text-xs">{q.tooltip}</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {q.subsection && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {q.subsection}{q.group ? ` / ${q.group}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            <QuestionField
                              question={q}
                              value={answers[q.id]}
                              onChange={handleAnswerChange}
                              answers={answers}
                            />
                          </div>
                          );
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                AI Meeting Notes Analysis
              </CardTitle>
              <CardDescription>
                Paste your meeting notes and let AI extract answers to discovery questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meeting Notes</Label>
                <Textarea
                  value={meetingNotes}
                  onChange={(e) => {
                    setMeetingNotes(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Paste your meeting notes here... Include details about the customer's infrastructure, requirements, current vendors, etc."
                  rows={10}
                  data-testid="textarea-meeting-notes"
                />
              </div>
              <Button 
                onClick={handleAnalyzeNotes} 
                disabled={isAnalyzing}
                data-testid="button-analyze"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Matches Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Analysis Results</DialogTitle>
            <DialogDescription>
              Found {aiMatches.length} potential answers. Review and apply them to the questionnaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {aiMatches.map((match, index) => {
              const question = questions.find(q => q.id === match.questionId);
              return (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{question?.question || match.questionId}</span>
                    <Badge variant={match.confidence === "high" ? "default" : "outline"}>
                      {match.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-sm bg-muted p-2 rounded">{match.answer}</p>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAiMatches} data-testid="button-apply-ai">
              Apply All Answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
