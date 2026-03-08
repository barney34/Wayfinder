import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, MessageSquare, Info } from "lucide-react";

// ===== Render section questions with subsection/group handling =====
export function renderSectionQuestions(sectionQuestions, answers, expandedSubsections, setExpandedSubsections, expandedNotes, setExpandedNotes, notes, setNote, renderField) {
  let lastSubsection = null;
  let lastGroup = null;

  return sectionQuestions.map((q, index) => {
    if (q.hidden) return null;

    if (q.conditionalOn) {
      const parentAnswer = answers[q.conditionalOn.questionId] || '';
      const conditionMet = parentAnswer === q.conditionalOn.value || parentAnswer.split(',').map(v => v.trim()).includes(q.conditionalOn.value);
      if (!conditionMet) return null;
    }

    if (q.subsection === 'Token Calculator') {
      const isBetaExpanded = expandedSubsections['Token Calculator'] ?? true;
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
      if (!isBetaExpanded) return null;
    }

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

    if (q.subsection && q.subsection !== lastSubsection) {
      lastSubsection = q.subsection;
    }

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
export function TokenTotalDisplay({ answers }) {
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
