import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight } from "lucide-react";
import { safeParseReporting, safeParseAssetConfig } from '../parsers';
import { defaultReportingData } from '../constants';

export function ReportingInput({ value, onChange, questionId, knowledgeWorkers: knowledgeWorkersValue, assetConfigValue }) {
  const data = safeParseReporting(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const assetConfig = safeParseAssetConfig(assetConfigValue);
  const verifiedAssets = assetConfig.verifiedAssets;
  const unverifiedAssets = assetConfig.unverifiedAssets;
  const tdCloudEnabled = assetConfig.tdCloudEnabled;

  const verifiedTokens = verifiedAssets * 3500 * 30;
  const unverifiedTokens = unverifiedAssets * 2200 * 30;
  const baseReportingTokens = verifiedTokens + unverifiedTokens;
  const securityEventsPercent = data.securityEventsOverride ? data.securityEventsPercent : 10;
  const securityEventsTokens = data.enabled ? Math.round(baseReportingTokens * (securityEventsPercent / 100)) : 0;

  useEffect(() => {
    if (!tdCloudEnabled && data.enabled) {
      onChange(JSON.stringify({ ...defaultReportingData, enabled: false }));
    }
  }, [tdCloudEnabled, data.enabled, onChange]);

  const handleToggle = (checked) => {
    if (checked && !tdCloudEnabled) return;
    if (!checked) onChange(JSON.stringify({ ...defaultReportingData, enabled: false }));
    else { setIsExpanded(true); onChange(JSON.stringify({ ...data, enabled: true, securityEventsTokens })); }
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-md" data-testid={`reporting-${questionId}`}>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto hover:bg-transparent">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">Reporting for TD</span>
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">No</span>
          <Switch checked={data.enabled} onCheckedChange={handleToggle} disabled={!tdCloudEnabled} data-testid={`switch-log-export-${questionId}`} />
          <span className="text-xs text-muted-foreground">Yes</span>
        </div>
        {!tdCloudEnabled && <span className="text-xs text-muted-foreground italic">(Requires TD Cloud)</span>}
      </div>
      {isExpanded && tdCloudEnabled && data.enabled && (
        <div className="space-y-3 pl-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium min-w-[200px]">Security events %</span>
            <Input type="number" step="1" min="0" max="100" value={securityEventsPercent} onChange={(e) => onChange(JSON.stringify({ ...data, securityEventsPercent: parseFloat(e.target.value) || 10, securityEventsOverride: true }))} disabled={!data.securityEventsOverride} className="w-16" />
            <span className="text-xs text-muted-foreground">%</span>
            <Switch checked={data.securityEventsOverride} onCheckedChange={(checked) => onChange(JSON.stringify({ ...data, securityEventsOverride: checked }))} />
            <span className="text-xs text-muted-foreground">Override</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium min-w-[200px]">Growth Buffer</span>
            <Switch checked={data.reportingGrowthBufferEnabled} onCheckedChange={(checked) => onChange(JSON.stringify({ ...data, reportingGrowthBufferEnabled: checked }))} />
            {data.reportingGrowthBufferEnabled && (
              <><Input type="number" step="1" min="0" max="100" value={data.reportingGrowthBuffer} onChange={(e) => onChange(JSON.stringify({ ...data, reportingGrowthBuffer: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))} className="w-16" /><span className="text-xs text-muted-foreground">%</span></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
