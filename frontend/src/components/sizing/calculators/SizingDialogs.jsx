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
import { niosServerGuardrails, niosGridConstants, nxvsServers } from "@/lib/tokenData";
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

export function WhyThisModelDialog({ open, onOpenChange, site, platformMode, dhcpPercent }) {
  if (!site) return null;

  const workload = getSiteWorkloadDetails(
    site.numIPs, site.role, platformMode, dhcpPercent,
    site.platform, { isSpoke: site.isSpoke, hubLPS: site.hubLPS || 0 }
  );

  const isUDDI = site.platform === 'NXVS' || site.platform === 'NXaaS';
  const servers = isUDDI ? nxvsServers : niosServerGuardrails;
  const selectedServer = servers.find(s =>
    isUDDI ? s.serverSize === site.recommendedModel : s.model === site.recommendedModel
  );

  const utilization = niosGridConstants.maxDbUtilizationPercent / 100;
  const serverQPS = isUDDI ? selectedServer?.qps : selectedServer?.maxQPS;
  const serverLPS = isUDDI ? selectedServer?.lps : selectedServer?.maxLPS;
  const serverObj = isUDDI ? selectedServer?.objects : selectedServer?.maxDbObj;

  const qpsUtil = serverQPS ? Math.round((workload.adjustedQPS / (serverQPS * utilization)) * 100) : 0;
  const lpsUtil = serverLPS ? Math.round((workload.adjustedLPS / (serverLPS * utilization)) * 100) : 0;
  const objUtil = serverObj ? Math.round((workload.objects / (serverObj * utilization)) * 100) : 0;

  const driverLabels = {
    qps: 'Query Performance (QPS)',
    lps: 'Lease Performance (LPS)',
    objects: 'Database Capacity (Objects)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent dark:text-accent" />
            Why {site.recommendedModel} for {site.name}?
          </DialogTitle>
          <DialogDescription>
            Detailed sizing breakdown and model selection rationale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Site Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Site</div>
              <div className="font-medium">{site.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Role</div>
              <div className="font-medium">{site.role}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">IP Addresses</div>
              <div className="font-medium">{formatNumber(site.numIPs)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">DHCP Clients ({dhcpPercent}%)</div>
              <div className="font-medium">{formatNumber(workload.dhcpClients)}</div>
            </div>
          </div>

          {/* Driver Explanation */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-accent dark:text-accent fill-accent" />
              <span className="font-medium text-foreground">
                Model selected based on: {driverLabels[workload.driver]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {workload.driver === 'qps' && `This site requires ${formatNumber(workload.adjustedQPS)} QPS capacity, which is the limiting factor.`}
              {workload.driver === 'lps' && `This site requires ${formatNumber(workload.adjustedLPS)} LPS capacity for DHCP operations, which is the limiting factor.`}
              {workload.driver === 'objects' && `This site requires ${formatNumber(workload.objects)} database objects, which is the limiting factor.`}
            </p>
          </div>

          {/* Workload Requirements */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Workload Requirements
            </h4>
            <div className="space-y-3">
              <WorkloadBar label="QPS (Queries/sec)" isDriver={workload.driver === 'qps'} value={workload.adjustedQPS} max={Math.round((serverQPS || 0) * utilization)} util={qpsUtil} />
              <WorkloadBar label="LPS (Leases/sec)" isDriver={workload.driver === 'lps'} value={workload.adjustedLPS} max={Math.round((serverLPS || 0) * utilization)} util={lpsUtil} />
              <WorkloadBar label="DB Objects" isDriver={workload.driver === 'objects'} value={workload.objects} max={Math.round((serverObj || 0) * utilization)} util={objUtil} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Capacity shown at 60% target utilization (recommended headroom for growth)
            </p>
          </div>

          {/* Penalties Applied */}
          {workload.penalties.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Penalties Applied
              </h4>
              <div className="space-y-2">
                {workload.penalties.map((penalty, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{penalty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Object Breakdown */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Archive className="h-4 w-4" /> Object Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/30 rounded">
                <div className="text-muted-foreground">DNS Objects</div>
                <div className="font-medium">{formatNumber(workload.dnsObjects)}</div>
                <div className="text-xs text-muted-foreground">DHCP x 3 + Static x 2</div>
              </div>
              <div className="p-3 bg-muted/30 rounded">
                <div className="text-muted-foreground">DHCP Lease Objects</div>
                <div className="font-medium">{formatNumber(workload.dhcpObjects)}</div>
                <div className="text-xs text-muted-foreground">Clients x 2</div>
              </div>
            </div>
          </div>

          {/* Server Specs */}
          {selectedServer && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Server className="h-4 w-4" /> {site.recommendedModel} Specifications
              </h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">Max QPS</div>
                  <div className="font-medium">{formatNumber(serverQPS || 0)}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">Max LPS</div>
                  <div className="font-medium">{formatNumber(serverLPS || 0)}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded text-center">
                  <div className="text-muted-foreground">Max Objects</div>
                  <div className="font-medium">{formatNumber(serverObj || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tokens */}
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Token Cost</div>
                <div className="text-sm text-muted-foreground">
                  {site.serverCount > 1 ? `${site.serverCount} servers x ${formatNumber(site.tokensPerServer || 0)} tokens` : 'Per server'}
                </div>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatNumber(site.tokens || 0)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkloadBar({ label, isDriver, value, max, util }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={isDriver ? 'font-bold text-blue-600' : ''}>
          {label} {isDriver && '\u2605'}
        </span>
        <span>{formatNumber(value)} / {formatNumber(max)} ({util}%)</span>
      </div>
      <Progress value={Math.min(util, 100)} className={`h-2 ${util > 60 ? '[&>div]:bg-amber-500' : ''} ${util > 80 ? '[&>div]:bg-red-500' : ''}`} />
    </div>
  );
}
