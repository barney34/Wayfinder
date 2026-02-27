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
import { ChevronDown, ChevronUp, ChevronRight, X, Plus, Info, MessageSquare, Check, Zap, Minimize2, Maximize2, AlertTriangle, Sparkles } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";
// ChatValueDiscovery moved to ValueDiscoveryDrawer — no longer rendered per-section
import {
  TDNiosSection, DossierInput, LookalikeInput, AssetConfigInput,
  SocInsightsInput, DomainTakedownInput, ReportingInput, UDDIEstimator,
  SiteConfiguration,
} from "./sizing";
import { sizingDefaults } from "@/lib/tokenData";
import { getUnitLetterForRole } from "./sizing/calculators/unitDesignations";

// ===== GridMultiSelect (dropdown with grid options, selected as bubbles below) =====
function GridMultiSelect({ questionId, options, value, onChange, allowFreeform, columns = 2 }) {
  const [freeformInput, setFreeformInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  const toggleOption = (opt) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt).join(', '));
    } else {
      onChange([...selectedValues, opt].join(', '));
    }
  };

  const addFreeformValue = () => {
    const t = freeformInput.trim();
    if (t && !selectedValues.includes(t)) {
      onChange([...selectedValues, t].join(', '));
      setFreeformInput('');
    }
  };

  const removeValue = (val) => {
    onChange(selectedValues.filter(v => v !== val).join(', '));
  };

  return (
    <div className="space-y-2">
      {/* Dropdown trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="h-8 text-xs px-3 min-w-[140px] justify-between font-normal bg-muted border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            data-testid={`grid-trigger-${questionId}`}
          >
            <span>{selectedValues.length === 0 ? 'Select...' : `${selectedValues.length} selected`}</span>
            <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto min-w-[320px] p-3 bg-card border-border" align="start">
          <div className={`grid gap-2 mb-3`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, auto))` }}>
            {options.map(opt => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border whitespace-nowrap ${
                  selectedValues.includes(opt)
                    ? 'bg-[#12C2D3]/20 border-[#12C2D3] text-foreground'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`grid-option-${questionId}-${opt.replace(/\s/g, '-')}`}
              >
                <Checkbox
                  checked={selectedValues.includes(opt)}
                  onCheckedChange={() => toggleOption(opt)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="text-xs font-medium">{opt}</span>
              </label>
            ))}
          </div>
          {allowFreeform && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Input
                placeholder="Other..."
                value={freeformInput}
                onChange={e => setFreeformInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeformValue(); } }}
                className="flex-1 h-7 text-xs bg-background border-border text-foreground"
                data-testid={`grid-freeform-${questionId}`}
              />
              <Button size="icon" variant="outline" className="h-7 w-7 bg-background border-border" onClick={addFreeformValue} disabled={!freeformInput.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected items as bubbles below */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map(val => (
            <span 
              key={val} 
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-foreground bg-[#12C2D3]/20 border border-[#12C2D3]/50 rounded-full whitespace-nowrap"
            >
              {val}
              <button onClick={() => removeValue(val)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SyncedNumberField (syncs with TopBar DC/Sites count, shows mismatch) =====
function SyncedNumberField({ questionId, value, onChange, syncValue, syncLabel }) {
  const numValue = parseInt(value) || 0;
  const hasMismatch = syncValue !== undefined && numValue !== syncValue;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        className={`w-28 h-8 text-xs text-right px-3 ${hasMismatch ? 'border-[#FEDD00] bg-[#FEDD00]/10' : 'bg-background border-border'}`}
        placeholder="0"
        data-testid={`input-answer-${questionId}`}
      />
      {hasMismatch && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[#FEDD00]/10 text-[#9A7600] dark:text-[#FEDD00] border-[#FEDD00]/50">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                {syncValue} in TopBar
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">TopBar shows {syncValue} {syncLabel}, but this field says {numValue}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ===== AddResponseField (expandable text input for SmartFill) =====
function AddResponseField({ questionId, value, onChange, onExamine, sectionContext }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExamining, setIsExamining] = useState(false);

  const handleExamine = async () => {
    if (!value?.trim()) return;
    setIsExamining(true);
    try {
      await onExamine?.(value, sectionContext);
    } finally {
      setIsExamining(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-sm text-[#00594C] dark:text-[#12C2D3] hover:text-[#00594C] dark:text-[#12C2D3]/80 flex items-center gap-1"
        data-testid={`add-response-btn-${questionId}`}
      >
        <Plus className="h-3 w-3" />
        Add response
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onChange(e.target.value)}
        placeholder="Enter additional context or notes..."
        className="min-h-[80px] text-sm bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-primary focus:border-primary"
        data-testid={`response-textarea-${questionId}`}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExamine}
          disabled={!value?.trim() || isExamining}
          className="h-7 text-xs bg-muted border-border hover:bg-secondary text-foreground"
          data-testid={`examine-btn-${questionId}`}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {isExamining ? 'Examining...' : 'Examine for answers'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(false)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Done
        </Button>
      </div>
    </div>
  );
}

// Constants for auto-calculation
const AUTO_CALC_DEFAULTS = {
  dnsQpdPerIP: 3500, // DNS queries per day per active IP
  workdayHours: 9,
  peakQpsDivisor: 3, // peak_QPS = active_IPs / 3
};

// ===== InlineCheckboxSelect (for compact single-select) =====
function InlineCheckboxSelect({ questionId, options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {options.slice(0, 6).map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer group" data-testid={`checkbox-${questionId}-${opt}`}>
          <Checkbox 
            checked={value === opt} 
            onCheckedChange={(checked) => onChange(checked ? opt : '')}
            className="h-4 w-4"
          />
          <span className="text-xs text-muted-foreground group-hover:text-foreground">{opt}</span>
        </label>
      ))}
      {options.length > 6 && (
        <span className="text-xs text-muted-foreground">+{options.length - 6} more</span>
      )}
    </div>
  );
}

// ===== InlineCheckboxMulti (for compact multi-select) =====
function InlineCheckboxMulti({ questionId, options, value, onChange }) {
  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];
  
  const toggleOption = (opt) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt).join(', '));
    } else {
      onChange([...selectedValues, opt].join(', '));
    }
  };
  
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {options.slice(0, 6).map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer group" data-testid={`checkbox-${questionId}-${opt}`}>
          <Checkbox 
            checked={selectedValues.includes(opt)} 
            onCheckedChange={() => toggleOption(opt)}
            className="h-4 w-4"
          />
          <span className="text-xs text-muted-foreground group-hover:text-foreground">{opt}</span>
        </label>
      ))}
      {options.length > 6 && (
        <span className="text-xs text-muted-foreground">+{options.length - 6} more</span>
      )}
    </div>
  );
}

// ===== SelectWithFreeform =====
function SelectWithFreeform({ questionId, options, value, onChange }) {
  const [isCustom, setIsCustom] = useState(() => value ? !options.includes(value) : false);
  return (
    <div className="flex gap-2">
      <Select value={isCustom ? '__custom__' : (value || '')} onValueChange={val => {
        if (val === '__custom__') { setIsCustom(true); onChange(''); }
        else { setIsCustom(false); onChange(val); }
      }}>
        <SelectTrigger data-testid={`select-answer-${questionId}`} className="min-w-[140px]"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          <SelectItem value="__custom__">Other (enter value)</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && <Input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Enter..." className="w-28 text-right px-3" data-testid={`input-custom-${questionId}`} />}
    </div>
  );
}

// ===== MultiSelectField =====
// Used for multiselects with special options (R/W permissions, vendor sub-inputs).
// Options are displayed in a 2-column grid inside the popover.
function MultiSelectField({ questionId, options, optionsWithPermission = [], optionsWithVendor = [], value, onChange, allowFreeform, compact = false }) {
  const [freeformInput, setFreeformInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [vendorInputs, setVendorInputs] = useState({});
  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  const isOptionSelected = (option) => selectedValues.some(v => v === option || v.startsWith(option + ' (') || v.startsWith(option + ' - '));
  const getOptionPermission = (option) => { const m = selectedValues.find(v => v.startsWith(option + ' (')); return m?.includes('(R/W)') ? 'R/W' : m?.includes('(R/O)') ? 'R/O' : null; };
  const getOptionVendors = (option) => { const m = selectedValues.find(v => v.startsWith(option + ' - ')); return m ? m.substring(option.length + 3).split('|').map(v => v.trim()).filter(Boolean) : []; };
  const getFullValue = (option) => selectedValues.find(v => v === option || v.startsWith(option + ' (') || v.startsWith(option + ' - ')) || null;
  const hasSpecialOptions = optionsWithPermission.length > 0 || optionsWithVendor.length > 0;

  const toggleOption = (option) => {
    const currentValue = getFullValue(option);
    if (currentValue) {
      onChange(selectedValues.filter(v => v !== currentValue).join(', '));
      setVendorInputs(p => { const u = { ...p }; delete u[option]; return u; });
    } else {
      const needsPerm = optionsWithPermission.includes(option);
      onChange([...selectedValues, needsPerm ? `${option} (R/W)` : option].join(', '));
    }
  };

  const setPermission = (option, perm) => { const cv = getFullValue(option); if (cv) onChange(selectedValues.map(v => v === cv ? `${option} (${perm})` : v).join(', ')); };
  const addVendor = (option, vendor) => { if (!vendor?.trim()) return; const cvs = getOptionVendors(option); if (cvs.includes(vendor.trim())) return; const nvs = [...cvs, vendor.trim()]; const cv = getFullValue(option); if (cv) onChange(selectedValues.map(v => v === cv ? `${option} - ${nvs.join(' | ')}` : v).join(', ')); setVendorInputs(p => ({ ...p, [option]: '' })); };
  const removeVendor = (option, vendor) => { const cvs = getOptionVendors(option).filter(v => v !== vendor); const cv = getFullValue(option); if (cv) onChange(selectedValues.map(v => v === cv ? (cvs.length > 0 ? `${option} - ${cvs.join(' | ')}` : option) : v).join(', ')); };
  const removeValue = (val) => onChange(selectedValues.filter(v => v !== val).join(', '));
  const addFreeformValue = () => { const t = freeformInput.trim(); if (t && !selectedValues.includes(t)) { onChange([...selectedValues, t].join(', ')); setFreeformInput(''); } };

  return (
    <div className="space-y-2">
      {/* Selected items as minimal text badges */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map(val => (
            <span 
              key={val} 
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-foreground bg-[#12C2D3]/20 border border-[#12C2D3]/50 rounded-full whitespace-nowrap"
            >
              {val}
              <button onClick={() => removeValue(val)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* Dropdown trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`justify-between font-normal bg-muted border-border text-muted-foreground hover:bg-secondary hover:text-foreground ${compact ? 'h-7 text-xs px-2 min-w-[140px]' : 'h-8 text-xs px-3 min-w-[140px]'}`}
            data-testid={`multiselect-trigger-${questionId}`}
          >
            <span>{selectedValues.length === 0 ? 'Select...' : `${selectedValues.length} selected`}</span>
            <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto min-w-[300px] p-3 bg-card border-border" align="start" onInteractOutside={(e) => e.preventDefault()}>
          {/* 2-column grid for options — with special sub-inputs expanding below when selected */}
          {hasSpecialOptions ? (
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {options.map(option => {
                  const needsPerm = optionsWithPermission.includes(option);
                  const isSelected = isOptionSelected(option);
                  return (
                    <div key={option} className="space-y-1">
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border whitespace-nowrap ${isSelected ? 'bg-[#12C2D3]/20 border-[#12C2D3] text-foreground' : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`multiselect-option-${questionId}-${option.replace(/\s/g, '-')}`}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOption(option)} className="h-4 w-4 shrink-0" />
                        <span className={`text-xs flex-1 ${isSelected ? 'font-medium' : ''}`}>{option}</span>
                        {needsPerm && isSelected && (
                          <div className="flex gap-1 ml-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant={getOptionPermission(option) === 'R/W' ? 'default' : 'outline'} className="h-5 px-1.5 text-[10px]" onClick={() => setPermission(option, 'R/W')}>R/W</Button>
                            <Button size="sm" variant={getOptionPermission(option) === 'R/O' ? 'default' : 'outline'} className="h-5 px-1.5 text-[10px]" onClick={() => setPermission(option, 'R/O')}>R/O</Button>
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
              {/* Vendor inputs shown below grid for selected items with vendor sub-input */}
              {options.filter(opt => optionsWithVendor.includes(opt) && isOptionSelected(opt)).map(option => (
                <div key={`vendor-${option}`} className="mt-2 pl-2 border-l-2 border-[#12C2D3]/30 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{option} — vendors:</span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Input placeholder="Add vendor..." value={vendorInputs[option] || ''} onChange={e => setVendorInputs(p => ({ ...p, [option]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVendor(option, vendorInputs[option]); } }} className="flex-1 h-6 text-xs" />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addVendor(option, vendorInputs[option])} disabled={!vendorInputs[option]?.trim()}><Plus className="h-3 w-3" /></Button>
                  </div>
                  {getOptionVendors(option).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {getOptionVendors(option).map(vendor => (
                        <Badge key={vendor} variant="secondary" className="gap-1 pr-1 text-[10px] h-5">{vendor}<button onClick={e => { e.stopPropagation(); removeVendor(option, vendor); }} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-2 w-2" /></button></Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Simple 2-column grid layout for standard options */
            <div className="grid grid-cols-2 gap-2 mb-3">
              {options.map(option => {
                const isSelected = isOptionSelected(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#12C2D3]/20 border-[#12C2D3] text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    data-testid={`multiselect-option-${questionId}-${option.replace(/\s/g, '-')}`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOption(option)} className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">{option}</span>
                  </label>
                );
              })}
            </div>
          )}
          {allowFreeform && (
            <div className="border-t mt-2 pt-2 flex gap-2">
              <Input placeholder="Other..." value={freeformInput} onChange={e => setFreeformInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeformValue(); } }} className="flex-1 h-7 text-xs bg-background border-border text-foreground" data-testid={`multiselect-freeform-${questionId}`} />
              <Button size="icon" variant="outline" className="h-7 w-7 bg-background border-border" onClick={addFreeformValue} disabled={!freeformInput.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          )}
          <div className="border-t mt-2 pt-2 flex justify-end">
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setIsOpen(false)}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ===== Field Type Detection =====
function detectFieldType(question) {
  // First check explicit type/fieldType
  if (question.type) return question.type;
  if (question.fieldType) return question.fieldType;
  
  const text = question.question.toLowerCase();
  if (text.startsWith('will ') || text.startsWith('is ') || text.startsWith('are ') || text.startsWith('do ') || text.includes('enabled?') || text.includes('in place?') || text.includes('implemented?')) return 'yesno';
  if (text.includes('number of') || text.includes('how many') || text.includes('percent') || text.includes('rate') || text.includes('estimated') || text.includes('total ')) return 'number';
  return 'text';
}

// ===== Main AssessmentQuestions =====
export function AssessmentQuestions({ questions, onAnswerChange, compact = false }) {
  const { answers, notes, defaultAnswers, setAnswer, setNote, enabledSections, toggleSection, enableAllSections, disableAllSections, clearSection, leaseTimeUnits, setLeaseTimeUnit, platformMode, dataCenters, sites, sizingSummary } = useDiscovery();
  const [expandedNotes, setExpandedNotes] = useState({});
  const [sectionToDisable, setSectionToDisable] = useState(null);
  const [expandedSubsections, setExpandedSubsections] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [compactMode, setCompactMode] = useState(false); // Compact mode toggle
  const [sectionResponses, setSectionResponses] = useState({}); // For Add Response at section end
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
      toast({ title: "Section Disabled", description: `"${section}" marked as Out of Scope for export.` });
    }
  };

  const confirmDisableSection = () => {
    if (sectionToDisable) { clearSection(sectionToDisable); toast({ title: "Section Disabled", description: `All data for "${sectionToDisable}" has been cleared.` }); setSectionToDisable(null); }
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
      { value: 'AAP', label: 'Anycast Address Pair (AAP)' },
      { value: 'AP', label: 'Active-Passive (AP)' },
      { value: 'AA', label: 'Active-Active (AA)' },
    ];
    // Hybrid - all options
    return [
      { value: 'FO', label: 'Failover (F/O)' },
      { value: 'AAP', label: 'Anycast Address Pair (AAP)' },
      { value: 'AP', label: 'Active-Passive (AP)' },
      { value: 'AA', label: 'Active-Active (AA)' },
    ];
  };

  // Group questions by section
  const grouped = questions.reduce((acc, q) => { if (!acc[q.section]) acc[q.section] = []; acc[q.section].push(q); return acc; }, {});
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
    'Microsoft Management': 'border-l-violet-500',
    'Asset/ Network Insight': 'border-l-amber-500',
    'Professional Services': 'border-l-slate-500',
  };

  // Abbreviated section names for nav pills
  const sectionAbbreviations = {
    'IPAM': 'IPAM',
    'Internal DNS': 'Internal DNS',
    'External DNS': 'External DNS',
    'DHCP': 'DHCP',
    'Overlay': 'Overlay',
    'Services': 'Services',
    'Asset/ Network Insight': 'AI/NI',
    'Security': 'Security',
    'Professional Services': 'PS',
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
    'Microsoft Management': '',
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
    if (q.id === 'dhcp-7a' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={true} columns={3} />;
    }

    // L2/3 device types (ni-3a) - 2-column grid layout
    if (q.id === 'ni-3a' && q.options) {
      return <GridMultiSelect questionId={q.id} options={q.options} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} columns={2} />;
    }

    // CDC (svc-3) - yesno with reminder note when Yes
    if (q.id === 'svc-3') {
      const yesNoField = (
        <div className="flex items-center gap-2">
          <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
          <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" onClick={() => handleAnswerChange(q.id, 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
        </div>
      );
      if (currentValue === 'Yes') {
        return (
          <div className="space-y-2">
            {yesNoField}
            <div className="flex items-start gap-2 px-3 py-2 bg-[#12C2D3]/10 border border-[#12C2D3]/40 rounded-lg text-xs text-[#12C2D3]">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Remember to add a <strong>CDC</strong> site to your Sizing table (Role = CDC).</span>
            </div>
          </div>
        );
      }
      return yesNoField;
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
      case 'multiselect':
        // In compact mode, use dropdown with checkboxes that stays open
        return <MultiSelectField questionId={q.id} options={q.options || []} optionsWithPermission={q.optionsWithPermission} optionsWithVendor={q.optionsWithVendor} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} compact={compact} />;
      case 'number':
        return <Input type="number" value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} className={`${compact ? 'w-28 h-7 text-xs text-right px-3' : 'w-28 text-right px-3'}`} placeholder="0" data-testid={`input-answer-${q.id}`} />;
      case 'leaseTime':
        return (
          <div className="flex items-center gap-1">
            <Input type="number" step="any" value={getDisplayLeaseValue(q.id, currentValue)} onChange={e => handleLeaseTimeChange(q.id, e.target.value)} className={compact ? "w-28 h-7 text-xs text-right px-3" : "w-28 text-right px-3"} data-testid={`input-answer-${q.id}`} />
            <Select value={getLeaseTimeUnit(q.id)} onValueChange={v => setLeaseTimeUnit(q.id, v)}>
              <SelectTrigger className={compact ? "min-w-[140px] h-7 text-xs" : "min-w-[140px]"}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="seconds">sec</SelectItem><SelectItem value="minutes">min</SelectItem><SelectItem value="hours">hr</SelectItem><SelectItem value="days">day</SelectItem></SelectContent>
            </Select>
          </div>
        );
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
        }
        
        const isAutoFilled = !currentValue && autoValue;
        
        return (
          <div className="flex items-center gap-2">
            <Input 
              type="text" 
              value={currentValue || ''} 
              onChange={e => handleAnswerChange(q.id, e.target.value)} 
              className={compact ? "w-28 h-7 text-xs text-right px-3" : "w-28 text-right px-3"} 
              placeholder={autoValue || "Enter..."} 
              data-testid={`input-answer-${q.id}`} 
            />
            {isAutoFilled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-accent/10 text-accent border-accent/30">
                      <Zap className="h-2.5 w-2.5 mr-0.5" />Auto
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Auto-calculated: {autoValue}</p>
                    {formula && <p className="text-xs text-muted-foreground">{formula}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      }
      case 'dhcpRedundancy': {
        const options = getDhcpRedundancyOptions();
        return (
          <div className="flex flex-wrap gap-1" data-testid={`dhcp-redundancy-${q.id}`}>
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer group" data-testid={`checkbox-${q.id}-${opt.value}`}>
                <Checkbox
                  checked={currentValue === opt.value}
                  onCheckedChange={(checked) => handleAnswerChange(q.id, checked ? opt.value : '')}
                  className="h-4 w-4"
                />
                <span className={`text-xs group-hover:text-foreground ${currentValue === opt.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{opt.value}</span>
              </label>
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
          <div className="flex items-center gap-1" data-testid={`prefix-number-${q.id}`}>
            <label className="flex items-center gap-1 cursor-pointer">
              <Checkbox
                checked={hasPrefix}
                onCheckedChange={(checked) => {
                  handleAnswerChange(q.id, checked ? `${prefix}${numPart}` : numPart);
                }}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-muted-foreground font-mono">{prefix}</span>
            </label>
            <Input
              type="number"
              value={numPart}
              onChange={e => handleAnswerChange(q.id, hasPrefix ? `${prefix}${e.target.value}` : e.target.value)}
              className={compact ? "w-28 h-7 text-xs text-right px-3" : "w-28 text-right px-3"}
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
      <div className="space-y-3">
        {/* Sticky Section Navigation Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b py-2.5 -mx-1 px-1" data-testid="section-nav-bar">
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

          // Split questions into 3 columns
          const col1 = [], col2 = [], col3 = [];
          gridQuestions.forEach((q, i) => {
            if (i % 3 === 0) col1.push(q);
            else if (i % 3 === 1) col2.push(q);
            else col3.push(q);
          });

          // Find conditional questions for each parent
          const getConditionals = (parentId) => 
            allQuestionsWithMeta.filter(q => q.isConditional && q.conditionalOn?.questionId === parentId && q.conditionMet);

          const needsInputField = (q) => {
            const ft = detectFieldType(q);
            return ['yesno', 'select', 'multiselect', 'number', 'enableSwitch', 'leaseTime', 'prefixNumber', 'dhcpRedundancy', 'dnsAggregateCalculated', 'dnsPerServerCalculated'].includes(ft);
          };

          // Check if question is freeform/text type
          const isFreeformQuestion = (q) => {
            const ft = detectFieldType(q);
            return ft === 'text' && !q.options;
          };

          // Render a single question cell - REFACTORED: Label above input, smooth expansions
          const renderQuestionCell = (q, colIndex, rowIndex) => {
            const hasNote = notes[q.id]?.trim();
            const isNoteExpanded = expandedNotes[q.id];
            const conditionals = getConditionals(q.id);
            const isFreeform = isFreeformQuestion(q);
            const hasInput = needsInputField(q);
            const hasAnswer = answers[q.id]?.trim();
            // For text-only questions, make entire cell clickable
            const isClickableRow = !hasInput;
            // Zebra striping removed for cleaner look
            const isEvenRow = rowIndex % 2 === 0;
            
            return (
              <div key={q.id} className="border-b border-border last:border-b-0">
                {/* Question cell - Home Assistant style */}
                <div 
                  className={`${compactMode ? 'px-4 py-3' : 'px-5 py-4'} ${isClickableRow ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={isClickableRow ? () => setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] })) : undefined}
                  data-testid={`question-${q.id}`}
                >
                  {/* Question Label */}
                  <div className={`flex items-start justify-between gap-3 ${compactMode ? 'mb-2' : 'mb-3'}`}>
                    <label className={`${compactMode ? 'text-sm' : 'text-[15px]'} font-semibold text-foreground leading-relaxed flex-1`}>
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
                    {conditionals.map(cq => (
                      <div 
                        key={cq.id} 
                        className="px-5 py-4 bg-secondary/30"
                        data-testid={`question-${cq.id}`}
                      >
                        <div className="text-xs text-[#00BD4D] mb-2 uppercase tracking-wide font-medium">
                          If {cq.conditionalOn.value}
                        </div>
                        <label className="text-sm font-semibold text-foreground block mb-2">
                          {cq.question}
                        </label>
                        {renderField(cq)}
                        {/* Warning shown when answer matches warningCondition */}
                        {cq.warningCondition && answers[cq.id] === cq.warningCondition.value && (
                          <div className="mt-2 flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="text-xs font-medium">{cq.warningCondition.message}</span>
                          </div>
                        )}
                      </div>
                    ))}
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
              className={`rounded-lg overflow-hidden transition-all duration-300
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
                  {!isSectionEnabled && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Out of Scope
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      clearSection(section);
                      toast({ title: "Cleared", description: `Answers for "${section}" cleared.` });
                    }}
                    data-testid={`clear-section-${section.replace(/\s/g, '-')}`}
                  >
                    Clear
                  </Button>
                  <span className={`text-xs font-medium transition-colors ${isSectionEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isSectionEnabled ? 'On' : 'Off'}
                  </span>
                  <Checkbox 
                    checked={isSectionEnabled} 
                    onCheckedChange={c => handleSectionToggle(section, c)} 
                    className="h-4 w-4" 
                    data-testid={`switch-section-${section.replace(/\s/g, '-')}`} 
                  />
                </div>
              </div>

              {/* 3-Column Grid for ALL Questions - REFACTORED: softer dividers, better spacing */}
              <div className={`transition-all duration-300 overflow-hidden ${!isCollapsed && isSectionEnabled ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {gridQuestions.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/20">
                    {/* Column 1 */}
                    <div className="bg-background">
                      {col1.map((q, i) => renderQuestionCell(q, 0, i))}
                    </div>
                    {/* Column 2 */}
                    <div className="bg-background">
                      {col2.map((q, i) => renderQuestionCell(q, 1, i))}
                    </div>
                    {/* Column 3 */}
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
                
                {/* Section-level Add Response for SmartFill */}
                <div className="px-5 py-4 border-t border-border">
                  <AddResponseField
                    questionId={`section-response-${section.replace(/\s/g, '-')}`}
                    value={sectionResponses[section] || ''}
                    onChange={v => setSectionResponses(p => ({ ...p, [section]: v }))}
                    onExamine={async (text, ctx) => {
                      // SmartFill: examine text and fill answers
                      toast({ title: "Examining content...", description: `Analyzing response for ${section}` });
                      // This would integrate with the AI SmartFill feature
                    }}
                    sectionContext={section}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Disable section confirmation dialog */}
        <AlertDialog open={!!sectionToDisable} onOpenChange={() => setSectionToDisable(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Section?</AlertDialogTitle>
              <AlertDialogDescription>This will clear all answers and notes for "{sectionToDisable}". This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDisableSection}>Disable & Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

      {/* Disable section confirmation dialog */}
      <AlertDialog open={!!sectionToDisable} onOpenChange={() => setSectionToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Section?</AlertDialogTitle>
            <AlertDialogDescription>This will clear all answers and notes for "{sectionToDisable}". This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableSection}>Disable & Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== Render section questions with subsection/group handling =====
function renderSectionQuestions(sectionQuestions, answers, expandedSubsections, setExpandedSubsections, expandedNotes, setExpandedNotes, notes, setNote, renderField) {
  let lastSubsection = null;
  let lastGroup = null;

  return sectionQuestions.map((q, index) => {
    if (q.hidden) return null;

    // Conditional visibility
    if (q.conditionalOn) {
      const parentAnswer = answers[q.conditionalOn.questionId] || '';
      const conditionMet = parentAnswer === q.conditionalOn.value || parentAnswer.split(',').map(v => v.trim()).includes(q.conditionalOn.value);
      if (!conditionMet) return null;
    }

    // Token Calculator subsection handling - always show content if expanded
    if (q.subsection === 'Token Calculator') {
      const isBetaExpanded = expandedSubsections['Token Calculator'] ?? true;
      // First Token Calculator question renders the header
      if (q.id === 'beta-asset-config') {
        return (
          <React.Fragment key={q.id}>
            <div className="mt-6 mb-2 pt-4 border-t" data-testid="subsection-token-calculator">
              <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-muted/30 rounded-md px-2 -mx-2"
                onClick={() => setExpandedSubsections(p => ({ ...p, 'Token Calculator': !isBetaExpanded }))}>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{q.subsection}</h4>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setExpandedSubsections(p => ({ ...p, 'Token Calculator': !isBetaExpanded })); }} className="ml-2">
                    {isBetaExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>
            {isBetaExpanded && renderField(q)}
          </React.Fragment>
        );
      }
      // Other Token Calculator questions - only show if expanded
      if (!isBetaExpanded) return null;
    }

    // Subsection header for "Sites & Locations" - render all in one row
    if (q.subsection === 'Sites & Locations') {
      const showHeader = q.subsection !== lastSubsection;
      lastSubsection = q.subsection;
      if (!showHeader) return null;
      const sitesQs = sectionQuestions.filter(sq => sq.subsection === 'Sites & Locations');
      return (
        <div key={`subsection-sites`} className="mt-6 mb-4 pt-4 border-t">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sites & Locations</h4>
          <div className="flex flex-wrap gap-4">
            {sitesQs.map(sq => (
              <div key={sq.id} className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">{sq.question}</Label>
                <Input type="number" value={answers[sq.id] || ''} onChange={e => renderField.__handleAnswerChange?.(sq.id, e.target.value) || null} className="w-28 h-8 text-right px-3" data-testid={`input-answer-${sq.id}`} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Regular subsection header
    if (q.subsection && q.subsection !== lastSubsection) {
      lastSubsection = q.subsection;
    }

    // Group header
    const showGroupHeader = q.group && q.group !== lastGroup;
    if (q.group) lastGroup = q.group;

    const hasNote = notes[q.id]?.trim().length > 0;
    const isNoteExpanded = expandedNotes[q.id];

    return (
      <div key={q.id}>
        {showGroupHeader && q.group && (
          <div className="mt-4 mb-2 pt-3 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{q.group}</h5>
          </div>
        )}
        <div className="space-y-2 py-3 border-b border-border/30 last:border-0" data-testid={`question-${q.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm font-medium">{q.question}</Label>
                {q.technicalOnly && <Badge variant="outline" className="text-xs">Technical</Badge>}
                {q.tooltip && (
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs"><p className="text-xs">{q.tooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                )}
              </div>
              {q.subsection && !['Sites & Locations', 'Token Calculator'].includes(q.subsection) && (
                <p className="text-xs text-muted-foreground mt-0.5">{q.subsection}{q.group ? ` / ${q.group}` : ''}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className={`h-7 w-7 ${hasNote ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] }))} data-testid={`toggle-note-${q.id}`}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
          {renderField(q)}
          {isNoteExpanded && (
            <Textarea value={notes[q.id] || ''} onChange={e => setNote(q.id, e.target.value)} placeholder="Add a note..." rows={2} className="mt-2 text-sm" data-testid={`note-${q.id}`} />
          )}
        </div>
      </div>
    );
  });
}

// ===== Token Total Display =====
function TokenTotalDisplay({ answers }) {
  const parse = (key, field, mult = 1) => { try { const d = JSON.parse(answers[key] || '{}'); return d.enabled ? (d[field] || 0) * mult : 0; } catch { return 0; } };
  const tdNiosTokens = (() => { try { const d = JSON.parse(answers['beta-td-nios-section'] || '{}'); return d.enabled && Array.isArray(d.tokens) ? d.tokens.reduce((s, t) => s + (t.tokens || 0) * (t.quantity || 1), 0) : 0; } catch { return 0; } })();
  const assetTokens = (() => { try { const d = JSON.parse(answers['beta-asset-config'] || '{}'); return d.tdCloudEnabled ? (d.totalAssets || 0) * 3 : 0; } catch { return 0; } })();
  const dossierTokens = parse('beta-dossier', 'quantity', 450);
  const lookalikeTokens = parse('beta-lookalike', 'quantity', 1200);
  const domainTakedownTokens = parse('beta-domain-takedown', 'quantity', 200);
  const socInsightsTokens = (() => { try { const d = JSON.parse(answers['beta-soc-insights'] || '{}'); return d.enabled ? d.calculatedTokens || 0 : 0; } catch { return 0; } })();
  const total = assetTokens + tdNiosTokens + dossierTokens + lookalikeTokens + domainTakedownTokens + socInsightsTokens;
  const items = [
    { label: 'TD Cloud', tokens: assetTokens, show: assetTokens > 0 },
    { label: 'TD for NIOS', tokens: tdNiosTokens, show: tdNiosTokens > 0 },
    { label: 'Dossier', tokens: dossierTokens, show: dossierTokens > 0 },
    { label: 'Lookalike', tokens: lookalikeTokens, show: lookalikeTokens > 0 },
    { label: 'Domain Takedown', tokens: domainTakedownTokens, show: domainTakedownTokens > 0 },
    { label: 'SOC Insights', tokens: socInsightsTokens, show: socInsightsTokens > 0 },
  ].filter(i => i.show);

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid="token-total-display">
      {items.length > 0 ? (<div className="space-y-1">
        {items.map(i => <div key={i.label} className="flex justify-between text-sm"><span className="text-muted-foreground">{i.label}</span><span className="font-mono">{i.tokens.toLocaleString()}</span></div>)}
        <div className="border-t pt-2 mt-2 flex justify-between font-semibold"><span>Total Tokens</span><span className="font-mono text-lg">{total.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm text-muted-foreground"><span>Token Packs (1,000/pack)</span><span className="font-mono">{Math.ceil(total / 1000).toLocaleString()}</span></div>
      </div>) : <p className="text-sm text-muted-foreground">Enable features above to see token summary</p>}
    </div>
  );
}
