import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Info, TrendingUp, Gift } from "lucide-react";
import { safeParseDossier } from '../parsers';
import { DOSSIER_TOKENS_PER_UNIT } from '../constants';

// Dossier tier thresholds for free upsizing
const DOSSIER_TIERS = [
  { minQty: 1, maxQty: 1, qpd: 25, tokens: 540, tier: 'Starter' },
  { minQty: 2, maxQty: 4, qpd: 100, tokens: 2160, tier: 'Standard' },
  { minQty: 5, maxQty: 9, qpd: 250, tokens: 5400, tier: 'Professional' },
  { minQty: 10, maxQty: 19, qpd: 500, tokens: 10800, tier: 'Business' },
  { minQty: 20, maxQty: 49, qpd: 1250, tokens: 27000, tier: 'Enterprise' },
  { minQty: 50, maxQty: Infinity, qpd: 2500, tokens: 54000, tier: 'Unlimited' },
];

// Get current tier based on quantity
function getCurrentTier(quantity) {
  return DOSSIER_TIERS.find(t => quantity >= t.minQty && quantity <= t.maxQty);
}

// Get next tier for potential free upsize
function getNextTier(quantity) {
  const currentTierIdx = DOSSIER_TIERS.findIndex(t => quantity >= t.minQty && quantity <= t.maxQty);
  if (currentTierIdx >= 0 && currentTierIdx < DOSSIER_TIERS.length - 1) {
    return DOSSIER_TIERS[currentTierIdx + 1];
  }
  return null;
}

// Calculate how many more units needed to reach next tier
function getUnitsToNextTier(quantity) {
  const currentTierIdx = DOSSIER_TIERS.findIndex(t => quantity >= t.minQty && quantity <= t.maxQty);
  if (currentTierIdx >= 0 && currentTierIdx < DOSSIER_TIERS.length - 1) {
    const nextTier = DOSSIER_TIERS[currentTierIdx + 1];
    return nextTier.minQty - quantity;
  }
  return 0;
}

export function DossierInput({ value, onChange, questionId }) {
  const data = safeParseDossier(value);
  const qpd = data.quantity * 25;
  const tokens = data.quantity * DOSSIER_TOKENS_PER_UNIT;
  
  const currentTier = getCurrentTier(data.quantity || 0);
  const nextTier = getNextTier(data.quantity || 0);
  const unitsToNext = getUnitsToNextTier(data.quantity || 0);
  
  // Check if close to next tier (within 2 units) - FREE UPSIZE opportunity
  const canUpsize = nextTier && unitsToNext <= 2 && unitsToNext > 0;
  const upsizeTokensSaved = canUpsize ? (unitsToNext * DOSSIER_TOKENS_PER_UNIT) : 0;

  return (
    <div className="space-y-3" data-testid={`dossier-section-${questionId}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">No</span>
          <Switch 
            checked={data.enabled} 
            onCheckedChange={(checked) => onChange(JSON.stringify({ enabled: checked, quantity: checked ? (data.quantity || 1) : 0 }))} 
            data-testid={`switch-answer-${questionId}`} 
          />
          <span className="text-xs text-muted-foreground">Yes</span>
        </div>
        {data.enabled && (
          <>
            <Input 
              type="number" 
              min="1" 
              value={data.quantity || ''} 
              onChange={(e) => onChange(JSON.stringify({ enabled: data.enabled, quantity: parseInt(e.target.value) || 0 }))} 
              placeholder="Qty" 
              className="w-20" 
              data-testid={`input-quantity-${questionId}`} 
            />
            {data.quantity > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">= {qpd.toLocaleString()} QPD</span>
                <Badge variant="secondary" className="font-mono">{tokens.toLocaleString()} tokens</Badge>
                {currentTier && <Badge variant="outline">{currentTier.tier}</Badge>}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Free Upsize Opportunity */}
      {data.enabled && canUpsize && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-green-700 dark:text-green-400">Free Upsize Available!</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add <strong>{unitsToNext} more unit{unitsToNext > 1 ? 's' : ''}</strong> to reach the <strong>{nextTier.tier}</strong> tier 
                  ({nextTier.qpd.toLocaleString()} QPD) at <strong>no additional token cost</strong>.
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span>Current: {data.quantity} units → {tokens.toLocaleString()} tokens</span>
                  <span className="text-green-600 dark:text-green-400">
                    Upsize to {nextTier.minQty} units → Still {tokens.toLocaleString()} tokens (save {upsizeTokensSaved.toLocaleString()} tokens!)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tier Info */}
      {data.enabled && data.quantity > 0 && !canUpsize && nextTier && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>
            Add {unitsToNext} more unit{unitsToNext > 1 ? 's' : ''} to reach {nextTier.tier} tier ({nextTier.qpd.toLocaleString()} QPD)
          </span>
        </div>
      )}
    </div>
  );
}
