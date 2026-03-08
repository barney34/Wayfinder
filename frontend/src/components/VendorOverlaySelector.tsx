import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CloudVendorSettingsProps {
  platformsValue: string;
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}

function YesNo({ id, answers, onAnswer }: { id: string; answers: Record<string, string>; onAnswer: (id: string, v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      <Button variant={answers[id] === 'Yes' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3"
        onClick={() => onAnswer(id, answers[id] === 'Yes' ? '' : 'Yes')}>Yes</Button>
      <Button variant={answers[id] === 'No' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3"
        onClick={() => onAnswer(id, answers[id] === 'No' ? '' : 'No')}>No</Button>
    </div>
  );
}

export function CloudVendorSettings({ platformsValue, answers, onAnswer }: CloudVendorSettingsProps) {
  const selected = (platformsValue || '').split(',').map(v => v.trim()).filter(Boolean);
  const hasCloudflare = selected.includes('Cloudflare');
  const hasAkamai = selected.includes('Akamai');

  useEffect(() => {
    if (hasCloudflare && !answers['uddi-1']) onAnswer('uddi-1', 'Yes');
  }, [hasCloudflare]);

  if (!hasCloudflare && !hasAkamai) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {hasCloudflare && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/60">
          <span className="text-xs font-medium text-foreground">Cloudflare — zone management?</span>
          <YesNo id="uddi-1" answers={answers} onAnswer={onAnswer} />
        </div>
      )}
      {hasAkamai && (
        <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Akamai — zone management?</span>
            <YesNo id="uddi-4" answers={answers} onAnswer={onAnswer} />
          </div>
          {answers['uddi-4'] === 'Yes' && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Akamai — zone transfer?</span>
              <YesNo id="uddi-5" answers={answers} onAnswer={onAnswer} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
