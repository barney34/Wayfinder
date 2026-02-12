import { AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useDiscovery } from "@/contexts/DiscoveryContext";

const SOLUTIONS = [
  { key: 'feature-nios', label: 'NIOS', description: 'Core DDI', noWhyNot: true },
  { key: 'feature-uddi', label: 'UDDI', description: 'Universal DDI' },
  { key: 'feature-security', label: 'Security', description: 'Threat Defense' },
  { key: 'feature-asset insights', label: 'Asset Insights', description: 'Network Discovery' },
];

// Target Solutions - for Discovery tab
export function TargetSolutions() {
  const { answers, setAnswer } = useDiscovery();

  const getSolutionState = (key) => {
    return answers[key] === 'Yes';
  };

  const toggleSolution = (key) => {
    const current = answers[key] === 'Yes';
    setAnswer(key, current ? 'No' : 'Yes');
  };

  const getWhyNotKey = (key) => `${key}-why-not`;

  return (
    <div className="bg-muted/20 rounded-lg p-3 border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Target Solutions</h3>
        <span className="text-xs text-muted-foreground">What are you proposing?</span>
      </div>

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
                className={`px-3 py-1.5 rounded-lg border-2 transition-all ${
                  isOn 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-muted-foreground/30 hover:border-muted-foreground/50'
                } ${solution.required ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-1.5">
                  {isOn && <Check className="h-3.5 w-3.5" />}
                  <span className="font-medium text-xs">{solution.label}</span>
                </div>
              </button>

              {needsWhyNot && (
                <div className="mt-1.5 space-y-1 max-w-[200px]">
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Why not?</span>
                    {!whyNotValue && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-400">Required</Badge>}
                  </div>
                  <Textarea
                    value={whyNotValue}
                    onChange={e => setAnswer(getWhyNotKey(solution.key), e.target.value)}
                    placeholder={`Why not ${solution.label}?`}
                    className="text-xs min-h-[50px] resize-none"
                    data-testid={`why-not-${solution.key}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Deployment Model - for Sizing tab
export function DeploymentModel() {
  const { answers, setAnswer } = useDiscovery();
  const platform = answers['ud-platform'] || 'NIOS (Physical/Virtual)';

  const MODES = [
    { value: 'NIOS (Physical/Virtual)', label: 'NIOS Only', description: 'Physical/Virtual appliances' },
    { value: 'UDDI', label: 'UDDI Only', description: 'Cloud-native DDI' },
    { value: 'Hybrid (NIOS + UDDI)', label: 'Hybrid', description: 'NIOS + UDDI combined' },
  ];

  return (
    <div className="bg-muted/20 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Deployment Model</h3>
        <span className="text-xs text-muted-foreground">How will it be deployed?</span>
      </div>

      <div className="flex gap-2">
        {MODES.map(mode => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setAnswer('ud-platform', mode.value)}
            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all text-left ${
              platform === mode.value 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background border-muted-foreground/30 hover:border-muted-foreground/50'
            }`}
            data-testid={`platform-${mode.label.toLowerCase().replace(' ', '-')}`}
          >
            <div className="font-medium text-sm">{mode.label}</div>
            <div className={`text-xs ${platform === mode.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {mode.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
