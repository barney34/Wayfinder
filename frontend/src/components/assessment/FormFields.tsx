import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, X, Plus, AlertTriangle, Sparkles } from "lucide-react";

// ===== AutoNumInput: auto-sizes to content + padding =====
export function AutoNumInput({ value, onChange, onBlur, onKeyDown, placeholder = '0', className = '', 'data-testid': testId = undefined, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { 'data-testid'?: string }) {
  const len = String(value ?? '').length;
  const width = `${Math.max(7, len + 4)}ch`;
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      data-testid={testId}
      style={{ width }}
      className={`text-right px-2 h-8 text-sm rounded-md border border-border bg-background text-foreground transition-[width] duration-100 focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden [-moz-appearance:textfield] ${className}`}
      {...props}
    />
  );
}

// ===== GridMultiSelect (dropdown with grid options, selected as bubbles below) =====
export function GridMultiSelect({ questionId, options, value, onChange, allowFreeform, columns = 2 }) {
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
                    ? 'bg-accent/20 border-accent text-foreground'
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
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-foreground bg-accent/20 border border-accent/50 rounded-full whitespace-nowrap"
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
export function SyncedNumberField({ questionId, value, onChange, syncValue, syncLabel }) {
  const numValue = parseInt(value) || 0;
  const hasMismatch = syncValue !== undefined && numValue !== syncValue;

  return (
    <div className="flex items-center gap-2">
      <AutoNumInput
        value={value || ''}
        onChange={e => onChange((e.target as HTMLInputElement).value)}
        onBlur={e => onChange((e.target as HTMLInputElement).value)}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={hasMismatch ? 'border-yellow-500 bg-yellow-500/10' : ''}
        placeholder="0"
        data-testid={`input-answer-${questionId}`}
      />
      {hasMismatch && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
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
export function AddResponseField({ questionId, value, onChange, onExamine, sectionContext }) {
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
        className="text-sm text-primary dark:text-accent hover:text-primary dark:hover:text-accent/80 flex items-center gap-1"
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
export const AUTO_CALC_DEFAULTS = {
  dnsQpdPerIP: 3500,
  workdayHours: 9,
  peakQpsDivisor: 3,
};

// ===== InlineCheckboxSelect (for compact single-select) =====
export function InlineCheckboxSelect({ questionId, options, value, onChange }) {
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
export function InlineCheckboxMulti({ questionId, options, value, onChange }) {
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
export function SelectWithFreeform({ questionId, options, value, onChange }) {
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
export function MultiSelectField({ questionId, options, optionsWithPermission = [], optionsWithVendor = [], value, onChange, allowFreeform, compact = false }) {
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
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-foreground bg-accent/20 border border-accent/50 rounded-full whitespace-nowrap"
            >
              {val}
              <button onClick={() => removeValue(val)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
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
        <PopoverContent className="w-auto min-w-[300px] p-3 bg-card border-border" align="start">
          {hasSpecialOptions ? (
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {options.map(option => {
                  const needsPerm = optionsWithPermission.includes(option);
                  const isSelected = isOptionSelected(option);
                  return (
                    <div key={option} className="space-y-1">
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border whitespace-nowrap ${isSelected ? 'bg-accent/20 border-accent text-foreground' : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`multiselect-option-${questionId}-${option.replace(/\s/g, '-')}`}>
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
              {options.filter(opt => optionsWithVendor.includes(opt) && isOptionSelected(opt)).map(option => (
                <div key={`vendor-${option}`} className="mt-2 pl-2 border-l-2 border-accent/30 space-y-1">
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
            <div className="grid grid-cols-2 gap-2 mb-3">
              {options.map(option => {
                const isSelected = isOptionSelected(option);
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border whitespace-nowrap ${
                      isSelected
                        ? 'bg-accent/20 border-accent text-foreground'
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
export function detectFieldType(question) {
  if (question.type) return question.type;
  if (question.fieldType) return question.fieldType;

  const text = question.question.toLowerCase();
  if (text.startsWith('will ') || text.startsWith('is ') || text.startsWith('are ') || text.startsWith('do ') || text.includes('enabled?') || text.includes('in place?') || text.includes('implemented?')) return 'yesno';
  if (text.includes('number of') || text.includes('how many') || text.includes('percent') || text.includes('rate') || text.includes('estimated') || text.includes('total ')) return 'number';
  return 'text';
}
