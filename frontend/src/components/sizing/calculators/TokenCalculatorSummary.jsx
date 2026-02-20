import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Server, Plus, Info, FileSpreadsheet } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  getSiteRecommendedModel,
  getDefaultHardwareSku,
  getHardwareSkuOptions,
  calculateSiteLPS,
} from "../calculations";
import {
  gmServiceRestrictions,
  calculateGMObjects,
  findMinimumGMModel,
} from "@/lib/tokenData";

// Import extracted modules
import { PLATFORM_MODES, PLATFORM_OPTIONS_BY_MODE, ROLE_OPTIONS_BY_MODE, ADDITIONAL_SERVICES } from "./platformConfig";
import { getServiceImpact, getTokensForModel, getPartnerSkuFromTokens, getSkuDescription, getRecommendedPlatformMode } from "./tokenUtils";
import { exportCSV, exportYAML, exportExcel, exportPDF, exportDrawing } from "./SizingExports";
import { PlatformChangeAlertDialog, WhyThisModelDialog } from "./SizingDialogs";
import { SiteTableRow } from "./SiteTableRow";
import { SizingTableHeader } from "./SizingTableHeader";

// Re-export constants for backward compatibility
export { PLATFORM_MODES, PLATFORM_OPTIONS_BY_MODE, ROLE_OPTIONS_BY_MODE, ADDITIONAL_SERVICES };
export { getServiceImpact, getTokensForModel, getPartnerSkuFromTokens, getSkuDescription, getRecommendedPlatformMode };

/**
 * TokenCalculatorSummary Component
 * EDITABLE site sizing, token calculations, and export
 */
export function TokenCalculatorSummary() {
  const {
    dataCenters = [], sites: contextSites = [], answers = {}, setAnswer, platformMode, setPlatformMode, setSizingSummary,
    updateSite: contextUpdateSite
  } = useDiscovery();

  // Site overrides and manual sites state
  const [siteOverrides, setSiteOverrides] = useState({});
  const [manualSites, setManualSites] = useState([]);

  // Drawing # for export
  const [drawingNumber, setDrawingNumber] = useState('');

  // Alert dialog state for platform change confirmation
  const [showPlatformAlert, setShowPlatformAlert] = useState(false);
  const [pendingPlatformChange, setPendingPlatformChange] = useState(null);

  // UI toggle for Hardware SKU column
  const [showHardware, setShowHardware] = useState(false);

  // "Why this model?" dialog state
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [selectedSiteForDialog, setSelectedSiteForDialog] = useState(null);

  const openModelDialog = useCallback((site) => {
    setSelectedSiteForDialog(site);
    setShowModelDialog(true);
  }, []);

  // Recommended platform based on DC/Site counts
  const recommendedMode = useMemo(() =>
    getRecommendedPlatformMode(dataCenters.length, contextSites.length),
    [dataCenters.length, contextSites.length]
  );

  // Handle platform mode change with confirmation for non-recommended
  const handlePlatformModeChange = useCallback((newMode) => {
    if (!newMode) return;
    if (newMode !== recommendedMode && platformMode === recommendedMode) {
      setPendingPlatformChange(newMode);
      setShowPlatformAlert(true);
    } else {
      setPlatformMode(newMode);
    }
  }, [recommendedMode, platformMode, setPlatformMode]);

  const confirmPlatformChange = useCallback(() => {
    if (pendingPlatformChange) setPlatformMode(pendingPlatformChange);
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, [pendingPlatformChange, setPlatformMode]);

  const cancelPlatformChange = useCallback(() => {
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, []);

  // Global settings
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;
  const securityEnabled = answers['feature-security'] === 'Yes';
  const uddiEnabled = answers['feature-uddi'] === 'Yes';

  // Get the IP Calculator value
  const manualOverride = answers['ipam-1-override'] === 'true';
  const kwNum = parseInt(answers['ud-1']) || 0;
  const calculatedIPs = Math.round(kwNum * ipMultiplier);
  const manualIPs = parseInt(answers['ipam-1']) || 0;
  const ipCalcValue = manualOverride ? manualIPs : calculatedIPs;

  // Get role/platform options based on platform mode
  const roleOptions = ROLE_OPTIONS_BY_MODE[platformMode] || ROLE_OPTIONS_BY_MODE.NIOS;
  const platformOptions = PLATFORM_OPTIONS_BY_MODE[platformMode] || PLATFORM_OPTIONS_BY_MODE.NIOS;

  // Stable IDs for memoization
  const dataCenterIds = useMemo(() => dataCenters.map(dc => dc.id).join(','), [dataCenters]);
  const contextSiteIds = useMemo(() => contextSites.map(s => s.id).join(','), [contextSites]);

  // Build sites from Quick Capture + manual
  const sites = useMemo(() => {
    const buildBasicSite = (source, index, type) => {
      const key = type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`;
      const override = siteOverrides[key] || {};
      const kw = source.knowledgeWorkers || 0;

      let defaultRole = 'DNS/DHCP';
      if (type === 'dataCenter' && platformMode !== 'UDDI') {
        defaultRole = index === 0 ? 'GM' : 'GMC';
      }

      let role = override.role || defaultRole;
      const isGmRole = role === 'GM' || role === 'GMC';
      const isDisabledInUddi = platformMode === 'UDDI' && isGmRole;
      const services = override.services || [];

      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      else if (platformMode === 'Hybrid' && type !== 'dataCenter') defaultPlatform = 'NXVS';

      let platform = override.platform || defaultPlatform;
      if (platformMode === 'UDDI' && !isGmRole) {
        if (platform === 'NIOS' || platform === 'NIOS-V' || platform === 'NIOS-HA') platform = 'NXVS';
      }

      let numIPs;
      if (type === 'dataCenter') {
        numIPs = override.numIPs !== undefined ? override.numIPs : ipCalcValue;
        const serviceIPs = (role === 'GM' || role === 'GMC') ? services.length * 100 : 0;
        numIPs += serviceIPs;
      } else {
        const baseIPs = Math.round(kw * ipMultiplier);
        numIPs = override.numIPs !== undefined ? override.numIPs : baseIPs;
      }

      return {
        id: key, sourceId: source.id, sourceType: type,
        name: override.name || source.name || `${type === 'dataCenter' ? 'DC' : 'Site'} ${index + 1}`,
        numIPs, numIPsAuto: type === 'dataCenter' ? ipCalcValue : Math.round(kw * ipMultiplier),
        knowledgeWorkers: kw, role, services, platform,
        dhcpPercent: override.dhcpPercent ?? dhcpPercent,
        dhcpPartner: override.dhcpPartner || null,
        serverCount: override.serverCount || 1,
        addToReport: override.addToReport !== undefined ? override.addToReport : true,
        addToBom: override.addToBom !== undefined ? override.addToBom : true,
        isDisabledInUddi, originalRole: role,
      };
    };

    const dcSites = dataCenters.map((dc, i) => buildBasicSite(dc, i, 'dataCenter'));
    const branchSites = contextSites.map((site, i) => buildBasicSite(site, i, 'site'));
    const allBasicSites = [...dcSites, ...branchSites, ...manualSites.map((s) => ({
      ...s,
      dhcpPartner: siteOverrides[s.id]?.dhcpPartner || s.dhcpPartner || null,
      serverCount: siteOverrides[s.id]?.serverCount || s.serverCount || 1,
    }))];

    // Calculate Hub LPS
    const hubLPSMap = {};
    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const spokeLPS = calculateSiteLPS(site.numIPs, site.dhcpPercent, site.role);
        hubLPSMap[site.dhcpPartner] = (hubLPSMap[site.dhcpPartner] || 0) + spokeLPS;
      }
    });

    // Second pass: Calculate model/tokens
    return allBasicSites.map(site => {
      const isSpoke = !!site.dhcpPartner;
      const hubLPS = hubLPSMap[site.id] || 0;
      const isHub = hubLPS > 0;

      const recommendedModel = getSiteRecommendedModel(
        site.numIPs, site.role, platformMode, site.dhcpPercent,
        leaseTimeSeconds, site.platform, { isSpoke, hubLPS }
      );

      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);

      const baseTokens = getTokensForModel(recommendedModel);
      const serviceImpact = getServiceImpact(site.services);
      const singleServerTokens = Math.ceil(baseTokens * (1 + serviceImpact / 100));
      const adjustedTokens = singleServerTokens * site.serverCount;

      return {
        ...site, recommendedModel,
        hardwareSku: siteOverrides[site.id]?.hardwareSku || defaultHardware,
        hardwareOptions, tokens: adjustedTokens, tokensPerServer: singleServerTokens,
        serviceImpact, isHub, isSpoke, hubLPS,
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, manualSites, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalIPs = sites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const infraTokens = sites.reduce((sum, s) => sum + (s.tokens || 0), 0);

    const tdTokens = parseInt(answers['td-cloud-tokens']) || 0;
    const dossierTokens = parseInt(answers['dossier-tokens']) || 0;
    const lookalikeTokens = parseInt(answers['lookalike-tokens']) || 0;
    const socTokens = parseInt(answers['soc-insights-tokens']) || 0;
    const domainTokens = parseInt(answers['domain-takedown-tokens']) || 0;
    const reportingTokens = parseInt(answers['reporting-tokens']) || 0;
    const securityTokens = securityEnabled ? (tdTokens + dossierTokens + lookalikeTokens + socTokens + domainTokens + reportingTokens) : 0;
    const uddiTokens = uddiEnabled ? (parseInt(answers['uddi-tokens']) || 0) : 0;

    return {
      totalIPs, totalKW, infraTokens, securityTokens, uddiTokens,
      totalTokens: infraTokens + securityTokens + uddiTokens,
      gmCount: sites.filter(s => s.role === 'GM').length,
      gmcCount: sites.filter(s => s.role === 'GMC').length,
      memberCount: sites.filter(s => !['GM', 'GMC'].includes(s.role)).length,
    };
  }, [sites, answers, securityEnabled, uddiEnabled]);

  // GM sizing
  const gmSizing = useMemo(() => {
    if (platformMode === 'UDDI') return null;
    const discoveryEnabled = answers['feature-discovery'] === 'Yes';
    const gmObjects = calculateGMObjects(sites, dhcpPercent, discoveryEnabled);
    const recommendedGM = findMinimumGMModel(gmObjects.totalObjects);
    const gmSites = sites.filter(s => s.role === 'GM' || s.role === 'GMC');
    const serviceWarnings = gmSites
      .filter(s => { const r = gmServiceRestrictions[s.recommendedModel]; return r && !r.canRunServices; })
      .map(s => ({ site: s.name, model: s.recommendedModel, warning: gmServiceRestrictions[s.recommendedModel]?.note }));
    return { ...gmObjects, recommendedGM, serviceWarnings, memberCount: totals.memberCount };
  }, [sites, dhcpPercent, platformMode, answers, totals.memberCount]);

  // BOM
  const bom = useMemo(() => {
    const bomItems = {};
    sites.forEach(site => {
      const sku = site.hardwareSku || 'N/A';
      if (sku !== 'N/A') {
        if (!bomItems[sku]) bomItems[sku] = { sku, description: getSkuDescription(sku), quantity: 0, sites: [] };
        bomItems[sku].quantity += 1;
        bomItems[sku].sites.push(site.name);
      }
    });
    return Object.values(bomItems);
  }, [sites]);

  const partnerSku = useMemo(() => getPartnerSkuFromTokens(totals.totalTokens), [totals.totalTokens]);
  
  // Calculate token packs (500K per pack, rounded up)
  const tokenPacks = useMemo(() => {
    if (platformMode === 'NIOS' || totals.totalTokens <= 0) return null;
    return Math.ceil(totals.totalTokens / 500000);
  }, [totals.totalTokens, platformMode]);

  // Update context with sizing summary
  useEffect(() => {
    setSizingSummary({
      totalTokens: totals.totalTokens, totalIPs: totals.totalIPs,
      partnerSku: partnerSku.sku, siteCount: sites.length,
      infraTokens: totals.infraTokens, securityTokens: totals.securityTokens,
      tokenPack: tokenPacks,
      platformMode: platformMode,
    });
  }, [totals, partnerSku.sku, sites.length, tokenPacks, platformMode, setSizingSummary]);

  // Update site field
  const updateSite = useCallback((siteId, field, value) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    let updates = { [field]: value };
    if (field === 'role' && value !== 'DHCP' && value !== 'DNS/DHCP') updates.dhcpPartner = null;

    // If updating KW, also sync to context (which updates TopBar)
    if (field === 'knowledgeWorkers' && site.sourceType === 'site' && contextUpdateSite) {
      contextUpdateSite(siteId, { knowledgeWorkers: value });
    }

    if (site.sourceType) {
      setSiteOverrides(prev => ({ ...prev, [siteId]: { ...prev[siteId], ...updates } }));
    } else {
      setManualSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s));
    }
  }, [sites, contextUpdateSite]);

  // Add manual site
  const addManualSite = useCallback(() => {
    const newSite = {
      id: `manual-${Date.now()}`, name: `Site ${sites.length + 1}`,
      numIPs: 1000, numIPsAuto: 0, knowledgeWorkers: 0,
      role: 'DNS/DHCP', services: [],
      platform: platformMode === 'UDDI' ? 'NXVS' : 'NIOS',
      dhcpPercent, recommendedModel: 'TE-926',
      hardwareSku: 'TE-906-HW-2AC', hardwareOptions: ['TE-906-HW-2AC', 'TE-906-HW-AC'],
      tokens: 880, serviceImpact: 0,
    };
    setManualSites(prev => [...prev, newSite]);
  }, [sites.length, dhcpPercent, platformMode]);

  // Delete site
  const deleteSite = useCallback((siteId) => {
    setManualSites(prev => prev.filter(s => s.id !== siteId));
    setSiteOverrides(prev => { const next = { ...prev }; delete next[siteId]; return next; });
  }, []);

  // Toggle service
  const toggleService = useCallback((siteId, serviceValue) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    const currentServices = site.services || [];
    const newServices = currentServices.includes(serviceValue)
      ? currentServices.filter(s => s !== serviceValue)
      : [...currentServices, serviceValue];
    updateSite(siteId, 'services', newServices);
  }, [sites, updateSite]);

  // Empty state
  if (sites.length === 0 && dataCenters.length === 0 && contextSites.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Sites Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add Data Centers and Sites in the Quick Capture bar above, or add sites manually.
          </p>
          <Button onClick={addManualSite} data-testid="add-first-site">
            <Plus className="h-4 w-4 mr-2" /> Add Site
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="token-calculator-summary">
      {/* Dialogs */}
      <PlatformChangeAlertDialog
        open={showPlatformAlert}
        onOpenChange={setShowPlatformAlert}
        recommendedMode={recommendedMode}
        pendingPlatformChange={pendingPlatformChange}
        dataCenterCount={dataCenters.length}
        siteCount={contextSites.length}
        onCancel={cancelPlatformChange}
        onConfirm={confirmPlatformChange}
      />

      <WhyThisModelDialog
        open={showModelDialog}
        onOpenChange={setShowModelDialog}
        site={selectedSiteForDialog}
        platformMode={platformMode}
        dhcpPercent={dhcpPercent}
      />

      {/* Site Sizing Table */}
      <Card>
        <CardContent className="pt-4 lg:pt-6">
          {/* Table Controls */}
          <div className="flex items-center justify-between mb-3 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Drawing #:</label>
              <Input
                value={drawingNumber}
                onChange={e => setDrawingNumber(e.target.value)}
                placeholder="Enter drawing number..."
                className="h-8 w-48 text-sm"
                data-testid="drawing-number-input"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={showHardware}
                  onCheckedChange={setShowHardware}
                  data-testid="show-hardware-toggle"
                />
                <span className="text-muted-foreground">Show Hardware SKU</span>
              </label>

              <Button
                variant="outline" size="sm"
                onClick={() => exportDrawing(sites, drawingNumber)}
                className="text-xs"
                data-testid="export-drawing-button"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export Drawing
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-auto w-full">
              <SizingTableHeader showHardware={showHardware} platformMode={platformMode} />
              <TableBody>
                {sites.map(site => (
                  <SiteTableRow
                    key={site.id}
                    site={site}
                    sites={sites}
                    platformMode={platformMode}
                    dhcpPercent={dhcpPercent}
                    roleOptions={roleOptions}
                    platformOptions={platformOptions}
                    showHardware={showHardware}
                    onUpdateSite={updateSite}
                    onToggleService={toggleService}
                    onDeleteSite={deleteSite}
                    onOpenModelDialog={openModelDialog}
                  />
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="p-2 lg:p-4" colSpan={2}>Total</TableCell>
                  <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalIPs)}</TableCell>
                  <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalKW)}</TableCell>
                  <TableCell className="p-2 lg:p-4" colSpan={showHardware ? 6 : 5}></TableCell>
                  {platformMode !== 'NIOS' && (
                    <TableCell className="p-2 lg:p-4 text-right tabular-nums text-sm lg:text-base">
                      <div className="flex flex-col items-end">
                        <span className="font-bold">{Math.ceil(totals.infraTokens / 500000)}</span>
                        <span className="text-xs text-muted-foreground">{formatNumber(totals.infraTokens)} tkns</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="p-2 lg:p-4" colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Add Site Button */}
          <div className="flex items-center justify-between mt-4 lg:mt-6">
            <Button variant="outline" size="sm" className="text-xs lg:text-sm" onClick={addManualSite} data-testid="add-site-button">
              <Plus className="h-4 w-4 mr-1" /> Add Site
            </Button>
            <p className="text-xs lg:text-sm text-muted-foreground">
              <Info className="h-3 w-3 lg:h-4 lg:w-4 inline mr-1" />
              Sites auto-sync from Quick Capture. All fields are editable.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TokenCalculatorSummary;
