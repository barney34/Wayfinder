import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, ChevronUp, Info } from "lucide-react";
import { getAssetTier } from "@/lib/tokenData";
import { safeParseAssetConfig } from '../parsers';

export function AssetConfigInput({ value, onChange, questionId, knowledgeWorkers: knowledgeWorkersValue }) {
  const data = safeParseAssetConfig(value);
  const baseKW = parseInt(knowledgeWorkersValue) || 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const effectiveKW = data.override && data.knowledgeWorkersOverride > 0 ? data.knowledgeWorkersOverride : baseKW;
  const tier = getAssetTier(effectiveKW);
  const effectiveAPW = data.override ? data.assetsPerWorker : tier.assetsPerWorker;
  const effectiveVPW = data.overrideVerifiedPerKW ? data.customVerifiedPerKW : tier.verifiedPerWorker;
  const totalAssets = Math.round(effectiveKW * effectiveAPW);
  const verifiedAssets = Math.ceil(effectiveKW * effectiveVPW);
  const unverifiedAssets = totalAssets - verifiedAssets;
  const estAPKW = data.overrideAssetsPerKW ? data.customAssetsPerKW : tier.assetsPerWorker;
  // Growth buffer — always applied, default 15%, overridable
  const growthBufferPct = data.growthBufferOverride ? (data.growthBuffer ?? 0.15) : 0.15;
  const bufferedAssets = Math.round(totalAssets * (1 + growthBufferPct));
  const bufferedTokens = bufferedAssets * 3;

  const prevDataRef = useRef({ effectiveKW, totalAssets, verifiedAssets, unverifiedAssets });

  useEffect(() => {
    const prev = prevDataRef.current;
    if (effectiveKW !== prev.effectiveKW || totalAssets !== prev.totalAssets || verifiedAssets !== prev.verifiedAssets || unverifiedAssets !== prev.unverifiedAssets || prev.totalAssets === 0) {
      prevDataRef.current = { effectiveKW, totalAssets, verifiedAssets, unverifiedAssets };
      onChange(JSON.stringify({ ...data, assetsPerWorker: effectiveAPW, verifiedPerWorker: effectiveVPW, totalAssets, verifiedAssets, unverifiedAssets }));
    }
  }, [effectiveKW, totalAssets, verifiedAssets, unverifiedAssets]);

  const handleOverrideToggle = (checked) => {
    if (!checked) {
      const defaultTier = getAssetTier(baseKW);
      onChange(JSON.stringify({ assetsPerWorker: defaultTier.assetsPerWorker, override: false, knowledgeWorkersOverride: 0, verifiedPerWorker: defaultTier.verifiedPerWorker, unverifiedPerWorker: defaultTier.unverifiedPerWorker, totalAssets: Math.round(baseKW * defaultTier.assetsPerWorker), verifiedAssets: Math.ceil(baseKW * defaultTier.verifiedPerWorker), unverifiedAssets: Math.round(baseKW * defaultTier.assetsPerWorker) - Math.ceil(baseKW * defaultTier.verifiedPerWorker), growthBufferEnabled: false, growthBuffer: 0.15, tdCloudEnabled: data.tdCloudEnabled, overrideAssetsPerKW: false, overrideVerifiedPerKW: false, overrideUnverifiedPerKW: false, customAssetsPerKW: 0, customVerifiedPerKW: 0, customUnverifiedPerKW: 0 }));
    } else {
      onChange(JSON.stringify({ ...data, override: true, knowledgeWorkersOverride: baseKW }));
    }
  };

  const handleTdCloudToggle = (checked) => {
    if (!checked) onChange(JSON.stringify({ ...data, tdCloudEnabled: false, override: false, knowledgeWorkersOverride: 0, growthBufferOverride: false, growthBuffer: 0.15, overrideAssetsPerKW: false, overrideVerifiedPerKW: false, overrideUnverifiedPerKW: false, customAssetsPerKW: 0, customVerifiedPerKW: 0, customUnverifiedPerKW: 0 }));
    else { setIsExpanded(true); onChange(JSON.stringify({ ...data, tdCloudEnabled: true })); }
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-md" data-testid={`asset-config-${questionId}`}>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 justify-start -mx-1" data-testid={`td-cloud-toggle-${questionId}`}>
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">TD Cloud</span>
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">No</span>
          <Switch checked={data.tdCloudEnabled} onCheckedChange={handleTdCloudToggle} data-testid={`switch-td-cloud-enabled-${questionId}`} />
          <span className="text-xs text-muted-foreground">Yes</span>
        </div>
      </div>
      {isExpanded && data.tdCloudEnabled && (
        <div className="space-y-3 pl-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium min-w-[200px]">Knowledge Workers</span>
            {data.override ? (
              <Input type="number" min="0" value={data.knowledgeWorkersOverride || baseKW} onChange={(e) => { const kw = parseInt(e.target.value) || 0; const t = getAssetTier(kw); onChange(JSON.stringify({ ...data, knowledgeWorkersOverride: kw, assetsPerWorker: t.assetsPerWorker, verifiedPerWorker: t.verifiedPerWorker, unverifiedPerWorker: t.unverifiedPerWorker, totalAssets: Math.round(kw * t.assetsPerWorker), verifiedAssets: Math.ceil(kw * t.verifiedPerWorker), unverifiedAssets: Math.round(kw * t.assetsPerWorker) - Math.ceil(kw * t.verifiedPerWorker) })); }} className="w-24" />
            ) : (
              <span className="text-sm font-semibold">{baseKW.toLocaleString()}</span>
            )}
            <div className="flex items-center gap-2 ml-4">
              <Switch checked={data.override} onCheckedChange={handleOverrideToggle} data-testid={`switch-override-all-${questionId}`} />
              <label className="text-sm font-medium">Override</label>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium min-w-[200px]">Growth Buffer</span>
            {data.growthBufferOverride ? (
              <Input
                type="number" step="1" min="0" max="100"
                value={Math.round((data.growthBuffer ?? 0.15) * 100)}
                onChange={(e) => onChange(JSON.stringify({ ...data, growthBuffer: Math.min(1, Math.max(0, parseFloat(e.target.value) / 100 || 0)) }))}
                className="w-16"
              />
            ) : (
              <span className="text-sm font-semibold">15%</span>
            )}
            <span className="text-xs text-muted-foreground">(default)</span>
            <div className="flex items-center gap-2 ml-2">
              <Switch
                checked={!!data.growthBufferOverride}
                onCheckedChange={(checked) => onChange(JSON.stringify({ ...data, growthBufferOverride: checked, growthBuffer: checked ? (data.growthBuffer ?? 0.15) : 0.15 }))}
                data-testid={`switch-growth-buffer-${questionId}`}
              />
              <label className="text-sm font-medium">Override</label>
            </div>
          </div>
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <div className="flex items-center gap-3 pl-4"><span className="text-sm text-muted-foreground min-w-[240px]">Base Assets</span><span className="text-sm font-semibold">{totalAssets.toLocaleString()}</span><span className="text-xs text-muted-foreground">= {effectiveKW.toLocaleString()} × {estAPKW}</span></div>
            <div className="flex items-center gap-3 pl-4"><span className="text-sm text-muted-foreground min-w-[240px]">Verified</span><span className="text-sm font-semibold">{verifiedAssets.toLocaleString()}</span></div>
            <div className="flex items-center gap-3 pl-4"><span className="text-sm text-muted-foreground min-w-[240px]">Unverified</span><span className="text-sm font-semibold">{unverifiedAssets.toLocaleString()}</span></div>
            <div className="flex items-center gap-3 pl-4"><span className="text-sm text-muted-foreground min-w-[240px]">Assets w/ Buffer ({Math.round(growthBufferPct * 100)}%)</span><span className="text-sm font-semibold text-primary">{bufferedAssets.toLocaleString()}</span><span className="text-xs text-muted-foreground">= {totalAssets.toLocaleString()} × {(1 + growthBufferPct).toFixed(2)}</span></div>
            <div className="flex items-center gap-3 pl-4"><span className="text-sm text-muted-foreground min-w-[240px]">TD Cloud Tokens</span><span className="text-sm font-semibold text-destructive">{bufferedTokens.toLocaleString()}</span><span className="text-xs text-muted-foreground">= {bufferedAssets.toLocaleString()} × 3</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
