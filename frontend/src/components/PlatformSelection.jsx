import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useDiscovery } from "@/contexts/DiscoveryContext";

const SOLUTIONS = [
  { key: 'nios', label: 'NIOS', description: 'Core DDI Platform', required: true },
  { key: 'feature-uddi', label: 'UDDI', description: 'Universal DDI' },
  { key: 'feature-security', label: 'Security', description: 'Threat Defense' },
  { key: 'feature-asset insights', label: 'Asset Insights', description: 'Network Discovery' },
];

export function PlatformSelection() {
  const { answers, setAnswer } = useDiscovery();
  
  // NIOS is always selected (it's the base platform)
  const platform = answers['ud-platform'] || 'NIOS (Physical/Virtual)';
  const isNIOS = platform.includes('NIOS') && !platform.includes('UDDI') && !platform.includes('Hybrid');
  const isUDDI = platform.includes('UDDI');
  const isHybrid = platform.includes('Hybrid');

  const getSolutionState = (key) => {
    if (key === 'nios') return true; // Always on
    return answers[key] === 'Yes';
  };

  const toggleSolution = (key) => {
    if (key === 'nios') return; // Can't toggle NIOS off
    const current = answers[key] === 'Yes';
    setAnswer(key, current ? 'No' : 'Yes');
  };

  const getWhyNotKey = (key) => `${key}-why-not`;

  return (
    <div className="bg-muted/20 rounded-lg p-4 border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Target Solutions</h3>
        <span className="text-xs text-muted-foreground">Select solutions being proposed</span>
      </div>

      {/* Solution Toggles */}
      <div className="flex flex-wrap gap-2">
        {SOLUTIONS.map(solution => {
          const isOn = getSolutionState(solution.key);
          const whyNotValue = answers[getWhyNotKey(solution.key)] || '';
          const needsWhyNot = !isOn && !solution.required;

          return (
            <div key={solution.key} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleSolution(solution.key)}
                disabled={solution.required}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  isOn 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-muted-foreground/30 hover:border-muted-foreground/50'
                } ${solution.required ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2">
                  {isOn && <Check className="h-4 w-4" />}
                  <span className="font-medium text-sm">{solution.label}</span>
                </div>
                <div className={`text-xs ${isOn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {solution.description}
                </div>
              </button>

              {/* Why Not field - appears below if solution is OFF */}
              {needsWhyNot && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Why not {solution.label}?</span>
                    {!whyNotValue && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-400">Required</Badge>}
                  </div>
                  <Textarea
                    value={whyNotValue}
                    onChange={e => setAnswer(getWhyNotKey(solution.key), e.target.value)}
                    placeholder={`Reason for not including ${solution.label}...`}
                    className="text-xs min-h-[60px] resize-none"
                    data-testid={`why-not-${solution.key}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Platform Mode Selection */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground mb-2">Deployment Model</div>
        <div className="flex gap-2">
          {[
            { value: 'NIOS (Physical/Virtual)', label: 'NIOS Only' },
            { value: 'UDDI', label: 'UDDI Only' },
            { value: 'Hybrid (NIOS + UDDI)', label: 'Hybrid' },
          ].map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setAnswer('ud-platform', mode.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                platform === mode.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`platform-${mode.label.toLowerCase().replace(' ', '-')}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
