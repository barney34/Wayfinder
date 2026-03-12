/**
 * Dialogs for Sizing Calculator
 * - PlatformChangeAlertDialog: Confirmation when switching to non-recommended platform
 * - WhyThisModelDialog: Detailed sizing rationale for a selected site
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, HelpCircle, Star, Activity, Archive, Server } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { niosServerGuardrails, niosGridConstants, nxvsServers, getMaxKWForModel, getUtilizationTarget } from "@/lib/tokenData";
import { getSiteWorkloadDetails } from "../calculations";

export function PlatformChangeAlertDialog({
  open, onOpenChange, recommendedMode, pendingPlatformChange,
  dataCenterCount, siteCount, onCancel, onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="platform-alert-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Non-Recommended Platform Selected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are switching from <strong>{recommendedMode}</strong> (recommended) to <strong>{pendingPlatformChange}</strong>.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Why is {recommendedMode} recommended?</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Based on your configuration of <strong>{dataCenterCount} Data Centers</strong> and <strong>{siteCount} Sites</strong>:
                </p>
                <ul className="list-disc list-inside mt-2 text-amber-700 dark:text-amber-300 space-y-1">
                  {recommendedMode === 'NIOS' && (
                    <>
                      <li>NIOS is ideal for smaller deployments (&lt;50 sites)</li>
                      <li>Provides traditional Grid Master/GMC architecture</li>
                      <li>Best for on-premises infrastructure</li>
                    </>
                  )}
                  {recommendedMode === 'UDDI' && (
                    <>
                      <li>UDDI is optimized for large distributed deployments (&gt;50 sites)</li>
                      <li>Cloud-native architecture with NIOS-X</li>
                      <li>Simplified management without Grid Master</li>
                    </>
                  )}
                  {recommendedMode === 'Hybrid' && (
                    <>
                      <li>Hybrid is recommended for multi-DC environments with 10+ sites</li>
                      <li>Combines on-premises Grid with cloud scalability</li>
                      <li>Flexible deployment options per site</li>
                    </>
                  )}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Switching platforms will reset role assignments and may affect your sizing calculations.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="platform-alert-cancel">
            Keep {recommendedMode}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
            data-testid="platform-alert-confirm"
          >
            Switch to {pendingPlatformChange}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Normalized model data for comparison
interface ModelSnapshot {
  name: string;
  ratedQps: number;
  ratedLps: number;
  ratedObjects: number;
}

function getModelName(server: any, isUDDI: boolean): string {
  return isUDDI ? server.serverSize : server.model;
}

function getModelSnapshot(server: any, isUDDI: boolean): ModelSnapshot {
  return {
    name: getModelName(server, isUDDI),
    ratedQps: isUDDI ? server.qps : server.maxQPS,
    ratedLps: isUDDI ? server.lps : server.maxLPS,
    ratedObjects: isUDDI ? server.objects : server.maxDbObj,
  };
}

export function WhyThisModelDialog({ open, onOpenChange, site, platformMode, dhcpPercent }) {
  if (!site) return null;

  const workload = getSiteWorkloadDetails(
    site.numIPs, site.role, platformMode, dhcpPercent,
    site.platform, {
      isSpoke: site.isSpoke,
      hubLPS: site.hubLPS || 0,
      foObjects: site.foObjects || 0,
      perfFeatures: site.effectivePerfFeatures || site.perfFeatures || [],
    }
  );

  const isUDDI = site.platform === 'NXVS' || site.platform === 'NXaaS';
  const allServers = isUDDI ? nxvsServers : niosServerGuardrails;
  const currentIndex = allServers.findIndex(s => getModelName(s, isUDDI) === site.recommendedModel);
  const selectedServer = currentIndex >= 0 ? allServers[currentIndex] : null;
  const prevServer = currentIndex > 0 ? allServers[currentIndex - 1] : null;
  const nextServer = currentIndex >= 0 && currentIndex < allServers.length - 1 ? allServers[currentIndex + 1] : null;

  const current: ModelSnapshot = selectedServer
    ? getModelSnapshot(selectedServer, isUDDI)
    : { name: site.recommendedModel, ratedQps: 0, ratedLps: 0, ratedObjects: 0 };
  const sizeDown: ModelSnapshot | null = prevServer ? getModelSnapshot(prevServer, isUDDI) : null;
  const sizeUp: ModelSnapshot | null = nextServer ? getModelSnapshot(nextServer, isUDDI) : null;

  const utilization = getUtilizationTarget(site.platform);
  const utilPercent = Math.round(utilization * 100);
  const qpsMult = workload.qpsMultiplier ?? 1;
  const lpsMult = workload.lpsMultiplier ?? 1;

  // Effective capacity at utilization target with perf multipliers
  const effCap = (model: ModelSnapshot) => ({
    qps: Math.round(model.ratedQps * utilization * qpsMult),
    lps: Math.round(model.ratedLps * utilization * lpsMult),
    objects: Math.round(model.ratedObjects * utilization),
  });

  // % of rated capacity consumed by demand
  const pctOfRated = (demand: number, rated: number) => rated > 0 ? Math.round((demand / rated) * 100) : 0;

  const currentEff = effCap(current);
  const demandQPS = workload.adjustedQPS;
  const demandLPS = workload.adjustedLPS;
  const demandObj = workload.objects;

  // Show QPS for any role that serves DNS queries (not pure DHCP or pure GM/GMC)
  const hasDNS = site.role === 'DNS' || site.role === 'DNS/DHCP' || site.role.includes('+DNS');
  const hasDHCP = site.role === 'DHCP' || site.role === 'DNS/DHCP' || site.role.includes('+DHCP');
  const showQPS = demandQPS > 0 && (hasDNS || (!hasDHCP && !site.role.startsWith('GM')));
  const showLPS = demandLPS > 0 && (hasDHCP || (!hasDNS && !site.role.startsWith('GM')));

  const driverLabels = {
    qps: 'Query Performance (QPS)',
    lps: 'Lease Performance (LPS)',
    objects: 'Database Capacity (Objects)',
  };

  // Verdict label for a model column
  const verdict = (model: ModelSnapshot) => {
    const eff = effCap(model);
    const qpsFit = !showQPS || eff.qps >= demandQPS;
    const lpsFit = !showLPS || eff.lps >= demandLPS;
    const objFit = eff.objects >= demandObj;
    if (qpsFit && lpsFit && objFit) return { text: `Fits @ ${utilPercent}%`, color: 'text-green-700 dark:text-green-400' };
    return { text: 'Too small', color: 'text-destructive' };
  };

  // Metric row for a comparison column: shows effective capacity + % used
  const MetricRow = ({ label, demand, rated, isDriver, effVal, userLimit }: { label: string; demand: number; rated: number; isDriver: boolean; effVal: number; userLimit: number }) => {
    const pct = pctOfRated(demand, rated);
    const color = pct > utilPercent * 1.0 ? 'text-destructive font-semibold' : pct > (utilPercent - 10) ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-foreground';
    
    // Determine penalty strings with labels
    const penaltyMult = Number((label === 'QPS' ? qpsMult : label === 'LPS' ? lpsMult : 1).toFixed(2));
    let penaltyLabel = '';
    if (penaltyMult < 1) {
      if (workload.penalties.some(p => p.includes('DNSSEC') || p.includes('DNS Security')) && label === 'QPS') penaltyLabel = ' (DNSSEC)';
      else if (workload.penalties.some(p => p.includes('multi-protocol') || p.includes('Multi-protocol'))) penaltyLabel = ' (Multi-protocol)';
    }
    const penaltyText = penaltyMult < 1 ? ` × ${penaltyMult}${penaltyLabel}` : '';
    const formulaText = `${formatNumber(rated)} × ${utilPercent}%${penaltyText} = ${formatNumber(effVal)}`;

    return (
      <div className="flex-1 py-1 px-3 border-x border-border/30 first:border-l-0 last:border-r-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
            {label} {isDriver && <Star className="h-2.5 w-2.5 text-accent fill-accent" />}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">{pct}% used</div>
        </div>
        
        <div className="flex items-baseline justify-between">
          <div className={`text-sm font-mono ${color}`}>{formatNumber(effVal)}</div>
          <div className="text-[9px] text-muted-foreground">Target Limit</div>
        </div>

        <div className="flex flex-col gap-0.5 mt-1">
          <div className="text-[9px] text-muted-foreground/80">~{formatNumber(userLimit)} users</div>
          <div className="text-[8px] text-muted-foreground/60 font-mono">{formulaText}</div>
        </div>
      </div>
    );
  };

  const getMetricData = (model: ModelSnapshot) => {
    const eff = effCap(model);
    return {
      qps: {
        eff: eff.qps,
        // Formula: QPS = (Users * 3 * (3500/(9*3600)))
        // So Users = QPS / 3 / (3500/(9*3600)) = QPS / 3 / 0.10802 = QPS / 0.32407
        users: Math.round(eff.qps / (3 * (3500 / 32400)))
      },
      lps: {
        eff: eff.lps,
        // Formula: LPS = (Users * 3 * (dhcpPercent/100)) / (leaseTime / 32400)
        // With standard 80% dhcp and 86400 lease time:
        // LPS = (Users * 3 * 0.8) / (86400 / 32400) = (Users * 2.4) / 2.666 = Users * 0.9
        // Users = LPS / ((3 * (dhcpPercent/100)) / (86400/32400))
        users: Math.round(eff.lps / ((3 * (dhcpPercent / 100)) / (86400 / 32400)))
      },
      objects: {
        eff: eff.objects,
        // Formula: Objects = Users * 2.5
        users: Math.round(eff.objects / 2.5)
      }
    };
  };

  const sizeDownData = sizeDown ? getMetricData(sizeDown) : null;
  const currentData = getMetricData(current);
  const sizeUpData = sizeUp ? getMetricData(sizeUp) : null;
  
  const qpsPenaltyStr = Number(qpsMult.toFixed(2));
  let qpsPenaltyLabel = '';
  if (qpsPenaltyStr < 1) {
    if (workload.penalties.some(p => p.includes('DNSSEC') || p.includes('DNS Security'))) qpsPenaltyLabel = ' (DNSSEC)';
    else if (workload.penalties.some(p => p.includes('multi-protocol') || p.includes('Multi-protocol'))) qpsPenaltyLabel = ' (Multi-protocol)';
  }

  const lpsPenaltyStr = Number(lpsMult.toFixed(2));
  let lpsPenaltyLabel = '';
  if (lpsPenaltyStr < 1) {
    if (workload.penalties.some(p => p.includes('multi-protocol') || p.includes('Multi-protocol'))) lpsPenaltyLabel = ' (Multi-protocol)';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            Why {site.recommendedModel} for {site.name}?
          </DialogTitle>
          <DialogDescription>
            Model comparison at {utilPercent}% utilization target — demand: {showQPS && `QPS ${formatNumber(demandQPS)}`}{showQPS && showLPS && ' · '}{showLPS && `LPS ${formatNumber(demandLPS)}`}{(showQPS || showLPS) && ' · '}Obj {formatNumber(demandObj)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* ── Vertical Model Comparison Stack ── */}
          <div className="flex flex-col gap-3">
            
            {/* SIZE DOWN */}
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground w-20">Size Down</div>
                  <div className="font-semibold text-base">{sizeDown ? sizeDown.name : '—'}</div>
                  {sizeDown && <div className={`text-xs font-medium ${verdict(sizeDown).color}`}>{verdict(sizeDown).text}</div>}
                </div>
              </div>
              {sizeDown && sizeDownData && (
                <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                  {showQPS && <MetricRow label="QPS" demand={demandQPS} rated={sizeDown.ratedQps} isDriver={workload.driver === 'qps'} effVal={sizeDownData.qps.eff} userLimit={sizeDownData.qps.users} />}
                  {showLPS && <MetricRow label="LPS" demand={demandLPS} rated={sizeDown.ratedLps} isDriver={workload.driver === 'lps'} effVal={sizeDownData.lps.eff} userLimit={sizeDownData.lps.users} />}
                  <MetricRow label="Objects" demand={demandObj} rated={sizeDown.ratedObjects} isDriver={workload.driver === 'objects'} effVal={sizeDownData.objects.eff} userLimit={sizeDownData.objects.users} />
                </div>
              )}
              {!sizeDown && <div className="text-xs text-muted-foreground mt-2">Smallest available model</div>}
            </div>

            {/* SELECTED */}
            <div className="rounded-lg border-2 border-accent bg-accent/5 p-4 relative shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-accent/20 pb-3">
                <div className="flex items-baseline gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-accent font-bold w-20">Selected</div>
                  <div className="font-bold text-lg">{current.name}</div>
                  <div className={`text-xs font-medium ${verdict(current).color}`}>{verdict(current).text}</div>
                </div>
                {(() => {
                  const maxKW = getMaxKWForModel(site.recommendedModel);
                  return maxKW > 0 ? (
                    <div className="text-[11px] text-muted-foreground">
                      Max <span className="font-semibold text-foreground">{formatNumber(maxKW)}</span> knowledge workers
                    </div>
                  ) : null;
                })()}
              </div>
              
              <div className="flex gap-6">
                {showQPS && (
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className={`flex items-center gap-1 text-[11px] uppercase tracking-wide ${workload.driver === 'qps' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>
                        QPS {workload.driver === 'qps' && <Star className="h-3 w-3 text-accent fill-accent" />}
                      </span>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Demand</span>
                        <span className="text-sm font-mono font-semibold">{formatNumber(demandQPS)}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={Math.min(pctOfRated(demandQPS, current.ratedQps), 100)} className={`h-3 ${pctOfRated(demandQPS, current.ratedQps) > utilPercent ? '[&>div]:bg-destructive' : pctOfRated(demandQPS, current.ratedQps) > utilPercent - 10 ? '[&>div]:bg-yellow-500' : ''}`} />
                      <div className="absolute top-0 h-3 border-r-2 border-amber-500" style={{ left: `${utilPercent}%` }} title={`${utilPercent}% target`} />
                    </div>
                    <div className="flex justify-between items-start pt-1">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">{formatNumber(currentData.qps.eff)}</span> Target Limit
                        </div>
                        <div className="text-[10px] text-muted-foreground/80">
                          ~{formatNumber(currentData.qps.users)} users
                        </div>
                        <div className="text-[9px] text-muted-foreground/60 font-mono">
                          {formatNumber(current.ratedQps)} Max × {utilPercent}%{qpsMult < 1 ? ` × ${qpsPenaltyStr}${qpsPenaltyLabel}` : ''}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-mono">{formatNumber(current.ratedQps)}</span> Max Rated
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/80">{pctOfRated(demandQPS, current.ratedQps)}% Used</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {showLPS && (
                  <div className="flex-1 space-y-2 border-l border-accent/20 pl-6">
                    <div className="flex justify-between items-baseline">
                      <span className={`flex items-center gap-1 text-[11px] uppercase tracking-wide ${workload.driver === 'lps' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>
                        LPS {workload.driver === 'lps' && <Star className="h-3 w-3 text-accent fill-accent" />}
                      </span>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Demand</span>
                        <span className="text-sm font-mono font-semibold">{formatNumber(demandLPS)}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={Math.min(pctOfRated(demandLPS, current.ratedLps), 100)} className={`h-3 ${pctOfRated(demandLPS, current.ratedLps) > utilPercent ? '[&>div]:bg-destructive' : pctOfRated(demandLPS, current.ratedLps) > utilPercent - 10 ? '[&>div]:bg-yellow-500' : ''}`} />
                      <div className="absolute top-0 h-3 border-r-2 border-amber-500" style={{ left: `${utilPercent}%` }} title={`${utilPercent}% target`} />
                    </div>
                    <div className="flex justify-between items-start pt-1">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">{formatNumber(currentData.lps.eff)}</span> Target Limit
                        </div>
                        <div className="text-[10px] text-muted-foreground/80">
                          ~{formatNumber(currentData.lps.users)} users
                        </div>
                        <div className="text-[9px] text-muted-foreground/60 font-mono">
                          {formatNumber(current.ratedLps)} Max × {utilPercent}%{lpsMult < 1 ? ` × ${lpsPenaltyStr}${lpsPenaltyLabel}` : ''}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-mono">{formatNumber(current.ratedLps)}</span> Max Rated
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/80">{pctOfRated(demandLPS, current.ratedLps)}% Used</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className={`flex-1 space-y-2 ${(showQPS || showLPS) ? 'border-l border-accent/20 pl-6' : ''}`}>
                  <div className="flex justify-between items-baseline">
                    <span className={`flex items-center gap-1 text-[11px] uppercase tracking-wide ${workload.driver === 'objects' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>
                      Objects {workload.driver === 'objects' && <Star className="h-3 w-3 text-accent fill-accent" />}
                    </span>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Demand</span>
                      <span className="text-sm font-mono font-semibold">{formatNumber(demandObj)}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={Math.min(pctOfRated(demandObj, current.ratedObjects), 100)} className={`h-3 ${pctOfRated(demandObj, current.ratedObjects) > utilPercent ? '[&>div]:bg-destructive' : pctOfRated(demandObj, current.ratedObjects) > utilPercent - 10 ? '[&>div]:bg-yellow-500' : ''}`} />
                    <div className="absolute top-0 h-3 border-r-2 border-amber-500" style={{ left: `${utilPercent}%` }} title={`${utilPercent}% target`} />
                  </div>
                  <div className="flex justify-between items-start pt-1">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-mono font-medium text-foreground">{formatNumber(currentData.objects.eff)}</span> Target Limit
                      </div>
                      <div className="text-[10px] text-muted-foreground/80">
                        ~{formatNumber(currentData.objects.users)} users
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 font-mono">
                        {formatNumber(current.ratedObjects)} Max × {utilPercent}%
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-mono">{formatNumber(current.ratedObjects)}</span> Max Rated
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/80">{pctOfRated(demandObj, current.ratedObjects)}% Used</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SIZE UP */}
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground w-20">Size Up</div>
                  <div className="font-semibold text-base">{sizeUp ? sizeUp.name : '—'}</div>
                  {sizeUp && <div className={`text-xs font-medium ${verdict(sizeUp).color}`}>{verdict(sizeUp).text}</div>}
                </div>
              </div>
              {sizeUp && sizeUpData && (
                <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                  {showQPS && <MetricRow label="QPS" demand={demandQPS} rated={sizeUp.ratedQps} isDriver={workload.driver === 'qps'} effVal={sizeUpData.qps.eff} userLimit={sizeUpData.qps.users} />}
                  {showLPS && <MetricRow label="LPS" demand={demandLPS} rated={sizeUp.ratedLps} isDriver={workload.driver === 'lps'} effVal={sizeUpData.lps.eff} userLimit={sizeUpData.lps.users} />}
                  <MetricRow label="Objects" demand={demandObj} rated={sizeUp.ratedObjects} isDriver={workload.driver === 'objects'} effVal={sizeUpData.objects.eff} userLimit={sizeUpData.objects.users} />
                </div>
              )}
              {!sizeUp && <div className="text-xs text-muted-foreground mt-2">Largest available model</div>}
            </div>
          </div>

          {/* Penalties & Sizing Math */}
          {(workload.penalties.length > 0 || workload.qps > 0 || workload.lps > 0) && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Sizing Math & Penalties
              </h4>
              <div className="space-y-2 text-sm">
                {workload.qps > 0 && (
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Base QPS</span>
                    <span className="font-mono">{formatNumber(site.numIPs)} Users ÷ 3 = {formatNumber(workload.qps)}</span>
                  </div>
                )}
                {workload.lps > 0 && (
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Base LPS</span>
                    <span className="font-mono">{formatNumber(workload.dhcpClients)} DHCP ÷ 900s = {formatNumber(workload.lps)}</span>
                  </div>
                )}
                {workload.objects > 0 && (
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Base Objects</span>
                    <span className="font-mono">{formatNumber(site.knowledgeWorkers || Math.round(site.numIPs / 3))} Users × 2.5 = {formatNumber(workload.objects)}</span>
                  </div>
                )}
                {workload.penalties.map((penalty, i) => {
                  const beforeQPS = workload.qps;
                  const afterQPS = workload.adjustedQPS;
                  const beforeLPS = workload.lps;
                  const afterLPS = workload.adjustedLPS;

                  if (penalty.includes('multi-protocol') || penalty.includes('Multi-protocol')) {
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-amber-900 dark:text-amber-100">Multi-protocol penalty</div>
                          <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                            QPS: {formatNumber(beforeQPS)} × 1.3 = {formatNumber(afterQPS)}<br />
                            LPS: {formatNumber(beforeLPS)} × 1.3 = {formatNumber(afterLPS)}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (penalty.includes('DNSSEC') || penalty.includes('DNS Security')) {
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-amber-900 dark:text-amber-100">DNSSEC penalty</div>
                          <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                            QPS: {formatNumber(beforeQPS)} × 0.8 = {formatNumber(Math.round(beforeQPS * 0.8))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{penalty}</span>
                    </div>
                  );
                })}
                {(workload.adjustedQPS !== workload.qps || workload.adjustedLPS !== workload.lps) && (
                  <div className="flex justify-between p-2 bg-accent/10 rounded border border-accent/30">
                    <span className="font-medium">After penalties</span>
                    <span className="font-mono">
                      {workload.adjustedQPS > 0 && `QPS: ${formatNumber(workload.adjustedQPS)}`}
                      {workload.adjustedQPS > 0 && workload.adjustedLPS > 0 && ' · '}
                      {workload.adjustedLPS > 0 && `LPS: ${formatNumber(workload.adjustedLPS)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Object Breakdown */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <Archive className="h-4 w-4" /> Object Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/30 rounded">
                <div className="text-muted-foreground">DNS Objects</div>
                <div className="font-medium">{formatNumber(workload.dnsObjects)}</div>
                <div className="text-xs text-muted-foreground">{isUDDI ? 'DHCP x 4 + Static x 2' : 'DHCP x 3 + Static x 2'}</div>
              </div>
              <div className="p-3 bg-muted/30 rounded">
                <div className="text-muted-foreground">DHCP Lease Objects</div>
                <div className="font-medium">{formatNumber(workload.dhcpObjects)}</div>
                <div className="text-xs text-muted-foreground">Clients x 2</div>
              </div>
            </div>

            {isUDDI && workload.dhcpClients > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">
                  Kea DHCP Impact (UDDI vs NIOS)
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-muted-foreground">NIOS equivalent</div>
                    <div className="font-medium text-foreground">
                      {formatNumber((workload.dhcpClients * 3) + (workload.staticClients * 2))}
                    </div>
                    <div className="text-muted-foreground">DHCP x 3</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">This UDDI config</div>
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                      {formatNumber(workload.dnsObjects)}
                    </div>
                    <div className="text-muted-foreground">DHCP x 4</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Extra objects</div>
                    <div className="font-semibold text-amber-600 dark:text-amber-400">
                      +{formatNumber(workload.dhcpClients)}
                    </div>
                    <div className="text-muted-foreground">
                      +{Math.round((workload.dhcpClients / ((workload.dhcpClients * 3) + (workload.staticClients * 2))) * 100)}%
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Kea DHCP (UDDI) creates a DHCID record in both forward and reverse zones, adding 1 extra DNS record per DHCP client vs NIOS.
                </p>
              </div>
            )}
          </div>

          {/* Tokens */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground text-sm">Token Cost</div>
                <div className="text-xs text-muted-foreground">
                  {site.serverCount > 1 ? `${site.serverCount} servers x ${formatNumber(site.tokensPerServer || 0)} tokens` : 'Per server'}
                </div>
              </div>
              <div className="text-xl font-bold text-primary">
                {formatNumber(site.tokens || 0)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
