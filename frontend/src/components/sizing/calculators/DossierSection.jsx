import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { safeParseDossier } from '../parsers';
import { DOSSIER_TOKENS_PER_UNIT } from '../constants';

export function DossierInput({ value, onChange, questionId }) {
  const data = safeParseDossier(value);
  const qpd = data.quantity * 25;
  const tokens = data.quantity * DOSSIER_TOKENS_PER_UNIT;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">No</span>
        <Switch checked={data.enabled} onCheckedChange={(checked) => onChange(JSON.stringify({ enabled: checked, quantity: checked ? (data.quantity || 1) : 0 }))} data-testid={`switch-answer-${questionId}`} />
        <span className="text-xs text-muted-foreground">Yes</span>
      </div>
      {data.enabled && (
        <>
          <Input type="number" min="1" value={data.quantity || ''} onChange={(e) => onChange(JSON.stringify({ enabled: data.enabled, quantity: parseInt(e.target.value) || 0 }))} placeholder="Qty" className="w-20" data-testid={`input-quantity-${questionId}`} />
          {data.quantity > 0 && <span className="text-sm text-muted-foreground">= {qpd} QPD ({tokens.toLocaleString()} tokens)</span>}
        </>
      )}
    </div>
  );
}
