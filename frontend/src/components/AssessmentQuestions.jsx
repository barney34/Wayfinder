import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, ChevronRight, X, Plus, Info, MessageSquare } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";
import {
  TDNiosSection, DossierInput, LookalikeInput, AssetConfigInput,
  SocInsightsInput, DomainTakedownInput, ReportingInput, UDDIEstimator,
  SiteConfiguration,
} from "./sizing";

// ===== SelectWithFreeform =====
function SelectWithFreeform({ questionId, options, value, onChange }) {
  const [isCustom, setIsCustom] = useState(() => value ? !options.includes(value) : false);
  return (
    <div className="flex gap-2">
      <Select value={isCustom ? '__custom__' : (value || '')} onValueChange={val => {
        if (val === '__custom__') { setIsCustom(true); onChange(''); }
        else { setIsCustom(false); onChange(val); }
      }}>
        <SelectTrigger data-testid={`select-answer-${questionId}`} className="flex-1"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          <SelectItem value="__custom__">Other (enter value)</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && <Input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Enter..." className="w-24" data-testid={`input-custom-${questionId}`} />}
    </div>
  );
}

// ===== MultiSelectField =====
function MultiSelectField({ questionId, options, optionsWithPermission = [], optionsWithVendor = [], value, onChange, allowFreeform }) {
  const [freeformInput, setFreeformInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [vendorInputs, setVendorInputs] = useState({});
  const selectedValues = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  const isOptionSelected = (option) => selectedValues.some(v => v === option || v.startsWith(option + ' (') || v.startsWith(option + ' - '));
  const getOptionPermission = (option) => { const m = selectedValues.find(v => v.startsWith(option + ' (')); return m?.includes('(R/W)') ? 'R/W' : m?.includes('(R/O)') ? 'R/O' : null; };
  const getOptionVendors = (option) => { const m = selectedValues.find(v => v.startsWith(option + ' - ')); return m ? m.substring(option.length + 3).split('|').map(v => v.trim()).filter(Boolean) : []; };
  const getFullValue = (option) => selectedValues.find(v => v === option || v.startsWith(option + ' (') || v.startsWith(option + ' - ')) || null;

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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal" data-testid={`multiselect-trigger-${questionId}`}>
            <span className="text-muted-foreground">{selectedValues.length === 0 ? 'Select options...' : `${selectedValues.length} selected`}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-2" align="start">
          <div className="space-y-1">
            {options.map(option => {
              const needsPerm = optionsWithPermission.includes(option);
              const needsVendor = optionsWithVendor.includes(option);
              const isSelected = isOptionSelected(option);
              return (
                <div key={option} className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50" data-testid={`multiselect-option-${questionId}-${option.replace(/\s/g, '-')}`}>
                    <Switch checked={isSelected} onCheckedChange={() => toggleOption(option)} onClick={e => e.stopPropagation()} />
                    <span className="text-xs cursor-pointer">{option}</span>
                    {needsVendor && isSelected && (
                      <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input placeholder="Add vendor..." value={vendorInputs[option] || ''} onChange={e => setVendorInputs(p => ({ ...p, [option]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVendor(option, vendorInputs[option]); } }} className="flex-1 h-7 text-sm" />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addVendor(option, vendorInputs[option])} disabled={!vendorInputs[option]?.trim()}><Plus className="h-3 w-3" /></Button>
                      </div>
                    )}
                    {needsPerm && isSelected && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant={getOptionPermission(option) === 'R/W' ? 'default' : 'outline'} className="h-6 px-2 text-xs" onClick={() => setPermission(option, 'R/W')}>R/W</Button>
                        <Button size="sm" variant={getOptionPermission(option) === 'R/O' ? 'default' : 'outline'} className="h-6 px-2 text-xs" onClick={() => setPermission(option, 'R/O')}>R/O</Button>
                      </div>
                    )}
                  </div>
                  {needsVendor && isSelected && getOptionVendors(option).length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-8 pb-1">
                      {getOptionVendors(option).map(vendor => (
                        <Badge key={vendor} variant="secondary" className="gap-1 pr-1 text-xs">{vendor}<button onClick={e => { e.stopPropagation(); removeVendor(option, vendor); }} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-2 w-2" /></button></Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allowFreeform && (
            <div className="border-t mt-2 pt-2"><div className="flex gap-2">
              <Input placeholder="Add other..." value={freeformInput} onChange={e => setFreeformInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeformValue(); } }} className="flex-1" data-testid={`multiselect-freeform-${questionId}`} />
              <Button size="icon" variant="outline" onClick={addFreeformValue} disabled={!freeformInput.trim()}><Plus className="h-4 w-4" /></Button>
            </div></div>
          )}
        </PopoverContent>
      </Popover>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map(val => <Badge key={val} variant="secondary" className="gap-1 pr-1">{val}<button onClick={() => removeValue(val)} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button></Badge>)}
        </div>
      )}
    </div>
  );
}

// ===== Field Type Detection =====
function detectFieldType(question) {
  if (question.fieldType) return question.fieldType;
  const text = question.question.toLowerCase();
  if (text.startsWith('will ') || text.startsWith('is ') || text.startsWith('are ') || text.startsWith('do ') || text.includes('enabled?') || text.includes('in place?') || text.includes('implemented?')) return 'yesno';
  if (text.includes('number of') || text.includes('how many') || text.includes('percent') || text.includes('rate') || text.includes('estimated') || text.includes('total ')) return 'number';
  return 'text';
}

// ===== Main AssessmentQuestions =====
export function AssessmentQuestions({ questions, onAnswerChange, compact = false }) {
  const { answers, notes, defaultAnswers, setAnswer, setNote, enabledSections, toggleSection, enableAllSections, disableAllSections, clearSection, leaseTimeUnits, setLeaseTimeUnit } = useDiscovery();
  const [expandedNotes, setExpandedNotes] = useState({});
  const [sectionToDisable, setSectionToDisable] = useState(null);
  const [expandedSubsections, setExpandedSubsections] = useState({});
  const { toast } = useToast();

  const handleAnswerChange = (questionId, value) => {
    setAnswer(questionId, value);
    onAnswerChange?.(questionId, value);
    // Reset dependent questions
    if (questionId === 'beta-enable' && value === 'Yes') {
      setAnswer('beta-td-nios-section', JSON.stringify({ enabled: false, collapsed: false, tokens: [] }));
      setAnswer('beta-dossier', JSON.stringify({ enabled: false, quantity: 0 }));
      setAnswer('beta-lookalike', JSON.stringify({ enabled: false, quantity: 0 }));
      setAnswer('beta-soc-insights', JSON.stringify({ enabled: false, multiplier: 0.35, overrideMultiplier: false, calculatedTokens: 0 }));
    }
    if (questionId === 'beta-enable' && value === 'No') {
      setAnswer('beta-td-nios-section', JSON.stringify({ enabled: false, collapsed: false, tokens: [] }));
      setAnswer('beta-dossier', JSON.stringify({ enabled: false, quantity: 0 }));
      setAnswer('beta-lookalike', JSON.stringify({ enabled: false, quantity: 0 }));
      setAnswer('beta-soc-insights', JSON.stringify({ enabled: false, multiplier: 0.35, overrideMultiplier: false, calculatedTokens: 0 }));
    }
  };

  const handleSectionToggle = (section, enabled) => {
    if (!enabled) setSectionToDisable(section);
    else toggleSection(section);
  };

  const confirmDisableSection = () => {
    if (sectionToDisable) { clearSection(sectionToDisable); toast({ title: "Section Disabled", description: `All data for "${sectionToDisable}" has been cleared.` }); setSectionToDisable(null); }
  };

  const handleBetaSubsectionToggle = (enabled) => {
    setAnswer('beta-enable', enabled ? 'Yes' : 'No');
    if (enabled) setExpandedSubsections(p => ({ ...p, 'Token Calculator': true }));
    else setExpandedSubsections(p => ({ ...p, 'Token Calculator': false }));
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

  // Group questions by section
  const grouped = questions.reduce((acc, q) => { if (!acc[q.section]) acc[q.section] = []; acc[q.section].push(q); return acc; }, {});
  const sections = Object.keys(grouped);
  const allEnabled = sections.every(s => enabledSections[s] !== false);

  // Render a single question's field (compact mode adjusts sizing)
  const renderField = (q) => {
    const fieldType = detectFieldType(q);
    const currentValue = answers[q.id] ?? q.defaultValue ?? '';
    const inputClass = compact ? "h-8 text-sm" : "";
    const selectClass = compact ? "h-8 text-sm" : "";

    switch (fieldType) {
      case 'yesno':
        return (
          <div className="flex items-center gap-2">
            <Button variant={currentValue === 'Yes' ? 'default' : 'outline'} size="sm" className={compact ? "h-7 px-3 text-xs" : ""} onClick={() => handleAnswerChange(q.id, 'Yes')} data-testid={`btn-yes-${q.id}`}>Yes</Button>
            <Button variant={currentValue === 'No' ? 'default' : 'outline'} size="sm" className={compact ? "h-7 px-3 text-xs" : ""} onClick={() => handleAnswerChange(q.id, 'No')} data-testid={`btn-no-${q.id}`}>No</Button>
          </div>
        );
      case 'select':
        return q.allowFreeform ? <SelectWithFreeform questionId={q.id} options={q.options || []} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} />
          : <Select value={currentValue} onValueChange={v => handleAnswerChange(q.id, v)}>
              <SelectTrigger className={selectClass} data-testid={`select-answer-${q.id}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{(q.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>;
      case 'multiselect':
        return <MultiSelectField questionId={q.id} options={q.options || []} optionsWithPermission={q.optionsWithPermission} optionsWithVendor={q.optionsWithVendor} value={currentValue} onChange={v => handleAnswerChange(q.id, v)} allowFreeform={q.allowFreeform} />;
      case 'number':
        return <Input type="number" value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} className={`${compact ? 'w-24 h-8 text-sm' : 'max-w-xs'}`} placeholder="0" data-testid={`input-answer-${q.id}`} />;
      case 'leaseTime':
        return (
          <div className="flex items-center gap-2">
            <Input type="number" step="any" value={getDisplayLeaseValue(q.id, currentValue)} onChange={e => handleLeaseTimeChange(q.id, e.target.value)} className={compact ? "w-20 h-8 text-sm" : "w-24"} data-testid={`input-answer-${q.id}`} />
            <Select value={getLeaseTimeUnit(q.id)} onValueChange={v => setLeaseTimeUnit(q.id, v)}>
              <SelectTrigger className={compact ? "w-24 h-8 text-sm" : "w-28"}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="seconds">seconds</SelectItem><SelectItem value="minutes">minutes</SelectItem><SelectItem value="hours">hours</SelectItem><SelectItem value="days">days</SelectItem></SelectContent>
            </Select>
          </div>
        );
      case 'enableSwitch':
        return (
          <div className="flex items-center gap-2">
            <Switch checked={currentValue === 'Yes'} onCheckedChange={c => handleAnswerChange(q.id, c ? 'Yes' : 'No')} data-testid={`switch-answer-${q.id}`} />
            <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{currentValue === 'Yes' ? 'Enabled' : 'Disabled'}</span>
          </div>
        );
      case 'ipCalculated':
      case 'dnsAggregateCalculated':
      case 'dnsPerServerCalculated':
        return <div className="space-y-1"><Input type="text" value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} className={compact ? "w-32 h-8 text-sm" : "max-w-xs"} placeholder="Auto or manual" data-testid={`input-answer-${q.id}`} />{!compact && <p className="text-xs text-muted-foreground">Auto-calculated or override manually</p>}</div>;
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
      default:
        return q.question?.length > 80
          ? <Textarea value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Enter your answer..." rows={compact ? 2 : 3} className={compact ? "text-sm" : ""} data-testid={`textarea-answer-${q.id}`} />
          : <Input value={currentValue} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Enter..." className={inputClass} data-testid={`input-answer-${q.id}`} />;
    }
  };

  // Compact 2-column layout for Discovery
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Master Enable All */}
        <div className="flex items-center gap-2">
          <Switch id="enable-all-sections" checked={allEnabled} onCheckedChange={handleToggleAllSections} data-testid="switch-enable-all-sections" />
          <Label htmlFor="enable-all-sections" className="text-xs font-medium cursor-pointer">Enable All Sections</Label>
        </div>

        {Object.entries(grouped).map(([section, sectionQuestions]) => {
          const isSectionEnabled = enabledSections[section] !== false;
          
          // Filter visible questions
          const visibleQuestions = sectionQuestions.filter(q => {
            if (q.hidden) return false;
            if (q.conditionalOn) {
              const parentAnswer = answers[q.conditionalOn.questionId] || '';
              const conditionMet = parentAnswer === q.conditionalOn.value || parentAnswer.split(',').map(v => v.trim()).includes(q.conditionalOn.value);
              if (!conditionMet) return false;
            }
            return true;
          });

          // Separate into short (2-col) and long (full-width) questions
          const shortQuestions = visibleQuestions.filter(q => {
            const ft = detectFieldType(q);
            return ['yesno', 'select', 'number', 'enableSwitch'].includes(ft) || q.question.length < 60;
          });
          const longQuestions = visibleQuestions.filter(q => {
            const ft = detectFieldType(q);
            return !['yesno', 'select', 'number', 'enableSwitch'].includes(ft) && q.question.length >= 60;
          });

          return (
            <div key={section} className={`border rounded-lg bg-card ${!isSectionEnabled ? 'opacity-50' : ''}`} data-testid={`section-${section.replace(/\s/g, '-')}`}>
              {/* Section Header - Sticky */}
              <div className="sticky top-0 z-10 bg-card border-b px-4 py-2 flex items-center justify-between rounded-t-lg">
                <h3 className="text-sm font-semibold">{section}</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={isSectionEnabled} onCheckedChange={c => handleSectionToggle(section, c)} data-testid={`switch-section-${section.replace(/\s/g, '-')}`} />
                  <span className="text-xs text-muted-foreground">{isSectionEnabled ? 'On' : 'Off'}</span>
                </div>
              </div>

              {/* Questions Grid */}
              {isSectionEnabled && (
                <div className="p-3 space-y-3">
                  {/* 2-Column Grid for Short Questions */}
                  {shortQuestions.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
                      {shortQuestions.map(q => (
                        <div key={q.id} className="flex items-center gap-2 py-1.5 border-b border-border/30" data-testid={`question-${q.id}`}>
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs font-medium truncate block" title={q.question}>{q.question}</Label>
                          </div>
                          <div className="flex-shrink-0">
                            {renderField(q)}
                          </div>
                          <Button variant="ghost" size="icon" className={`h-6 w-6 flex-shrink-0 ${notes[q.id]?.trim() ? 'text-primary' : 'text-muted-foreground/50'}`}
                            onClick={() => setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] }))} data-testid={`toggle-note-${q.id}`}>
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Full-Width for Long Questions */}
                  {longQuestions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {longQuestions.map(q => (
                        <div key={q.id} className="space-y-1" data-testid={`question-${q.id}`}>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">{q.question}</Label>
                            <Button variant="ghost" size="icon" className={`h-6 w-6 ${notes[q.id]?.trim() ? 'text-primary' : 'text-muted-foreground/50'}`}
                              onClick={() => setExpandedNotes(p => ({ ...p, [q.id]: !p[q.id] }))} data-testid={`toggle-note-${q.id}`}>
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </div>
                          {renderField(q)}
                          {expandedNotes[q.id] && (
                            <Textarea value={notes[q.id] || ''} onChange={e => setNote(q.id, e.target.value)} placeholder="Add a note..." rows={1} className="text-xs" data-testid={`note-${q.id}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded Notes for Short Questions */}
                  {shortQuestions.filter(q => expandedNotes[q.id]).map(q => (
                    <div key={`note-${q.id}`} className="pl-2 border-l-2 border-primary/30">
                      <p className="text-xs text-muted-foreground mb-1">{q.question}</p>
                      <Textarea value={notes[q.id] || ''} onChange={e => setNote(q.id, e.target.value)} placeholder="Add a note..." rows={1} className="text-xs" data-testid={`note-${q.id}`} />
                    </div>
                  ))}
                </div>
              )}
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
      {/* Master Enable All */}
      <div className="flex items-center gap-2 px-2">
        <Switch id="enable-all-sections" checked={allEnabled} onCheckedChange={handleToggleAllSections} data-testid="switch-enable-all-sections" />
        <Label htmlFor="enable-all-sections" className="text-xs font-medium cursor-pointer">Enable All Sections</Label>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {Object.entries(grouped).map(([section, sectionQuestions]) => {
          const isSectionEnabled = enabledSections[section] !== false;
          return (
            <AccordionItem key={section} value={section} className={`border rounded-md bg-card ${!isSectionEnabled ? 'opacity-50' : ''}`} data-testid={`section-${section.replace(/\s/g, '-')}`}>
              <AccordionTrigger className="px-6 py-4 text-base font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>{section}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch id={`section-toggle-${section}`} checked={isSectionEnabled} onCheckedChange={c => handleSectionToggle(section, c)} data-testid={`switch-section-${section.replace(/\s/g, '-')}`} />
                    <Label htmlFor={`section-toggle-${section}`} className="text-xs font-normal cursor-pointer">{isSectionEnabled ? 'Enabled' : 'Disabled'}</Label>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className={`space-y-4 ${!isSectionEnabled ? 'pointer-events-none' : ''}`}>
                  {renderSectionQuestions(sectionQuestions, answers, expandedSubsections, setExpandedSubsections, handleBetaSubsectionToggle, expandedNotes, setExpandedNotes, notes, setNote, renderField)}
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
function renderSectionQuestions(sectionQuestions, answers, expandedSubsections, setExpandedSubsections, handleBetaSubsectionToggle, expandedNotes, setExpandedNotes, notes, setNote, renderField) {
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

    // Token Calculator subsection handling
    if (q.subsection === 'Token Calculator' && q.id !== 'beta-enable') {
      const isBetaEnabled = answers['beta-enable'] === 'Yes';
      const isBetaExpanded = expandedSubsections['Token Calculator'] ?? isBetaEnabled;
      if (!isBetaEnabled || !isBetaExpanded) return null;
    }

    // beta-enable renders as subsection header
    if (q.id === 'beta-enable') {
      const isBetaEnabled = answers['beta-enable'] === 'Yes';
      const isBetaExpanded = expandedSubsections['Token Calculator'] ?? isBetaEnabled;
      return (
        <div key={q.id} className="mt-6 mb-2 pt-4 border-t" data-testid="subsection-token-calculator">
          <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-muted/30 rounded-md px-2 -mx-2"
            onClick={() => isBetaEnabled && setExpandedSubsections(p => ({ ...p, 'Token Calculator': !isBetaExpanded }))}>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{q.subsection}</h4>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Switch checked={isBetaEnabled} onCheckedChange={handleBetaSubsectionToggle} data-testid="switch-beta-enable" />
              <Label className="text-xs font-normal cursor-pointer">Enabled</Label>
              {isBetaEnabled && <button onClick={e => { e.stopPropagation(); setExpandedSubsections(p => ({ ...p, 'Token Calculator': !isBetaExpanded })); }} className="ml-2">
                {isBetaExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>}
            </div>
          </div>
        </div>
      );
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
                <Input type="number" value={answers[sq.id] || ''} onChange={e => renderField.__handleAnswerChange?.(sq.id, e.target.value) || null} className="w-20 h-8" data-testid={`input-answer-${sq.id}`} />
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
