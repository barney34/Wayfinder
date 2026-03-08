import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getAssetsPerWorker } from "@/lib/tokenData";
import { safeParseSocInsights, safeParseAssetConfig } from '../parsers';

export function SocInsightsInput({ value, onChange, questionId, knowledgeWorkers: knowledgeWorkersValue, assetConfigValue }) {
  const data = safeParseSocInsights(value);
  const knowledgeWorkers = parseInt(knowledgeWorkersValue) || 0;
  const assetConfig = safeParseAssetConfig(assetConfigValue);
  const tierAPW = getAssetsPerWorker(knowledgeWorkers);
  const effectiveAPW = assetConfig.override ? assetConfig.assetsPerWorker : tierAPW;
  const totalAssets = assetConfig.totalAssets > 0 ? assetConfig.totalAssets : Math.round(knowledgeWorkers * effectiveAPW);
  const tdCloudTokens = totalAssets * 3;
  const multiplierToUse = data.overrideMultiplier ? data.multiplier : 0.35;
  const currentTokens = Math.round(tdCloudTokens * multiplierToUse);
  const prevTokensRef = useRef(data.calculatedTokens);

  useEffect(() => {
    if (data.enabled && currentTokens !== prevTokensRef.current) {
      prevTokensRef.current = currentTokens;
      onChange(JSON.stringify({ enabled: data.enabled, multiplier: multiplierToUse, overrideMultiplier: data.overrideMultiplier, calculatedTokens: currentTokens }));
    }
  }, [data.enabled, currentTokens, multiplierToUse, data.overrideMultiplier, onChange]);

  const tdCloudEnabled = assetConfig.tdCloudEnabled;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">No</span>
        <Switch checked={data.enabled} onCheckedChange={(checked) => onChange(JSON.stringify({ enabled: checked, multiplier: multiplierToUse, overrideMultiplier: data.overrideMultiplier, calculatedTokens: checked ? currentTokens : 0 }))} disabled={!tdCloudEnabled} data-testid={`switch-answer-${questionId}`} />
        <span className="text-xs text-muted-foreground">Yes</span>
      </div>
      {!tdCloudEnabled && <span className="text-xs text-muted-foreground italic">(Requires TD Cloud)</span>}
      {data.enabled && tdCloudEnabled && (
        <span className="text-sm text-muted-foreground">{totalAssets.toLocaleString()} assets x {multiplierToUse} = {currentTokens.toLocaleString()} tokens</span>
      )}
    </div>
  );
}
