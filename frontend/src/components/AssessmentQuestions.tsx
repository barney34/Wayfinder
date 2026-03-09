import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, ChevronRight, X, Plus, Info, MessageSquare, Check, Zap, RotateCcw, Minimize2, Maximize2, AlertTriangle, Sparkles } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";

// ChatValueDiscovery moved to ValueDiscoveryDrawer — no longer rendered per-section
import {
  TDNiosSection, DossierInput, LookalikeInput, AssetConfigInput,
  SocInsightsInput, DomainTakedownInput, ReportingInput, UDDIEstimator,
  SiteConfiguration,
} from "./sizing";
import { getUnitLetterForRole } from "./sizing/calculators/unitDesignations";
import {
  GridMultiSelect, SyncedNumberField, AutoNumInput,
  InlineCheckboxSelect, InlineCheckboxMulti, SelectWithFreeform,
  MultiSelectField, detectFieldType, AUTO_CALC_DEFAULTS,
} from './assessment/FormFields';
import { renderSectionQuestions, TokenTotalDisplay } from './assessment/SectionRenderer';
import { CloudVendorSettings } from './VendorOverlaySelector';
import type { Question } from '@/types';

// ===== Main AssessmentQuestions =====

interface AssessmentQuestionsProps {
  questions: Question[];
  onAnswerChange?: (id: string, value: string) => void;
  compact?: boolean;
}
export function AssessmentQuestions({ questions, onAnswerChange, compact = false }: AssessmentQuestionsProps) {
  const { answers, notes, defaultAnswers, setAnswer, setNote, enabledSections, toggleSection, enableAllSections, disableAllSections, clearSection, leaseTimeUnits, setLeaseTimeUnit, platformMode, dataCenters, sites, addSite, deleteSite, sizingSummary, updateAnswers } = useDiscovery();
  const [expandedNotes, setExpandedNotes] = useState({});
  const [expandedSubsections, setExpandedSubsections] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [compactMode, setCompactMode] = useState(false); // Compact mode toggle
  const { toast } = useToast();
  const navRef = useRef(null);
  const isScrolling = useRef(false);

  // Scroll-spy: track which section is in view and auto-highlight the pill
  useEffect(() => {
    if (!compact) return;
    const sectionEls = document.querySelectorAll('[data-section-id]');
    if (!sectionEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        // Find the most visible section
        let bestEntry = null;
        let bestRatio = 0;
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        });
        if (bestEntry) {
          const sectionId = bestEntry.target.getAttribute('data-section-id');
          setActiveSection(sectionId);
          // Auto-scroll the nav pill into view
          if (navRef.current) {
            const pill = navRef.current.querySelector(`[data-nav-section="${sectionId}"]`);
            if (pill) pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      },
      { threshold: [0.1, 0.3, 0.5], rootMargin: '-80px 0px -40% 0px' }
    );

    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [compact, questions]);

  const handleAnswerChange = (questionId, value) => {
    setAnswer(questionId, value);
    onAnswerChange?.(questionId, value);
  };

  const handleSectionToggle = (section, enabled) => {
    toggleSection(section);
    if (!enabled) {
      clearSection(section);
      toast({ title: `"${section}" set Out of Scope`, description: 'Answers cleared.' });
    }
  };

  const getLeaseTimeUnit = (qId) => leaseTimeUnits[qId] || 'days';
  const getDisplayLeaseValue = (qId, stored) => {
    const unit = getLeaseTimeUnit(qId); const num = parseFloat(stored);
    if (isNaN(num)) return stored;
    if (unit === 'days') return (num / 86400).toString();
    if (unit === 'hours') return (num / 3600).toString();
    if (unit === 'minutes') return (num / 60).toString();
    return stored;
  };
  const handleLeaseTimeChange = (qId, displayVal) => {
    const unit = getLeaseTimeUnit(qId); const num = parseFloat(displayVal);
    if (isNaN(num)) { handleAnswerChange(qId, displayVal); return; }
    if (unit === 'days') handleAnswerChange(qId, (num * 86400).toString());
    else if (unit === 'hours') handleAnswerChange(qId, (num * 3600).toString());
    else if (unit === 'minutes') handleAnswerChange(qId, (num * 60).toString());
    else handleAnswerChange(qId, displayVal);
  };

  const handleToggleAllSections = (enable) => {
    if (enable) { enableAllSections(); toast({ title: "All Sections Enabled" }); }
    else { disableAllSections(); toast({ title: "All Sections Disabled" }); }
  };

  // Toggle section collapse (visual only, doesn't affect enabled state)
  const toggleCollapse = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Scroll to section (programmatic)
  const scrollToSection = useCallback((section) => {
    const el = document.querySelector(`[data-section-id="${section}"]`);
    if (el) {
      isScrolling.current = true;
      setActiveSection(section);
      setCollapsedSections(prev => ({ ...prev, [section]: false }));
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
  }, []);

  // DHCP redundancy options based on platform mode
  const getDhcpRedundancyOptions = () => {
    if (platformMode === 'NIOS') return [{ value: 'FO', label: 'Failover (F/O)' }];
    if (platformMode === 'UDDI') return [
      { value: 'AAP', label: 'Advanced Active Passive (AAP)' },
    ];
    // Hybrid
    return [
      { value: 'FO', label: 'Failover (F/O)' },
      { value: 'AAP', label: 'Advanced Active Passive (AAP)' },
    ];
  };

  // Group questions by section
  const grouped = questions.reduce<Record<string, Question[]>>((acc, q) => { if (!acc[q.section]) acc[q.section] = []; acc[q.section].push(q); return acc; }, {});
  const sections = Object.keys(grouped);
  const allEnabled = sections.every(s => enabledSections[s] !== false);

  // Section color coding for visual distinction
  const sectionColors = {
    'IPAM': 'border-l-blue-500',
    'Internal DNS': 'border-l-green-500',
    'External DNS': 'border-l-teal-500',
    'DHCP': 'border-l-orange-500',
    'Cloud Management': 'border-l-sky-500',
    'Security': 'border-l-red-500',
    'Network Insight': 'border-l-purple-500',
    'Integrations': 'border-l-indigo-500',
    'Automation': 'border-l-pink-500',
    'UDDI': 'border-l-cyan-500',
    'Services': 'border-l-emerald-500',
    'Asset/ Network Insight': 'border-l-amber-500',
    'Professional Services': 'border-l-slate-500',
  };

  // Abbreviated section names for nav pills
  const sectionAbbreviations = {
    'IPAM': 'IPAM',
    'Internal DNS': 'Int. DNS',
    'External DNS': 'Ext. DNS',
    'DHCP': 'DHCP',
    'Overlay': 'Overlay',
    'Services': 'Services',
    'Asset/ Network Insight': 'Asset/ Network Insight',
    'Security': 'Security',
    'Professional Services': 'Prof. Services',
  };

  // Nav pill colors - Theme-aware with improved light mode contrast
  const sectionPillStyles = {
    'IPAM':                  { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Internal DNS':          { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'External DNS':          { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'DHCP':                  { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Overlay':               { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Services':              { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Asset/ Network Insight': { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Security':              { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
    'Professional Services': { normal: 'bg-card text-foreground border-border ', active: 'bg-[#00BD4D] text-white border-[#00BD4D] ' },
  };

  // Active section background - NONE, just rely on header styling
  const sectionActiveBg = {
    'IPAM': '',
    'Internal DNS': '',
    'External DNS': '',
    'DHCP': '',
    'Cloud Management': '',
    'Services': '',
    'Asset/ Network Insight': '',
    'Security': '',
    'Professional Services': '',
  };

  // Render a single question's field (compact mode adjusts sizing)
  const renderField = (q) => {
    const fieldType = detectFieldType(q);
    const currentValue = answers[q.id] ?? q.defaultValue ?? '';
    const inputClass = compact ? "w-28 h-8 text-sm text-right px-3" : "w-28 text-right px-3";
    const selectClass = compact ? "min-w-[140px] h-8 text-sm" : "min-w-[140px]";

    // Special cases for specific question IDs
    // Platform Vendor (ipam-0) - 2-row grid layout
    if (q.id === 'ipam-0' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // Cloud Providers (ipam-9) - 3-column grid layout  
    if (q.id === 'ipam-9' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={3} />;
    }

    // 3rd Party Integrations (ipam-11) - 2-column grid layout
    if (q.id === 'ipam-11' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // Orchestration Tools (ipam-13) - 2-column grid layout
    if (q.id === 'ipam-13' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // Internal DNS vendor (idns-0) - 2-column grid layout
    if (q.id === 'idns-0' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // DDNS sourced from (idns-6) - 2-column grid layout
    if (q.id === 'idns-6' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={false} columns={2} />;
    }

    // External DNS vendor (edns-0) - 3-column grid layout (13 options)
    if (q.id === 'edns-0' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={3} />;
    }

    // DHCP platform (dhcp-0) - 2-column grid layout
    if (q.id === 'dhcp-0' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // DHCP updates another DNS platform (dhcp-7a) - freeform tag input
    if (q.id === 'dhcp-7a') {
      return <GridMultiSelect questionId={q.id} options={q.options || []} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={true} columns={3} />;
    }

    // L2/3 device types (ni-3a) - 2-column grid layout
    if (q.id === 'ni-3a' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // CDC (svc-3) - yesno toggle, auto-add/remove CDC site in sizing
    if (q.id === 'svc-3') {
      const hasCdcSite = sites.some(s => s.name === 'CDC' || s.role === 'CDC');
      const toggleCdc = (val) => {
        handleAnswerChange(q.id, val);
        if (val === 'Yes' && !hasCdcSite) {
          addSite('CDC', '', 0);
          toast({ title: 'CDC site added to Sizing' });
        } else if (val !== 'Yes') {
          const cdcSite = sites.find(s => s.name === 'CDC' || s.role === 'CDC');
          if (cdcSite) {
            deleteSite(cdcSite.id);
            toast({ title: 'CDC site removed from Sizing' });
          }
        }
      };
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => toggleCdc(currentValue === 'Yes' ? '' : 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
            <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => toggleCdc(currentValue === 'No' ? '' : 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
            {currentValue === 'Yes' && (
              <span className="cursor-pointer text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors select-none border-accent/30 bg-accent/10 text-accent hover:bg-accent/20">
                <Zap className="h-2.5 w-2.5" />
                Auto
              </span>
            )}
          </div>
          {currentValue === 'Yes' && (
            <p className="text-[10px] text-muted-foreground leading-tight">✓ Added CDC site to Sizing table</p>
          )}
        </div>
      );
    }

    // dhcp-7: "Will DHCP update DNS on another platform?" - Yes/No + vendor tag grid when Yes
    if (q.id === 'dhcp-7') {
      const yesNoEl = compact ? (
        <div className="flex items-center gap-0.5" data-testid="yesno-dhcp-7">
          <button onClick={() => handleAnswerChange('dhcp-7', 'Yes')} className={`px-2 py-0.5 text-[11px] font-medium rounded-l-full border transition-colors ${currentValue === 'Yes' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid="btn-yes-dhcp-7">Yes</button>
          <button onClick={() => handleAnswerChange('dhcp-7', 'No')} className={`px-2 py-0.5 text-[11px] font-medium rounded-r-full border-y border-r transition-colors ${currentValue === 'No' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid="btn-no-dhcp-7">No</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange('dhcp-7', 'Yes')} data-testid="btn-yes-dhcp-7">Yes</Button>
          <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange('dhcp-7', 'No')} data-testid="btn-no-dhcp-7">No</Button>
        </div>
      );
      if (currentValue === 'Yes') {
        const platformOptions = ["Microsoft DNS", "BIND"];
        return (
          <div className="space-y-3">
            {yesNoEl}
            <div>
              <div className="text-xs text-[#00BD4D] mb-1.5 uppercase tracking-wide font-medium">Which platform(s)?</div>
              <GridMultiSelect
                questionId="dhcp-7a"
                options={platformOptions}
                value={answers['dhcp-7a'] ?? ''}
                onChange={v => handleAnswerChange('dhcp-7a', v)}
                allowFreeform={true}
                columns={3}
              />
            </div>
          </div>
        );
      }
      return yesNoEl;
    }

    // dhcp-9: "Will update on lease renewal be enabled?" - warn if Yes (not recommended)
    if (q.id === 'dhcp-9') {
      const yesNoField = compact ? (
        <div className="flex items-center gap-0.5" data-testid={`yesno-${q.id}`}>
          <button onClick={() => handleAnswerChange(q.id, 'Yes')} className={`px-2 py-0.5 text-[11px] font-medium rounded-l-full border transition-colors ${currentValue === 'Yes' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid={`btn-yes-${q.id}`}>Yes</button>
          <button onClick={() => handleAnswerChange(q.id, 'No')} className={`px-2 py-0.5 text-[11px] font-medium rounded-r-full border-y border-r transition-colors ${currentValue === 'No' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid={`btn-no-${q.id}`}>No</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
          <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
        </div>
      );
      if (currentValue === 'Yes') {
        return (
          <div className="space-y-2">
            {yesNoField}
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/40 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span><strong>Not recommended.</strong> Enabling update-on-lease-renewal significantly increases DDNS update rates and can impact DNS server performance.</span>
            </div>
          </div>
        );
      }
      return yesNoField;
    }

    // DNSSEC (edns-3): Yes/No + show calculation using external DNS records when Yes
    if (q.id === 'edns-3') {
      const yesNoField = compact ? (
        <div className="flex items-center gap-0.5" data-testid={`yesno-${q.id}`}>
          <button onClick={() => handleAnswerChange(q.id, 'Yes')} className={`px-2 py-0.5 text-[11px] font-medium rounded-l-full border transition-colors ${currentValue === 'Yes' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid={`btn-yes-${q.id}`}>Yes</button>
          <button onClick={() => handleAnswerChange(q.id, 'No')} className={`px-2 py-0.5 text-[11px] font-medium rounded-r-full border-y border-r transition-colors ${currentValue === 'No' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`} data-testid={`btn-no-${q.id}`}>No</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
          <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
        </div>
      );
      if (currentValue === 'Yes') {
        const extRecords = parseInt(answers['edns-5']) || 0;
        const dnssecObjects = extRecords > 0 ? extRecords * 4 : 0;
        return (
          <div className="space-y-2">
            {yesNoField}
            <div className="flex items-start gap-2 px-3 py-2 bg-[#12C2D3]/10 border border-[#12C2D3]/40 rounded-lg text-xs text-[#12C2D3]">
              <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {extRecords > 0
                  ? <>{extRecords.toLocaleString()} ext DNS records × 4 = <strong>{dnssecObjects.toLocaleString()}</strong> additional objects</>
                  : <>Enter external DNS records (edns-5) to calculate DNSSEC object impact</>
                }
              </span>
            </div>
          </div>
        );
      }
      return yesNoField;
    }

    // DHCP % fields (ipam-4 and dhcp-0-pct) — stepper ±5, % suffix, keep in sync
    if (q.id === 'ipam-4' || q.id === 'dhcp-0-pct') {
      const syncId = q.id === 'ipam-4' ? 'dhcp-0-pct' : 'ipam-4';
      const val = parseInt(currentValue || q.defaultValue || '80') || 0;
      const setPct = (n: number) => {
        const clamped = Math.min(100, Math.max(0, n)).toString();
        handleAnswerChange(q.id, clamped);
        handleAnswerChange(syncId, clamped);
      };
      return (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPct(val - 5)} className="w-7 h-8 rounded-md border border-border bg-background text-foreground text-sm font-bold hover:bg-muted transition-colors">−</button>
          <AutoNumInput value={val === 0 ? '' : val.toString()} onChange={e => setPct(parseInt((e.target as HTMLInputElement).value) || 0)} placeholder="80" data-testid={`input-answer-${q.id}`} />
          <span className="text-sm text-muted-foreground font-medium">%</span>
          <button onClick={() => setPct(val + 5)} className="w-7 h-8 rounded-md border border-border bg-background text-foreground text-sm font-bold hover:bg-muted transition-colors">+</button>
        </div>
      );
    }

    // ni-discovered-source — 3-way pill chips
    if (q.id === 'ni-discovered-source' && q.options) {
      return (
        <div className="flex flex-wrap gap-1">
          {q.options.map(opt => (
            <button key={opt} onClick={() => handleAnswerChange(q.id, currentValue === opt ? '' : opt)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                currentValue === opt
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}>{opt}</button>
          ))}
        </div>
      );
    }

    // Preferred management approach (uddi-mode) — 3-way pill chips
    if (q.id === 'uddi-mode' && q.options) {
      return (
        <div className="flex flex-wrap gap-1">
          {q.options.map(opt => (
            <button key={opt} onClick={() => handleAnswerChange(q.id, currentValue === opt ? '' : opt)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                currentValue === opt
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}>{opt}</button>
          ))}
        </div>
      );
    }

    // Cloud platforms — GridMultiSelect + inline Cloudflare/Akamai settings cards
    if (q.id === 'uddi-cloud-platforms') {
      return (
        <div>
          <GridMultiSelect questionId={q.id} options={q.options || []} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={3} />
          <CloudVendorSettings platformsValue={currentValue} answers={answers} onAnswer={(id, val) => handleAnswerChange(id, val)} />
        </div>
      );
    }

    // # of Data Centers (ud-5) - synced with TopBar
    if (q.id === 'ud-5') {
      return <SyncedNumberField questionId={q.id} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} syncValue={dataCenters?.length} syncLabel="Data Centers" />;
    }

    // # of Sites (ud-7) - synced with TopBar
    if (q.id === 'ud-7') {
      return <SyncedNumberField questionId={q.id} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} syncValue={sites?.length} syncLabel="Sites" />;
    }

    switch (fieldType) {
      case 'yesno':
        // In compact mode, use small pill buttons [Yes] [No]
        if (compact) {
          return (
            <div className="flex items-center gap-0.5" data-testid={`yesno-${q.id}`}>
              <button
                onClick={() => handleAnswerChange(q.id, 'Yes')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-l-full border transition-colors ${
                  currentValue === 'Yes' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
                data-testid={`btn-yes-${q.id}`}
              >
                Yes
              </button>
              <button
                onClick={() => handleAnswerChange(q.id, 'No')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-r-full border-y border-r transition-colors ${
                  currentValue === 'No' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
                data-testid={`btn-no-${q.id}`}
              >
                No
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
            <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
          </div>
        );
      case 'select':
        // In compact mode, use inline checkboxes for faster selection
        if (compact && q.options && q.options.length <= 8 && !q.allowFreeform) {
          return <InlineCheckboxSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} />;
        }
        return q.allowFreeform ? <SelectWithFreeform questionId={q.id} options={q.options || []} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} />
          : <Select value={currentValue} onValueChange={v => handleAnswerChange(q.id, v)}>
              <SelectTrigger className={selectClass} data-testid={`select-answer-${q.id}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{(q.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>;
      case 'multiselect': {
        const opts = q.options || [];
        if (opts.length <= 4 && !q.allowFreeform) {
          return <InlineCheckboxMulti questionId={q.id} options={opts} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} />;
        }
        if (opts.length <= 8 && !q.allowFreeform) {
          return <GridMultiSelect questionId={q.id} options={opts} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={false} columns={2} />;
        }
        return <MultiSelectField questionId={q.id} options={opts} optionsWithPermission={q.optionsWithPermission} optionsWithVendor={q.optionsWithVendor} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} compact={compact} />;
      }
      case 'number':
        return <AutoNumInput value={currentValue} onChange={e => handleAnswerChange(q.id, (e.target as HTMLInputElement).value)} placeholder="0" data-testid={`input-answer-${q.id}`} />;
      case 'leaseTime': {
        return (
          <div className="flex items-center gap-1">
            <AutoNumInput step="any" value={getDisplayLeaseValue(q.id, currentValue)} onChange={e => handleLeaseTimeChange(q.id, (e.target as HTMLInputElement).value)} data-testid={`input-answer-${q.id}`} />
            <select
              value={getLeaseTimeUnit(q.id)}
              onChange={e => setLeaseTimeUnit(q.id, e.target.value)}
              className="h-8 px-2 pr-6 text-xs font-medium rounded-md border border-border bg-background text-foreground cursor-pointer hover:bg-muted transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_4px_center]"
              data-testid={`select-unit-${q.id}`}
            >
              <option value="days">days</option>
              <option value="hours">hours</option>
              <option value="minutes">min</option>
              <option value="seconds">sec</option>
            </select>
          </div>
        );
      }
      case 'enableSwitch':
        // Use same pill buttons style for enable/disable
        if (compact) {
          return (
            <div className="flex items-center gap-0.5" data-testid={`enable-${q.id}`}>
              <button
                onClick={() => handleAnswerChange(q.id, 'Yes')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-l-full border transition-colors ${
                  currentValue === 'Yes' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                On
              </button>
              <button
                onClick={() => handleAnswerChange(q.id, 'No')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-r-full border-y border-r transition-colors ${
                  currentValue === 'No' || !currentValue
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                Off
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Switch checked={currentValue === 'Yes'} onCheckedChange={c => handleAnswerChange(q.id, c ? 'Yes' : 'No')} data-testid={`switch-answer-${q.id}`} />
            <span className="text-sm text-muted-foreground">{currentValue === 'Yes' ? 'Enabled' : 'Disabled'}</span>
          </div>
        );
      case 'ipCalculated':
      case 'dnsAggregateCalculated':
      case 'dnsPerServerCalculated': {
        // ── DNS QPS Formula (Peak — used for sizing): ────────────────────────
        // activeIPs = TopBar KW × 2.5
        // peak_aggregate_QPS = activeIPs / 3  (Infoblox standard peak QPS formula)
        // per_server_QPS = peak_QPS / DNS_server_count
        // Also compute QPD = IPs × 3500 (shown as informational)
        const topBarKW = parseInt(answers['ud-1']) || 0;
        const topBarIPs = Math.round(topBarKW * (parseFloat(answers['ipam-multiplier']) || 2.5));
        const ipCalcManualOverride = answers['ipam-1-override'] === 'true';
        const manualIPs = parseInt(answers['ipam-1']) || 0;
        const activeIPs = ipCalcManualOverride ? manualIPs : topBarIPs;

        // Peak QPS = IPs / 3 (standard Infoblox peak formula)
        const aggregateQPS = Math.ceil(activeIPs / 3);
        // Queries per day (informational only)
        const queriesPerDay = activeIPs * 3500;

        // DNS server counts — prefer live data from Sizing table (via sizingSummary)
        // Falls back to idns-servers discovery answer if Sizing table is empty
        const idnsServersAnswer = parseInt(answers['idns-servers']) || 1;
        const internalDnsServers = (sizingSummary?.dnsSiteCount && sizingSummary.dnsSiteCount > 1)
          ? sizingSummary.dnsSiteCount
          : idnsServersAnswer;
        const externalDnsSiteCount = sizingSummary?.externalDnsSiteCount || 1;

        let autoValue = '';
        let formula = '';
        
        if (q.fieldType === 'dnsAggregateCalculated' && activeIPs > 0) {
          // Section = Internal DNS: peak aggregate QPS = IPs / 3
          if (q.section === 'Internal DNS' || q.id.startsWith('idns')) {
            autoValue = aggregateQPS.toLocaleString();
            formula = `${activeIPs.toLocaleString()} IPs ÷ 3 (peak) | QPD: ${(queriesPerDay).toLocaleString()}`;
          } else {
            // External DNS aggregate: don't auto-fill — let user enter
            autoValue = '';
            formula = '';
          }
        } else if (q.fieldType === 'dnsPerServerCalculated' && activeIPs > 0) {
          if (q.section === 'Internal DNS' || q.id.startsWith('idns')) {
            // Internal: peak aggregate / internal DNS site count from Sizing
            autoValue = Math.ceil(aggregateQPS / internalDnsServers).toLocaleString();
            formula = `Peak (${aggregateQPS.toLocaleString()}) ÷ ${internalDnsServers} DNS server${internalDnsServers !== 1 ? 's' : ''} (from Sizing)`;
          } else {
            // External: user-entered aggregate / E-letter site count from Sizing
            const userExtAgg = parseInt(answers['edns-2']) || 0;
            if (userExtAgg > 0) {
              autoValue = Math.ceil(userExtAgg / externalDnsSiteCount).toLocaleString();
              formula = `User aggregate (${userExtAgg.toLocaleString()}) ÷ ${externalDnsSiteCount} external DNS server${externalDnsSiteCount !== 1 ? 's' : ''} (from Sizing)`;
            }
          }
        } else if (q.fieldType === 'ipCalculated') {
          autoValue = activeIPs.toLocaleString();
          if (topBarKW > 0) {
            const mult = parseFloat(answers['ipam-multiplier']) || 2.5;
            formula = `${topBarKW.toLocaleString()} KW × ${mult} = ${topBarIPs.toLocaleString()} IPs`;
          }
        }
        
        const isManual = Boolean(currentValue);
        const displayValue = currentValue || autoValue || '';
        const autoRaw = autoValue ? autoValue.replace(/,/g, '') : '';
        const aggregateCap = aggregateQPS > 0 ? aggregateQPS : null;

        const handleCalcChange = (raw) => {
          const digits = raw.replace(/[^\d]/g, '');
          if (!digits) { handleAnswerChange(q.id, ''); return; }
          const num = parseInt(digits, 10);
          if (q.fieldType === 'dnsPerServerCalculated' && aggregateCap && num > aggregateCap) {
            handleAnswerChange(q.id, String(aggregateCap));
          } else {
            handleAnswerChange(q.id, String(num));
          }
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={e => handleCalcChange(e.target.value)}
                onFocus={e => { if (!isManual && autoRaw) { handleAnswerChange(q.id, autoRaw); setTimeout(() => e.target.select(), 0); } }}
                style={{ width: `${Math.max(10, displayValue.replace(/,/g, '').length + 4)}ch` }}
                className={[
                  "h-8 text-sm text-right px-2 [&::-webkit-inner-spin-button]:hidden",
                  !isManual && autoValue ? "text-muted-foreground italic" : "",
                ].join(' ')}
                placeholder="Enter..."
                data-testid={`input-answer-${q.id}`}
              />
              {autoValue && (
                <span
                  onClick={isManual ? () => handleAnswerChange(q.id, '') : () => handleAnswerChange(q.id, autoRaw)}
                  className={[
                    "cursor-pointer text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors select-none",
                    isManual
                      ? "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                      : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
                  ].join(' ')}
                  data-testid={isManual ? `reset-auto-${q.id}` : `auto-badge-${q.id}`}
                >
                  {isManual ? <RotateCcw className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                  Auto
                </span>
              )}
            </div>
            {formula && (
              <p className="text-[10px] text-muted-foreground leading-tight">{formula}</p>
            )}
          </div>
        );
      }
      case 'dhcpAggregateCalculated':
      case 'dhcpPerServerCalculated': {
        // ── DHCP LPS Formula: ────────────────────────────────────────────────
        // dhcpClients = activeIPs × (dhcpPercent / 100)
        // aggregateLPS = dhcpClients / leaseTimeSeconds  (wireless lease time)
        // perServerLPS = aggregateLPS / dhcpServerCount
        // Bidirectional: override either field → reverse-calculate the other
        const dhcpTopBarKW = parseInt(answers['ud-1']) || 0;
        const dhcpTopBarIPs = Math.round(dhcpTopBarKW * (parseFloat(answers['ipam-multiplier']) || 2.5));
        const dhcpIpCalcManual = answers['ipam-1-override'] === 'true';
        const dhcpActiveIPs = dhcpIpCalcManual ? (parseInt(answers['ipam-1']) || 0) : dhcpTopBarIPs;
        const dhcpPct = parseInt(answers['dhcp-0-pct']) || parseInt(answers['ipam-4']) || 80;
        const dhcpLeaseSecs = parseInt(answers['dhcp-3']) || 86400;
        const dhcpServerCount = parseInt(answers['dhcp-servers']) || 1;
        const dhcpClients = Math.ceil(dhcpActiveIPs * dhcpPct / 100);
        const autoAggregateLPS = dhcpLeaseSecs > 0 ? Math.ceil(dhcpClients / dhcpLeaseSecs) : 0;
        const autoPerServerLPS = Math.ceil(autoAggregateLPS / dhcpServerCount);

        // Bidirectional: read the sibling override to reverse-calculate
        const userAgg = parseInt(answers['dhcp-lps-agg']) || 0;
        const userPer = parseInt(answers['dhcp-lps-per']) || 0;

        let dhcpAutoValue = '';
        let dhcpFormula = '';

        if (q.fieldType === 'dhcpAggregateCalculated') {
          if (userPer > 0) {
            // Reverse from per-server: aggregate = per × serverCount
            const reversed = userPer * dhcpServerCount;
            dhcpAutoValue = reversed.toLocaleString();
            dhcpFormula = `${userPer.toLocaleString()} LPS/server × ${dhcpServerCount} server${dhcpServerCount !== 1 ? 's' : ''} (reversed from per-server)`;
          } else if (dhcpActiveIPs > 0) {
            dhcpAutoValue = autoAggregateLPS.toLocaleString();
            dhcpFormula = `${dhcpClients.toLocaleString()} clients ÷ ${dhcpLeaseSecs.toLocaleString()}s lease = ${autoAggregateLPS.toLocaleString()} LPS`;
          }
        } else {
          if (userAgg > 0) {
            // Compute from user-entered aggregate
            dhcpAutoValue = Math.ceil(userAgg / dhcpServerCount).toLocaleString();
            dhcpFormula = `${userAgg.toLocaleString()} agg ÷ ${dhcpServerCount} server${dhcpServerCount !== 1 ? 's' : ''}`;
          } else if (dhcpActiveIPs > 0) {
            dhcpAutoValue = autoPerServerLPS.toLocaleString();
            dhcpFormula = `${autoAggregateLPS.toLocaleString()} agg ÷ ${dhcpServerCount} server${dhcpServerCount !== 1 ? 's' : ''} (from Sizing)`;
          }
        }

        const dhcpIsManual = Boolean(currentValue);
        const dhcpDisplay = currentValue || dhcpAutoValue || '';
        const dhcpAutoRaw = dhcpAutoValue ? dhcpAutoValue.replace(/,/g, '') : '';
        const dhcpAggregateCap = autoAggregateLPS > 0 ? autoAggregateLPS : null;

        const handleDhcpCalcChange = (raw) => {
          const digits = raw.replace(/[^\d]/g, '');
          if (!digits) { handleAnswerChange(q.id, ''); return; }
          const num = parseInt(digits, 10);
          if (q.fieldType === 'dhcpPerServerCalculated' && dhcpAggregateCap && num > dhcpAggregateCap) {
            handleAnswerChange(q.id, String(dhcpAggregateCap));
          } else {
            handleAnswerChange(q.id, String(num));
          }
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={dhcpDisplay}
                onChange={e => handleDhcpCalcChange(e.target.value)}
                onFocus={e => { if (!dhcpIsManual && dhcpAutoRaw) { handleAnswerChange(q.id, dhcpAutoRaw); setTimeout(() => e.target.select(), 0); } }}
                style={{ width: `${Math.max(10, dhcpDisplay.replace(/,/g, '').length + 4)}ch` }}
                className={[
                  "h-8 text-sm text-right px-2 [&::-webkit-inner-spin-button]:hidden",
                  !dhcpIsManual && dhcpAutoValue ? "text-muted-foreground italic" : "",
                ].join(' ')}
                placeholder="Enter..."
                data-testid={`input-answer-${q.id}`}
              />
              {dhcpAutoValue && (
                <span
                  onClick={dhcpIsManual ? () => handleAnswerChange(q.id, '') : () => handleAnswerChange(q.id, dhcpAutoRaw)}
                  className={[
                    "cursor-pointer text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors select-none",
                    dhcpIsManual
                      ? "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                      : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
                  ].join(' ')}
                  data-testid={dhcpIsManual ? `reset-auto-${q.id}` : `auto-badge-${q.id}`}
                >
                  {dhcpIsManual ? <RotateCcw className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                  Auto
                </span>
              )}
            </div>
            {dhcpFormula && (
              <p className="text-[10px] text-muted-foreground leading-tight">{dhcpFormula}</p>
            )}
          </div>
        );
      }
      case 'dhcpRedundancy': {
        const options = getDhcpRedundancyOptions();
        return (
          <div className="flex flex-wrap gap-1" data-testid={`dhcp-redundancy-${q.id}`}>
            {options.map(opt => (
              <button key={opt.value}
                onClick={() => handleAnswerChange(q.id, currentValue === opt.value ? '' : opt.value)}
                data-testid={`checkbox-${q.id}-${opt.value}`}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  currentValue === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >{opt.label}</button>
            ))}
          </div>
        );
      }
      case 'prefixNumber': {
        const prefix = q.prefix || '<';
        const rawVal = currentValue || q.defaultValue || `${prefix}1`;
        const numPart = rawVal.replace(/[<>]/g, '').trim();
        const hasPrefix = rawVal.startsWith(prefix);
        return (
          <div className="flex items-center gap-1.5" data-testid={`prefix-number-${q.id}`}>
            <button
              onClick={() => handleAnswerChange(q.id, hasPrefix ? numPart : `${prefix}${numPart}`)}
              className={`px-2 h-8 text-xs font-mono font-bold rounded-md border transition-colors ${
                hasPrefix
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
              title={hasPrefix ? `Remove '${prefix}' prefix` : `Add '${prefix}' prefix`}
            >{prefix}</button>
            <AutoNumInput
              value={numPart}
              onChange={e => handleAnswerChange(q.id, hasPrefix ? `${prefix}${(e.target as HTMLInputElement).value}` : (e.target as HTMLInputElement).value)}
              data-testid={`input-answer-${q.id}`}
            />
          </div>
        );
      }
      case 'tdNiosSection':
        return <TDNiosSection value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'assetConfigInput':
        return <AssetConfigInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} knowledgeWorkers={answers['ud-1']} />;
      case 'reportingInput':
        return <ReportingInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} knowledgeWorkers={answers['ud-1']} assetConfigValue={answers['beta-asset-config']} />;
      case 'dossierInput':
        return <DossierInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'lookalikeInput':
        return <LookalikeInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'domainTakedownInput':
        return <DomainTakedownInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'socInsightsInput':
        return <SocInsightsInput value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} knowledgeWorkers={answers['ud-1']} assetConfigValue={answers['beta-asset-config']} />;
      case 'uddiEstimator':
        return <UDDIEstimator value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'siteConfiguration':
        return <SiteConfiguration value={currentValue} onChange={v => handleAnswerChange(q.id, v)} questionId={q.id} />;
      case 'tokenTotal':
        return <TokenTotalDisplay answers={answers} />;
      case 'note':
        // Note/text-only questions - use textarea
        return <Textarea value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Add notes..." rows={compact ? 2 : 3} className={compact ? "text-sm min-h-[60px]" : ""} data-testid={`textarea-answer-${q.id}`} />;
      default:
        return q.question?.length > 80
          ? <Textarea value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Enter your answer..." rows={compact ? 2 : 3} className={compact ? "text-sm" : ""} data-testid={`textarea-answer-${q.id}`} />
          : <Input value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Enter..." className={inputClass} data-testid={`input-answer-${q.id}`} />;
    }
  };

  // Compact 3-column layout for Discovery (v2 design)
  if (compact) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Pinned Section Navigation Bar — lives outside scroll so content never passes behind it */}
        <div className="flex-shrink-0 bg-background border-b-2 border-border py-2.5 px-1 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.15)]" data-testid="section-nav-bar">
          <div className="flex items-center gap-2">
            {/* Compact mode toggle */}
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`p-1.5 rounded-md border transition-colors ${compactMode ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'}`}
              title={compactMode ? "Comfortable spacing" : "Compact spacing"}
            >
              {compactMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            
            {/* Nav pills with progress bars */}
            <div ref={navRef} className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
              {sections.map(section => {
                const isSectionEnabled = enabledSections[section] !== false;
                const isActive = activeSection === section;
                const answeredCount = grouped[section].filter(q => answers[q.id]?.trim()).length;
                const totalCount = grouped[section].length;
                const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
                const abbrev = sectionAbbreviations[section] || section;
                const styles = sectionPillStyles[section] || { normal: 'bg-transparent text-foreground border-border', active: 'bg-primary text-white border-primary' };
                return (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    data-nav-section={section}
                    className={`relative flex flex-col items-center px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200 border-2 overflow-hidden
                      ${isActive 
                        ? `${styles.active} scale-105` 
                        : isSectionEnabled 
                          ? `${styles.normal} hover:scale-102` 
                          : 'bg-transparent border-border/30 text-muted-foreground/50 line-through'
                      }`}
                    data-testid={`nav-${section.replace(/\s/g, '-')}`}
                  >
                    {/* Progress bar background */}
                    {!isActive && isSectionEnabled && progress > 0 && (
                      <div 
                        className="absolute bottom-0 left-0 h-0.5 bg-[#00BD4D] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                    <span>{abbrev}</span>
                    <span className={`text-[9px] font-medium ${isActive ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {answeredCount}/{totalCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable sections — own scroll context, nav stays pinned above */}
        <div className="flex-1 overflow-y-auto min-h-0 [mask-image:linear-gradient(to_bottom,transparent_0px,black_16px)]">
        <div className="space-y-3 p-4 pb-8">
        {Object.entries(grouped).map(([section, sectionQuestions]) => {
          const isSectionEnabled = enabledSections[section] !== false;
          const isCollapsed = collapsedSections[section] === true;
          const isActive = activeSection === section;
          
          // Get all questions including conditionals, mark which are conditional
          const allQuestionsWithMeta = sectionQuestions.map(q => {
            if (q.hidden) return null;
            const isConditional = !!q.conditionalOn;
            let conditionMet = true;
            let parentQuestion = null;
            
            if (isConditional) {
              const parentAnswer = answers[q.conditionalOn.questionId] || '';
              conditionMet = parentAnswer === q.conditionalOn.value || 
                parentAnswer.split(',').map(v => v.trim()).includes(q.conditionalOn.value);
              parentQuestion = sectionQuestions.find(sq => sq.id === q.conditionalOn.questionId);
            }
            
            return { ...q, isConditional, conditionMet, parentQuestion };
          }).filter(Boolean);

          // ALL non-conditional questions go in 3-column grid (excluding Token Calculator subsection)
          const gridQuestions = allQuestionsWithMeta.filter(q => !q.isConditional && q.subsection !== 'Token Calculator');
          
          // Token Calculator questions for compact mode
          const tokenCalculatorQuestions = allQuestionsWithMeta.filter(q => q.subsection === 'Token Calculator');

          // IDs with special-case renderers that need full cell space
          const specialCaseIds = new Set([
            'ipam-0','ipam-9','ipam-11','ipam-13','idns-0','idns-6','edns-0','dhcp-0','dhcp-7a','ni-3a',
            'dhcp-7','dhcp-9','edns-3','ipam-4','dhcp-0-pct','ni-discovered-source','uddi-mode',
            'uddi-cloud-platforms','ud-5','ud-7',
          ]);
          const isSimpleInline = (q) => {
            const ft = detectFieldType(q);
            return (ft === 'yesno' || ft === 'number' || ft === 'leaseTime' || ft === 'prefixNumber') && !specialCaseIds.has(q.id);
          };

          // Separate compact inline vs complex questions
          const compactQuestions = gridQuestions.filter(q => isSimpleInline(q));
          const complexQuestions = gridQuestions.filter(q => !isSimpleInline(q));

          // Split complex questions into 3 columns
          const col1 = [], col2 = [], col3 = [];
          complexQuestions.forEach((q, i) => {
            if (i % 3 === 0) col1.push(q);
            else if (i % 3 === 1) col2.push(q);
            else col3.push(q);
          });

          // Find conditional questions for each parent
          const getConditionals = (parentId) => 
            allQuestionsWithMeta.filter(q => q.isConditional && q.conditionalOn?.questionId === parentId && q.conditionMet);

          const needsInputField = (q) => {
            const ft = detectFieldType(q);
            return ['yesno', 'select', 'multiselect', 'number', 'enableSwitch', 'leaseTime', 'prefixNumber', 'dhcpRedundancy', 'ipCalculated', 'dnsAggregateCalculated', 'dnsPerServerCalculated', 'dhcpAggregateCalculated', 'dhcpPerServerCalculated'].includes(ft);
          };

          // Check if question is freeform/text type
          const isFreeformQuestion = (q) => {
            const ft = detectFieldType(q);
            return ft === 'text' && !q.options;
          };

          // Render a single question cell - compact inline for simple fields, full cell for complex
          const renderQuestionCell = (q, colIndex, rowIndex) => {
            const hasNote = notes[q.id]?.trim();
            const isNoteExpanded = expandedNotes[q.id];
            const conditionals = getConditionals(q.id);
            const isFreeform = isFreeformQuestion(q);
            const hasInput = needsInputField(q);
            const hasAnswer = answers[q.id]?.trim();
            const isClickableRow = !hasInput;
            const simpleInline = isSimpleInline(q);
            
            if (simpleInline) {
              return (
                <div key={q.id} className="border-b border-border last:border-b-0">
                  <div className={`${compactMode ? 'px-4 py-3' : 'px-5 py-4'} flex items-center justify-between gap-3`} data-testid={`question-${q.id}`}>
                    <span className="text-sm font-semibold text-foreground flex-1 leading-relaxed">{q.question}</span>
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>{renderField(q)}</div>
                  </div>
                  {conditionals.length > 0 && (
                    <div className="ml-6 border-l-2 border-border">
                      {conditionals.map(cq => {
                        const ft = detectFieldType(cq);
                        const v = answers[cq.id] ?? '';
                        if (ft === 'number') {
                          return (
                            <div key={cq.id} className="flex items-center justify-between px-3 py-2 mx-5 mb-1.5 rounded-lg bg-muted/40 border border-border/60" data-testid={`question-${cq.id}`}>
                              <span className="text-xs font-medium text-foreground">{cq.question}</span>
                              <AutoNumInput value={v} onChange={e => handleAnswerChange(cq.id, (e.target as HTMLInputElement).value)} placeholder="0" data-testid={`input-answer-${cq.id}`} />
                            </div>
                          );
                        }
                        if (ft === 'yesno') {
                          return (
                            <div key={cq.id} className="flex items-center justify-between px-3 py-2 mx-5 mb-1.5 rounded-lg bg-muted/40 border border-border/60" data-testid={`question-${cq.id}`}>
                              <span className="text-xs font-medium text-foreground">{cq.question}</span>
                              <div className="flex gap-1">
                                {['Yes','No'].map(opt => (
                                  <button key={opt} onClick={() => handleAnswerChange(cq.id, v === opt ? '' : opt)}
                                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors ${v === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>{opt}</button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={cq.id} className="px-5 py-3 bg-secondary/30" data-testid={`question-${cq.id}`}>
                            <label className="text-sm font-semibold text-foreground block mb-2">{cq.question}</label>
                            {renderField(cq)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={q.id} className="border-b border-border last:border-b-0">
                {/* Question cell - full layout for complex fields */}
                <div 
                  className={`${compactMode ? 'px-4 py-3' : 'px-5 py-4'} ${isClickableRow ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={isClickableRow ? () => setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] })) : undefined}
                  data-testid={`question-${q.id}`}
                >
                  {/* Question Label */}
                  <div className={`flex items-start justify-between gap-3 ${compactMode ? 'mb-2' : 'mb-3'}`}>
                    <label className="text-sm font-semibold text-foreground leading-relaxed flex-1">
                      {q.question}
                    </label>
                    {hasNote && (
                      <span className="text-[10px] text-[#00BD4D] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#00BD4D]/10">noted</span>
                    )}
                  </div>
                  
                  {/* Input field */}
                  {hasInput ? (
                    <div onClick={e => e.stopPropagation()}>
                      {renderField(q)}
                    </div>
                  ) : (
                    <button 
                      className="text-sm text-[#00BD4D] hover:text-[#00BD4D]/80 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] }));
                      }}
                    >
                      {hasNote ? 'Edit response →' : 'Add response →'}
                    </button>
                  )}
                  
                  {/* Note textarea */}
                  {isNoteExpanded && (
                    <div className="mt-4">
                      <Textarea
                        value={notes[q.id] || ''}
                        onChange={e => setNote(q.id, e.target.value)}
                        placeholder="Type here..."
                        className="min-h-[80px] text-sm bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-primary focus:border-primary"
                        data-testid={`note-${q.id}`}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
                
                {/* Conditional sub-questions */}
                {conditionals.length > 0 && (
                  <div className="ml-6 border-l-2 border-border">
                    {conditionals.map(cq => {
                      const isMsInline = cq.id === 'ms-7' || cq.id === 'ms-8' || cq.id === 'idns-0a' || cq.id === 'ud-2a';
                      const isInlineYesNo = cq.id === 'ipam-3';
                      const isInlineSelect = false; // ud-2a is now number, handled by isMsInline
                      const suppressLabel = cq.conditionalOn?.questionId === 'ms-1';
                      if (isMsInline) {
                        return (
                          <div key={cq.id} className="flex items-center justify-between px-3 py-2 mx-5 mb-1.5 rounded-lg bg-muted/40 border border-border/60" data-testid={`question-${cq.id}`}>
                            <span className="text-xs font-medium text-foreground">{cq.question}</span>
                            <AutoNumInput value={answers[cq.id] ?? ''} onChange={e => handleAnswerChange(cq.id, (e.target as HTMLInputElement).value)} placeholder="0" data-testid={`input-answer-${cq.id}`} />
                          </div>
                        );
                      }
                      if (isInlineYesNo) {
                        const v = answers[cq.id] ?? '';
                        return (
                          <div key={cq.id} className="flex items-center justify-between px-3 py-2 mx-5 mb-1.5 rounded-lg bg-muted/40 border border-border/60" data-testid={`question-${cq.id}`}>
                            <span className="text-xs font-medium text-foreground">{cq.question}</span>
                            <div className="flex gap-1">
                              {['Yes','No'].map(opt => (
                                <button key={opt} onClick={() => handleAnswerChange(cq.id, v === opt ? '' : opt)}
                                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                                    v === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                  }`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (isInlineSelect) {
                        const v = answers[cq.id] ?? '';
                        return (
                          <div key={cq.id} className="flex items-center justify-between px-3 py-2 mx-5 mb-1.5 rounded-lg bg-muted/40 border border-border/60" data-testid={`question-${cq.id}`}>
                            <span className="text-xs font-medium text-foreground">{cq.question}</span>
                            <div className="flex gap-1">
                              {(cq.options || []).map(opt => (
                                <button key={opt} onClick={() => handleAnswerChange(cq.id, v === opt ? '' : opt)}
                                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                                    v === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                  }`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div 
                          key={cq.id} 
                          className="px-5 py-4 bg-secondary/30"
                          data-testid={`question-${cq.id}`}
                        >
                          {!suppressLabel && (
                            <div className="text-xs text-[#00BD4D] mb-2 uppercase tracking-wide font-medium">
                              If {cq.conditionalOn.value}
                            </div>
                          )}
                          <label className="text-sm font-semibold text-foreground block mb-2">
                            {cq.question}
                          </label>
                          {/* dhcp-7a: vendor tag input using GridMultiSelect */}
                          {cq.id === 'dhcp-7a'
                            ? <GridMultiSelect questionId={cq.id} options={cq.options || []} value={answers[cq.id] ?? ''} onChange={v => handleAnswerChange(cq.id, v)} allowFreeform={true} columns={3} />
                            : renderField(cq)
                          }
                          {/* Warning shown when answer matches warningCondition */}
                          {cq.warningCondition && answers[cq.id] === cq.warningCondition.value && (
                            <div className="mt-2 flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span className="text-xs font-medium">{cq.warningCondition.message}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          };

          // Section color coding for visual distinction
          const sectionAccent = sectionColors[section] || 'border-l-primary';

          const activeBg = sectionActiveBg[section] || 'bg-primary/5 ring-primary/40 shadow-primary/10';

          return (
            <div 
              key={section} 
              className={`rounded-lg overflow-hidden transition-all duration-300 scroll-mt-14
                ${isActive && isSectionEnabled 
                  ? `ring-2 shadow-xl ${activeBg}` 
                  : !isSectionEnabled 
                    ? 'opacity-40 grayscale-[30%] border border-border/50' 
                    : activeSection && !isActive
                      ? 'border border-border/60 opacity-75'
                      : 'border border-border'
                }
              `} 
              data-testid={`section-${section.replace(/\s/g, '-')}`}
              data-section-id={section}
            >
              {/* Section Header */}
              <div 
                className={`px-4 flex items-center justify-between transition-all border-l-4 ${sectionAccent}
                  ${isActive && isSectionEnabled ? 'py-4' : 'py-3'}
                  ${isSectionEnabled ? 'bg-card hover:bg-secondary/50' : 'bg-muted/60'}
                  ${isActive && isSectionEnabled ? 'border-l-[6px]' : ''}
                `}
              >
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleCollapse(section)}>
                  <ChevronRight className={`transition-transform duration-200 ${!isCollapsed && isSectionEnabled ? 'rotate-90' : ''} h-5 w-5 text-muted-foreground`} />
                  <h3 className={`font-semibold text-foreground ${isActive && isSectionEnabled ? 'text-xl' : 'text-base'}`}>{section}</h3>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleSectionToggle(section, !isSectionEnabled)}
                    data-testid={`switch-section-${section.replace(/\s/g, '-')}`}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      isSectionEnabled
                        ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
                        : 'bg-muted border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {isSectionEnabled ? 'In Scope' : 'Out of Scope'}
                  </button>
                </div>
              </div>

              {/* Section content */}
              <div className={`transition-all duration-300 overflow-hidden ${!isCollapsed && isSectionEnabled ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {/* Compact inline cards — multi-column grid */}
                {compactQuestions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/20 border-b border-border/40">
                    {compactQuestions.map((q, i) => (
                      <div key={q.id} className="bg-background">{renderQuestionCell(q, 0, i)}</div>
                    ))}
                  </div>
                )}
                {/* Complex questions — 3-column grid */}
                {complexQuestions.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/20">
                    <div className="bg-background">
                      {col1.map((q, i) => renderQuestionCell(q, 0, i))}
                    </div>
                    <div className="bg-background">
                      {col2.map((q, i) => renderQuestionCell(q, 1, i))}
                    </div>
                    <div className="bg-background">
                      {col3.map((q, i) => renderQuestionCell(q, 2, i))}
                    </div>
                  </div>
                )}
                
                {/* Token Calculator subsection for Security section */}
                {section === 'Security' && tokenCalculatorQuestions.length > 0 && (
                  <div className="mt-2 mx-4 mb-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer py-3 px-4 hover:bg-muted/30 rounded-md border border-border"
                      onClick={() => setExpandedSubsections(p => ({ ...p, 'Token Calculator': !(p['Token Calculator'] ?? true) }))}
                      data-testid="subsection-token-calculator"
                    >
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Token Calculator</h4>
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); setExpandedSubsections(p => ({ ...p, 'Token Calculator': !(p['Token Calculator'] ?? true) })); }}>
                          {(expandedSubsections['Token Calculator'] ?? true) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    {(expandedSubsections['Token Calculator'] ?? true) && (
                      <div className="mt-2 space-y-2">
                        {tokenCalculatorQuestions.map(q => (
                          <div key={q.id} className="px-4 py-3 bg-background border border-border rounded-md">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <label className="text-sm font-semibold text-foreground leading-relaxed flex-1">
                                {q.question}
                              </label>
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              {renderField(q)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>
          );
        })}

        </div>
        </div>

      </div>
    );
  }

  // Regular (non-compact) layout
  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(grouped).map(([section, sectionQuestions]) => {
          const isSectionEnabled = enabledSections[section] !== false;
          return (
            <AccordionItem key={section} value={section} className={`border rounded-md bg-card ${!isSectionEnabled ? 'opacity-50' : ''}`} data-testid={`section-${section.replace(/\s/g, '-')}`}>
              <div className="flex items-center justify-between px-6 py-4">
                <AccordionTrigger className="flex-1 text-base font-semibold hover:no-underline p-0 [&>svg]:ml-2">
                  <span>{section}</span>
                </AccordionTrigger>
                <div className="flex items-center gap-2 ml-4" onClick={e => e.stopPropagation()}>
                  <Switch id={`section-toggle-${section}`} checked={isSectionEnabled} onCheckedChange={c => handleSectionToggle(section, c)} data-testid={`switch-section-${section.replace(/\s/g, '-')}`} />
                  <Label htmlFor={`section-toggle-${section}`} className="text-xs font-normal cursor-pointer">{isSectionEnabled ? 'Enabled' : 'Disabled'}</Label>
                </div>
              </div>
              <AccordionContent className="px-6 pb-4">
                <div className={`space-y-4 ${!isSectionEnabled ? 'pointer-events-none' : ''}`}>
                  {renderSectionQuestions(sectionQuestions, answers, expandedSubsections, setExpandedSubsections, expandedNotes, setExpandedNotes, notes, setNote, renderField)}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

    </div>
  );
}
