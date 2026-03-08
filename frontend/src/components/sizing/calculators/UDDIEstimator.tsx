import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, ChevronDown, ChevronRight, Info, Link2 } from "lucide-react";
import { uddiServerTokens, nxvsServers, nxaasServers, uddiManagementTokenRates } from "@/lib/tokenData";
import { safeParseUDDI } from '../parsers';
import { defaultUDDIData } from '../constants';
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { getSiteRecommendedModel } from "../calculations";

/**
 * UDDIEstimator — Discovery-side UDDI token estimator
 *
 * Server Selections are SYNCED with the Sizing table:
 *  - NXVS/NXaaS rows in Sizing appear here automatically
 *  - Adding a server here creates a row in Sizing
 *  - Removing a server here removes it from Sizing
 *
 * Management Tokens (DDI objects, Active IPs, Disc. Assets) are tracked locally
 * and pushed to answers['uddi-mgmt-tokens'] for the Sizing summary to read.
 */
export function UDDIEstimator({ value, onChange, questionId }) {
  const data = safeParseUDDI(value);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    sites: contextSites = [],
    dataCenters = [],
    addSite,
    deleteSite,
    updateSite,
    setAnswer,
    answers = {},
    platformMode = 'NIOS',
    activeDrawingId,
    getDrawingConfig,
  } = useDiscovery();

  const siteOverrides = useMemo(
    () => getDrawingConfig(activeDrawingId).siteOverrides || {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDrawingId, getDrawingConfig]
  );

  // ── Management token inputs (stored locally in uddi-estimator JSON) ──────────
  // Use top-bar KW (answers["ud-1"]) as default when local KW is 0
  const topBarKW = parseInt(answers["ud-1"]) || 0;
  const effectiveKW = data.knowledgeWorkers || topBarKW;
  const activeIPs = Math.ceil(effectiveKW * (data.devicesPerUser || 2.5));
  const dhcpClients = Math.ceil(activeIPs * ((data.dhcpPercent || 80) / 100));
  const staticClients = activeIPs - dhcpClients;
  const dnsRecsPerIP = data.dnsRecsPerIP || 2.0;
  const dnsRecsPerLease = data.dnsRecsPerLease || 4.0;
  const bufferOverhead = (data.bufferOverhead || 15) / 100;
  const ddiObjects = Math.ceil((staticClients * dnsRecsPerIP + dhcpClients * dnsRecsPerLease) * (1 + bufferOverhead));
  const discoveredAssets = Math.ceil(activeIPs * 0.05);

  const isNios = data.mode === 'nios';
  const rates = uddiManagementTokenRates;
  const ddiRate = isNios ? rates[0].nios : rates[0].native;
  const ipRate = isNios ? rates[1].nios : rates[1].native;
  const assetRate = isNios ? rates[2].nios : rates[2].native;
  const totalManagementTokens = Math.ceil(ddiObjects / ddiRate) + Math.ceil(activeIPs / ipRate) + Math.ceil(discoveredAssets / assetRate);

  const growthBuffer = data.growthBuffer || 20;

  // ── Server Selections: derived from Sizing table (NXVS / NXaaS sites) ────────
  // We read NXVS/NXaaS sites from context — this is the single source of truth
  const uddiSizingSites = useMemo(() => {
    const allSites = [
      ...dataCenters.map(dc => ({ ...dc, _type: 'dataCenter' })),
      ...contextSites.map(s => ({ ...s, _type: 'site' })),
    ];
    return allSites.filter(s => {
      const platform = (s.platform || '').toUpperCase();
      const isExplicitUddi = platform === 'NXVS' || platform === 'NXAAS';
      const isImplicitUddi = (platformMode === 'UDDI' || platformMode === 'Hybrid')
        && s.role !== 'GM' && s.role !== 'GMC'
        && !s.role?.startsWith('GM+') && !s.role?.startsWith('GMC+')
        && s.role !== 'Reporting' && s.role !== 'ND' && s.role !== 'LIC'
        && s.role !== 'CDC'; // CDC is design reference only, not a token server
      return isExplicitUddi || isImplicitUddi;
    });
  }, [contextSites, dataCenters, platformMode]);

  // Compute server tokens from sizing sites — applies drawing siteOverrides so changes
  // made in the Sizing table (serverCount, haEnabled, modelOverride) are reflected here
  const serverTokensFromSizing = useMemo(() => {
    return uddiSizingSites.reduce((sum, s) => {
      const ovr = siteOverrides[s.id] || {};
      const platform = ((ovr.platform || s.platform) || 'NXVS').toUpperCase();
      const serverType = platform === 'NXAAS' ? 'NXaaS' : 'NXVS';
      let srvSize = ovr.modelOverride || s.modelOverride;
      if (!srvSize) {
        try {
          srvSize = getSiteRecommendedModel(
            ovr.numIPs ?? s.numIPs ?? 500,
            ovr.role || s.role || 'DNS/DHCP',
            'UDDI',
            ovr.dhcpPercent ?? s.dhcpPercent ?? 80,
            86400,
            ovr.platform || s.platform || 'NXVS'
          );
        } catch { srvSize = 'S'; }
      }
      const match = uddiServerTokens.find(t =>
        t.serverType === serverType && (t.serverSize === srvSize || t.key === `${serverType}-${srvSize}`)
      );
      const tokenCost = match?.tokens || 0;
      const serverCount = ovr.serverCount ?? s.serverCount ?? 1;
      const haEnabled = ovr.haEnabled ?? s.haEnabled ?? false;
      const qty = serverCount * (haEnabled ? 2 : 1);
      return sum + tokenCost * qty;
    }, 0);
  }, [uddiSizingSites, siteOverrides]);

  const totalTokens = totalManagementTokens + serverTokensFromSizing;
  const bufferedTotal = Math.ceil(totalTokens * (1 + growthBuffer / 100));

  // ── Push management tokens to answers so TokenCalculatorSummary can read them ─
  useEffect(() => {
    if (isNios !== undefined) {
      setAnswer('uddi-mgmt-tokens', String(totalManagementTokens));
      setAnswer('uddi-growth-buffer', String(growthBuffer));
    }
  }, [totalManagementTokens, growthBuffer, isNios, setAnswer]);

  // ── Local update helper ────────────────────────────────────────────────────────
  const updateData = (updates) =>
    onChange(JSON.stringify({ ...data, ...updates, ddiObjects, calculatedActiveIPs: activeIPs, discoveredAssets, totalManagementTokens }));

  // ── Add a new NXVS server → creates a site in Sizing table ───────────────────
  const addServer = () => {
    const newId = addSite(`NXVS-S Site ${uddiSizingSites.length + 1}`, null, 0);
    // Override platform on the next tick (context may need a moment)
    setTimeout(() => {
      updateSite(newId, { platform: 'NXVS', role: 'DNS/DHCP', numIPs: 500 });
    }, 0);
  };

  // ── Remove a sizing site ───────────────────────────────────────────────────────
  const removeServer = (siteId) => {
    deleteSite(siteId);
  };

  // ── Update server platform/size in context ────────────────────────────────────
  const changeServerType = (siteId, newPlatform) => {
    updateSite(siteId, { platform: newPlatform });
  };

  const changeServerSize = (siteId, newSize, serverType) => {
    // Size is actually stored as the model override
    updateSite(siteId, { recommendedModel: newSize, modelOverride: newSize });
  };

  const changeServerQty = (siteId, qty) => {
    updateSite(siteId, { serverCount: Math.max(1, qty) });
  };

  // ── Helper: get size from site ────────────────────────────────────────────────
  const getSiteSize = (site) => {
    const ovr = siteOverrides[site.id] || {};
    if (ovr.modelOverride || site.modelOverride) return ovr.modelOverride || site.modelOverride;
    try {
      return getSiteRecommendedModel(
        ovr.numIPs ?? site.numIPs ?? 500,
        ovr.role || site.role || 'DNS/DHCP',
        'UDDI',
        ovr.dhcpPercent ?? site.dhcpPercent ?? 80,
        86400,
        ovr.platform || site.platform || 'NXVS'
      );
    } catch { return 'S'; }
  };
  const getSiteType = (site) => {
    const p = (site.platform || 'NXVS').toUpperCase();
    return p === 'NXAAS' ? 'NXaaS' : 'NXVS';
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-md" data-testid={`uddi-estimator-${questionId}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto hover:bg-transparent"
        >
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold ml-1">UDDI Token Estimator</span>
        </Button>

        <div className="flex items-center gap-1.5 ml-auto">
          <Badge variant="outline" className="text-xs font-mono text-[#12C2D3] border-[#12C2D3]/40">
            {bufferedTotal.toLocaleString()} total tokens
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-help">
                  <Link2 className="h-2.5 w-2.5" />
                  Synced with Sizing
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Server tokens sync automatically with the Sizing table.</p>
                <p className="text-xs text-muted-foreground">Add/remove NXVS or NXaaS rows in either place.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4 border-l-2 border-[#12C2D3]/20">

          {/* ── Mode selector ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground min-w-[160px]">Deployment Mode</span>
            <Select value={data.mode || 'native'} onValueChange={(v) => updateData({ mode: v })}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="native">UDDI Native</SelectItem>
                <SelectItem value="nios">NIOS Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Knowledge Workers / Devices ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Knowledge Workers</label>
              <Input
                type="number" min="0"
                value={data.knowledgeWorkers || ''}
                onChange={(e) => updateData({ knowledgeWorkers: parseInt(e.target.value) || 0 })}
                placeholder={topBarKW > 0 ? topBarKW.toLocaleString() + ' (TopBar)' : '0'}
                className="h-8 text-xs w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Devices / User</label>
              <Input
                type="number" step="0.5" min="1"
                value={data.devicesPerUser || 2.5}
                onChange={(e) => updateData({ devicesPerUser: parseFloat(e.target.value) || 2.5 })}
                className="h-8 text-xs w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">DHCP %</label>
              <Input
                type="number" min="0" max="100"
                value={data.dhcpPercent || 80}
                onChange={(e) => updateData({ dhcpPercent: parseInt(e.target.value) || 80 })}
                className="h-8 text-xs w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Growth Buffer %</label>
              <Input
                type="number" min="0" max="100"
                value={growthBuffer}
                onChange={(e) => updateData({ growthBuffer: parseInt(e.target.value) || 20 })}
                className="h-8 text-xs w-full"
              />
            </div>
          </div>

          {/* ── Calculated Management Inputs ──────────────────────────────────── */}
          <div className="border border-border rounded-md p-3 space-y-2 bg-background/60">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
              Management Token Inputs
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Active IPs</span>
                <span className="font-semibold text-foreground">{activeIPs.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">DDI Objects</span>
                <span className="font-semibold text-foreground">{ddiObjects.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Disc. Assets</span>
                <span className="font-semibold text-foreground">{discoveredAssets.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── Token Breakdown ────────────────────────────────────────────────── */}
          <div className="border border-[#12C2D3]/30 rounded-md p-3 space-y-2 bg-[#12C2D3]/5">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#12C2D3]/80 mb-2">
              Token Breakdown
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Management Tokens</span>
                <span className="font-semibold text-foreground">{totalManagementTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Server Tokens</span>
                <span className="font-semibold text-foreground">{serverTokensFromSizing.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">+{growthBuffer}% Buffer</span>
                <span className="font-bold text-[#12C2D3]">{bufferedTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── Server Selections — synced with Sizing table ──────────────────── */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-foreground">
                  Server Selections
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">These servers are synced with the Sizing table.</p>
                      <p className="text-xs text-muted-foreground">Changes here update the Sizing table and vice versa.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {uddiSizingSites.length} server{uddiSizingSites.length !== 1 ? 's' : ''}
              </span>
            </div>

            {uddiSizingSites.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2 text-center italic">
                No NXVS / NXaaS servers in Sizing table yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {uddiSizingSites.map((server) => {
                  const srvOvr = siteOverrides[server.id] || {};
                  const srvType = getSiteType(server);
                  const srvSize = getSiteSize(server);
                  const srvQty = (srvOvr.serverCount ?? server.serverCount) || 1;
                  const srvHa = srvOvr.haEnabled ?? server.haEnabled ?? false;
                  const sizeOptions = srvType === 'NXaaS' ? nxaasServers : nxvsServers;
                  const match = uddiServerTokens.find(
                    t => t.serverType === srvType && (t.serverSize === srvSize || t.key === `${srvType}-${srvSize}`)
                  );
                  const tokenCost = (match?.tokens || 0) * srvQty * (srvHa ? 2 : 1);

                  return (
                    <div key={server.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                      {/* Server Name */}
                      <span className="text-[11px] text-muted-foreground flex-1 truncate min-w-0" title={server.name}>
                        {server.name || 'Unnamed'}
                      </span>
                      {/* Type */}
                      <Select value={srvType} onValueChange={(v) => changeServerType(server.id, v)}>
                        <SelectTrigger className="w-20 h-7 text-xs shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NXVS">NXVS</SelectItem>
                          <SelectItem value="NXaaS">NXaaS</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* Size */}
                      <Select value={srvSize} onValueChange={(v) => changeServerSize(server.id, v, srvType)}>
                        <SelectTrigger className="w-16 h-7 text-xs shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sizeOptions.map(s => (
                            <SelectItem key={s.serverSize} value={s.serverSize}>
                              {s.serverSize}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Quantity */}
                      <span className="text-[10px] text-muted-foreground shrink-0">x</span>
                      <Input
                        type="number" min="1"
                        value={srvQty}
                        onChange={(e) => changeServerQty(server.id, parseInt(e.target.value) || 1)}
                        className="w-12 h-7 text-xs shrink-0"
                      />
                      {/* Token cost */}
                      <span className="text-[10px] text-muted-foreground shrink-0 min-w-[56px] text-right">
                        {tokenCost.toLocaleString()} tk
                      </span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeServer(server.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addServer}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Server to Sizing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
