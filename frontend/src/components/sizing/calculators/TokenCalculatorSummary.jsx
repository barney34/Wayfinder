import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { exportCSV, exportYAML, exportExcel, exportPDF, exportForLucid } from "./SizingExports";
import { PlatformChangeAlertDialog, WhyThisModelDialog } from "./SizingDialogs";
import { SiteTableRow, LocationHeaderRow } from "./SiteTableRow";
import { SizingTableHeader } from "./SizingTableHeader";
import { DrawingTabs, useDrawings, CompareDrawingsDialog, CopySiteToDrawingMenu } from "./DrawingManager";
import { computeUnitAssignments, getUnitLetterForRole } from "./unitDesignations";

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
    updateSite: contextUpdateSite, updateDataCenter: contextUpdateDC, addDataCenter: contextAddDC, addSite: contextAddSite,
    deleteSite: contextDeleteSite, deleteDataCenter: contextDeleteDC,
    saveToServer
  } = useDiscovery();

  // Site overrides state (manual sites now use context via addSite)
  const [siteOverrides, setSiteOverrides] = useState({});

  // Multiple drawings management
  const {
    drawings,
    activeDrawing,
    activeDrawingId,
    setActiveDrawingId,
    addDrawing,
    copyDrawing,
    deleteDrawing,
    renameDrawing,
    updateDrawingSites,
    copySiteToDrawing,
  } = useDrawings([]);

  // Compare dialog state
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Alert dialog state for platform change confirmation
  const [showPlatformAlert, setShowPlatformAlert] = useState(false);
  const [pendingPlatformChange, setPendingPlatformChange] = useState(null);

  // UI toggle for Hardware SKU column
  const [showHardware, setShowHardware] = useState(false);
  // UI toggle for KW column (hidden by default like Hardware SKU)
  const [showKW, setShowKW] = useState(false);
  // UI toggle for Services column (hidden by default)
  const [showServices, setShowServices] = useState(true);
  // "Export View" mode - shows only exportable columns
  const [exportView, setExportView] = useState(false);

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
      // KW comes directly from source (context) - not from override
      const kw = source.knowledgeWorkers || 0;

      let defaultRole = 'DNS/DHCP';
      if (type === 'dataCenter' && platformMode !== 'UDDI') {
        defaultRole = index === 0 ? 'GM' : 'GMC';
      }

      let role = override.role || defaultRole;
      const isGmRole = role === 'GM' || role === 'GMC' || role.startsWith('GM+') || role.startsWith('GMC+');
      const isDisabledInUddi = platformMode === 'UDDI' && (role === 'GM' || role === 'GMC');
      const services = override.services || [];

      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      else if (platformMode === 'Hybrid' && type !== 'dataCenter') defaultPlatform = 'NXVS';

      let platform = override.platform || defaultPlatform;
      if (platformMode === 'UDDI' && !isGmRole) {
        if (platform === 'NIOS' || platform === 'NIOS-V' || platform === 'NIOS-PHA' || platform === 'NIOS-VHA') platform = 'NXVS';
      }

      let numIPs;
      if (type === 'dataCenter') {
        numIPs = override.numIPs !== undefined ? override.numIPs : ipCalcValue;
        const serviceIPs = (role === 'GM' || role === 'GMC' || role.startsWith('GM+') || role.startsWith('GMC+')) ? services.length * 100 : 0;
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
        haEnabled: override.haEnabled || false, // HA checkbox - doubles SW instances
        hwCount: override.hwCount, // User-editable HW count (undefined = auto)
        swAddons: override.swAddons || [], // SW Add-ons array
        hwAddons: override.hwAddons || [], // HW Add-ons array
        rptQuantity: override.rptQuantity || null, // RPT quantity for Reporting role
        addToReport: override.addToReport !== undefined ? override.addToReport : true,
        addToBom: override.addToBom !== undefined ? override.addToBom : true,
        unitLetterOverride: override.unitLetterOverride || null,
        unitNumberOverride: override.unitNumberOverride !== undefined ? override.unitNumberOverride : undefined,
        groupingMode: override.groupingMode || 'individual',
        customGroups: override.customGroups || [],
        isDisabledInUddi, originalRole: role,
      };
    };

    const dcSites = dataCenters.map((dc, i) => buildBasicSite(dc, i, 'dataCenter'));
    const branchSites = contextSites.map((site, i) => buildBasicSite(site, i, 'site'));
    const allBasicSites = [...dcSites, ...branchSites];

    // Calculate Hub LPS - Hub needs to handle 50% of combined spoke capacity for failover
    const HUB_FAILOVER_CAPACITY = 0.5; // 50% of spoke LPS added to hub
    const hubLPSMap = {};
    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const spokeLPS = calculateSiteLPS(site.numIPs, site.dhcpPercent, site.role);
        // Hub only needs 50% of spoke capacity for failover scenarios
        hubLPSMap[site.dhcpPartner] = (hubLPSMap[site.dhcpPartner] || 0) + Math.ceil(spokeLPS * HUB_FAILOVER_CAPACITY);
      }
    });

    // Second pass: Calculate model/tokens with HA logic
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
      
      // HA doubles the SW instances (serverCount * 2 if HA enabled)
      const haMultiplier = site.haEnabled ? 2 : 1;
      const swInstances = site.serverCount * haMultiplier;
      const adjustedTokens = singleServerTokens * swInstances;
      
      // HW count: if includeHW is false, always 0. Otherwise user can override, or defaults based on platform
      const isVirtualOrCloud = site.platform?.includes('NXVS') || site.platform?.includes('NXaaS') || 
                               site.platform === 'NIOS-V';
      const defaultHwCount = isVirtualOrCloud ? 0 : swInstances;
      const hwCount = site.includeHW === false ? 0 : (site.hwCount !== undefined ? site.hwCount : defaultHwCount);

      return {
        ...site, recommendedModel,
        hardwareSku: siteOverrides[site.id]?.hardwareSku || defaultHardware,
        hardwareOptions, tokens: adjustedTokens, tokensPerServer: singleServerTokens,
        serviceImpact, isHub, isSpoke, hubLPS,
        swInstances, // Calculated: serverCount * (HA ? 2 : 1)
        hwCount, // User-editable or auto-calculated, 0 if includeHW=false
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue]);

  // Expand sites into display rows — combined groups collapse into single rows
  const expandedServers = useMemo(() => {
    const result = [];
    sites.forEach(site => {
      const count = site.serverCount || 1;
      if (count <= 1) {
        // Single server — render as normal row
        result.push({ ...site, _isExpanded: false, _serverIndex: 0, _parentSiteId: site.id });
      } else {
        const serverOverrides = siteOverrides[site.id]?.servers || {};
        const groupMode = site.groupingMode || 'individual';
        const customGroups = site.customGroups || [];
        
        if (groupMode === 'combined') {
          // ALL combined into ONE row — collapse N servers into 1 display row
          const srvOvr = serverOverrides[0] || {}; // use first server's overrides as base
          result.push({
            ...site,
            id: `${site.id}__grp__1-${count}`,
            name: srvOvr.name || site.name,
            numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
            role: srvOvr.role || site.role,
            services: srvOvr.services || site.services,
            platform: srvOvr.platform || site.platform,
            haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
            unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
            _groupRange: `1-${count}`,
            _groupMode: groupMode,
            _isExpanded: true,
            _serverIndex: 0,
            _parentSiteId: site.id,
            _parentName: site.name,
            _serverCount: count, // original count for display
            serverCount: 1, // display as 1 row
            swInstances: count * (site.haEnabled ? 2 : 1), // sum of all server SW instances
            hwCount: site.hwCount !== undefined ? site.hwCount : count,
          });
        } else if (groupMode === 'custom' && customGroups.length > 0) {
          // Custom groups: each range → 1 row, ungrouped → individual rows
          const grouped = new Set();
          customGroups.forEach(([s, e]) => {
            for (let i = s; i <= e; i++) grouped.add(i);
            const srvOvr = serverOverrides[s - 1] || {};
            const rangeCount = e - s + 1;
            result.push({
              ...site,
              id: `${site.id}__grp__${s}-${e}`,
              name: srvOvr.name || site.name,
              numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
              role: srvOvr.role || site.role,
              services: srvOvr.services || site.services,
              platform: srvOvr.platform || site.platform,
              haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
              unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
              _groupRange: s === e ? null : `${s}-${e}`,
              _groupMode: groupMode,
              _isExpanded: true,
              _serverIndex: s - 1,
              _parentSiteId: site.id,
              _parentName: site.name,
              _serverCount: rangeCount,
              serverCount: 1,
              swInstances: rangeCount * (site.haEnabled ? 2 : 1),
              hwCount: site.hwCount !== undefined ? Math.round(site.hwCount * rangeCount / count) : rangeCount,
            });
          });
          // Ungrouped servers → individual rows
          for (let i = 1; i <= count; i++) {
            if (!grouped.has(i)) {
              const srvOvr = serverOverrides[i - 1] || {};
              result.push({
                ...site,
                id: `${site.id}__srv__${i - 1}`,
                name: srvOvr.name || site.name,
                numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
                role: srvOvr.role || site.role,
                services: srvOvr.services || site.services,
                platform: srvOvr.platform || site.platform,
                haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
                unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
                _groupRange: null,
                _groupMode: groupMode,
                _isExpanded: true,
                _serverIndex: i - 1,
                _parentSiteId: site.id,
                _parentName: site.name,
                serverCount: 1,
                swInstances: site.haEnabled ? 2 : 1,
                hwCount: site.hwCount !== undefined ? Math.max(1, Math.round(site.hwCount / count)) : 1,
              });
            }
          }
        } else {
          // Individual mode — each server is its own row
          for (let i = 0; i < count; i++) {
            const srvOvr = serverOverrides[i] || {};
            result.push({
              ...site,
              id: `${site.id}__srv__${i}`,
              name: srvOvr.name || site.name,
              numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
              role: srvOvr.role || site.role,
              services: srvOvr.services || site.services,
              platform: srvOvr.platform || site.platform,
              haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
              unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
              unitNumberOverride: srvOvr.unitNumberOverride !== undefined ? srvOvr.unitNumberOverride : undefined,
              _groupRange: null,
              _groupMode: groupMode,
              _isExpanded: true,
              _serverIndex: i,
              _parentSiteId: site.id,
              _parentName: site.name,
              serverCount: 1,
              swInstances: srvOvr.haEnabled ? 2 : (site.haEnabled ? 2 : 1),
              hwCount: srvOvr.hwCount !== undefined ? srvOvr.hwCount : (site.hwCount !== undefined ? Math.max(1, Math.round(site.hwCount / count)) : undefined),
            });
          }
        }
      }
    });
    return result;
  }, [sites, siteOverrides]);

  // Compute unit assignments on expanded servers (global numbering across all individual servers)
  const unitAssignments = useMemo(() => {
    const serversForUnit = expandedServers.map(srv => ({
      id: srv.id,
      role: srv.role,
      unitLetterOverride: srv.unitLetterOverride || null,
    }));
    return computeUnitAssignments(serversForUnit);
  }, [expandedServers]);

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

  // Update site field — handles both regular sites and expanded server sub-rows
  const updateSite = useCallback((siteId, field, value) => {
    // Check if this is a server sub-row update (id contains __srv__)
    const srvMatch = siteId.match(/^(.+)__srv__(\d+)$/);
    if (srvMatch) {
      const parentId = srvMatch[1];
      const srvIndex = parseInt(srvMatch[2]);
      // Store in server-level overrides
      setSiteOverrides(prev => {
        const parentOvr = prev[parentId] || {};
        const servers = { ...(parentOvr.servers || {}) };
        servers[srvIndex] = { ...(servers[srvIndex] || {}), [field]: value };
        return { ...prev, [parentId]: { ...parentOvr, servers } };
      });
      return;
    }

    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    let updates = { [field]: value };
    if (field === 'role' && value !== 'DHCP' && value !== 'DNS/DHCP') updates.dhcpPartner = null;

    // If updating KW, sync to context (which updates TopBar) and DON'T add to local override
    if (field === 'knowledgeWorkers' && site.sourceType) {
      if (site.sourceType === 'site' && contextUpdateSite) {
        contextUpdateSite(site.sourceId, { knowledgeWorkers: value });
        return;
      } else if (site.sourceType === 'dataCenter' && contextUpdateDC) {
        contextUpdateDC(site.sourceId, { knowledgeWorkers: value });
        return;
      }
    }

    // All sites (from context) use overrides for non-KW fields
    setSiteOverrides(prev => ({ ...prev, [siteId]: { ...prev[siteId], ...updates } }));
  }, [sites, contextUpdateSite, contextUpdateDC]);

  // Add manual site - uses context to persist across navigation
  const addManualSite = useCallback(() => {
    const newSiteName = `Site ${sites.length + 1}`;
    // Use context addSite function - sites are persisted in context and saved to server
    if (contextAddSite) {
      // Add to the first data center if one exists, otherwise create without parent
      const parentDcId = dataCenters.length > 0 ? dataCenters[0].id : null;
      contextAddSite(newSiteName, parentDcId, 0); // name, dataCenterId, knowledgeWorkers
    }
  }, [sites.length, dataCenters, contextAddSite]);

  // Add manual data center - syncs to TopBar and updates Discovery # of Data Centers
  // Uses async/await to ensure state is persisted before any navigation
  const addManualDataCenter = useCallback(async () => {
    const currentDCCount = dataCenters.length;
    const newDCName = `Data Center ${currentDCCount + 1}`;
    
    // Add to context (shows in TopBar)
    if (contextAddDC) {
      contextAddDC(newDCName, 0); // name, knowledgeWorkers
    }
    
    // Update "# of Data Centers" answer (ud-5) to match the new count
    const newCount = String(currentDCCount + 1);
    console.log(`[addManualDataCenter] Setting ud-5 to ${newCount}`);
    setAnswer('ud-5', newCount);
    
    // Force immediate save to server to persist changes before any navigation
    // This prevents the race condition where debounced auto-save loses the change
    if (saveToServer) {
      try {
        await saveToServer();
        console.log(`[addManualDataCenter] Saved to server successfully`);
      } catch (err) {
        console.error(`[addManualDataCenter] Save failed:`, err);
      }
    }
    
  }, [dataCenters.length, contextAddDC, setAnswer, saveToServer]);

  // Delete site - removes from context and local overrides
  const deleteSite = useCallback((siteId) => {
    console.log('[deleteSite] Deleting site:', siteId);
    
    // Remove local overrides
    setSiteOverrides(prev => { 
      const next = { ...prev }; 
      delete next[siteId]; 
      return next; 
    });
    
    // Find the site to determine if it's a DC or site
    const site = sites.find(s => s.id === siteId);
    console.log('[deleteSite] Found site:', site);
    
    if (site) {
      if (site.sourceType === 'dataCenter' && contextDeleteDC) {
        console.log('[deleteSite] Deleting DC with sourceId:', site.sourceId);
        contextDeleteDC(site.sourceId);
      } else if (site.sourceType === 'site' && contextDeleteSite) {
        console.log('[deleteSite] Deleting Site with sourceId:', site.sourceId);
        contextDeleteSite(site.sourceId);
      }
    }
  }, [sites, contextDeleteDC, contextDeleteSite]);

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
        <CardContent className="pt-4 lg:pt-6 p-0">
          {/* Sticky header area — tabs, toolbar, Drawing #, column headers */}
          <div className="sticky top-0 z-30 bg-card px-4 lg:px-6 pt-4 lg:pt-6 pb-0 border-b border-border">
            {/* Drawing Tabs */}
            <DrawingTabs
            drawings={drawings}
            activeDrawingId={activeDrawingId}
            onSelectDrawing={setActiveDrawingId}
            onAddDrawing={addDrawing}
            onCopyDrawing={copyDrawing}
            onDeleteDrawing={deleteDrawing}
            onRenameDrawing={renameDrawing}
            onCompare={() => setShowCompareDialog(true)}
          />

          {/* Compare Dialog */}
          <CompareDrawingsDialog
            open={showCompareDialog}
            onOpenChange={setShowCompareDialog}
            drawings={drawings}
          />

          {/* Table Controls */}
            <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Export View Toggle */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={exportView}
                  onCheckedChange={(v) => {
                    setExportView(v);
                    if (v) {
                      // In export view, hide non-export columns
                      setShowKW(false);
                      setShowServices(false);
                    }
                  }}
                  data-testid="export-view-toggle"
                />
                <span className="text-muted-foreground font-medium">Export View</span>
              </label>

              {!exportView && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showKW}
                      onCheckedChange={setShowKW}
                      data-testid="show-kw-toggle"
                    />
                    <span className="text-muted-foreground">KW</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showServices}
                      onCheckedChange={setShowServices}
                      data-testid="show-services-toggle"
                    />
                    <span className="text-muted-foreground">Services</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showHardware}
                      onCheckedChange={setShowHardware}
                      data-testid="show-hardware-toggle"
                    />
                    <span className="text-muted-foreground">HW SKU</span>
                  </label>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => exportForLucid(sites, activeDrawing?.name || '10')}
                className="text-xs"
                data-testid="export-drawing-button"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export for Lucid
              </Button>
            </div>
          </div>

          {/* Drawing # Header */}
          <div className="flex items-center gap-2 mb-0 mt-2">
            <span className="text-lg font-bold text-primary">Drawing #{activeDrawing?.name || '10'}</span>
            <span className="text-sm text-muted-foreground">({sites.length} sites)</span>
          </div>
          </div>{/* end sticky header area */}

          <div className="px-4 lg:px-6 pb-4 lg:pb-6">
          <div className="border rounded-lg overflow-auto" style={{ maxHeight: '50vh' }}>
            <Table className="table-auto w-full">
              <SizingTableHeader 
                showHardware={showHardware} 
                showKW={showKW && !exportView} 
                showServices={showServices && !exportView}
                platformMode={platformMode}
                exportView={exportView}
              />
              <TableBody>
                {(() => {
                  // Calculate total visible columns for the location header colSpan
                  let totalCols = 12; // base: Unit, #, Location, IPs, Role, DHCP, Srv#, HA, Platform, Model, SW#, HW#
                  if (showKW && !exportView) totalCols++;
                  if (showServices && !exportView) totalCols++;
                  if (showHardware) totalCols++;
                  if (platformMode !== 'NIOS') totalCols++; // tokens
                  if (platformMode === 'NIOS') totalCols += 2; // SW Add-ons, HW Add-ons
                  totalCols += 3; // Rpt, BOM, Actions
                  
                  const rows = [];
                  let lastParentId = null;
                  
                  expandedServers.forEach((srv, idx) => {
                    const parentSite = sites.find(s => s.id === srv._parentSiteId);
                    
                    // Show location header when entering a new location group with multiple servers
                    if (srv._isExpanded && srv._parentSiteId !== lastParentId && parentSite) {
                      rows.push(
                        <LocationHeaderRow
                          key={`header-${srv._parentSiteId}`}
                          site={parentSite}
                          onUpdateSite={updateSite}
                          onDeleteSite={deleteSite}
                          totalColumns={totalCols}
                        />
                      );
                    }
                    lastParentId = srv._parentSiteId;
                    
                    rows.push(
                      <SiteTableRow
                        key={srv.id}
                        site={srv}
                        sites={sites}
                        drawings={drawings}
                        activeDrawingId={activeDrawingId}
                        platformMode={platformMode}
                        dhcpPercent={dhcpPercent}
                        roleOptions={roleOptions}
                        platformOptions={platformOptions}
                        showHardware={showHardware}
                        showKW={showKW && !exportView}
                        showServices={showServices && !exportView}
                        exportView={exportView}
                        onUpdateSite={updateSite}
                        onToggleService={(srvId, svcVal) => {
                          // Route toggle to server-level if expanded
                          if (srv._isExpanded) {
                            const parentId = srv._parentSiteId;
                            const srvIndex = srv._serverIndex;
                            setSiteOverrides(prev => {
                              const parentOvr = prev[parentId] || {};
                              const servers = { ...(parentOvr.servers || {}) };
                              const srvOvr = servers[srvIndex] || {};
                              const currentServices = srvOvr.services || srv.services || [];
                              const newServices = currentServices.includes(svcVal)
                                ? currentServices.filter(s => s !== svcVal)
                                : [...currentServices, svcVal];
                              servers[srvIndex] = { ...srvOvr, services: newServices };
                              return { ...prev, [parentId]: { ...parentOvr, servers } };
                            });
                          } else {
                            toggleService(srvId, svcVal);
                          }
                        }}
                        onDeleteSite={srv._isExpanded ? () => {
                          // For expanded servers, reduce serverCount instead of deleting
                          const parentSite2 = sites.find(s => s.id === srv._parentSiteId);
                          if (parentSite2 && parentSite2.serverCount > 1) {
                            updateSite(srv._parentSiteId, 'serverCount', parentSite2.serverCount - 1);
                          } else {
                            deleteSite(srv._parentSiteId);
                          }
                        } : deleteSite}
                        onOpenModelDialog={openModelDialog}
                        onCopySiteToDrawing={copySiteToDrawing}
                        unitAssignment={unitAssignments[srv.id]}
                      />
                    );
                  });
                  return rows;
                })()}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="p-2 lg:p-4" colSpan={2}></TableCell>
                  <TableCell className="p-2 lg:p-4 text-sm">
                    <span className="font-semibold">Total</span>
                    <span className="text-xs text-muted-foreground ml-2">({sites.length} sites)</span>
                  </TableCell>
                  <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalIPs)}</TableCell>
                  {showKW && (
                    <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalKW)}</TableCell>
                  )}
                  <TableCell className="p-2 lg:p-4" colSpan={showServices ? 2 : 1}></TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                  {showHardware && <TableCell className="p-2 lg:p-4"></TableCell>}
                  <TableCell className="p-2 lg:p-4 text-center tabular-nums">
                    {sites.reduce((sum, s) => sum + (s.swInstances || 0), 0)}
                  </TableCell>
                  <TableCell className="p-2 lg:p-4 text-center tabular-nums">
                    {sites.reduce((sum, s) => sum + (s.hwCount || 0), 0)}
                  </TableCell>
                  {platformMode !== 'NIOS' && (
                    <TableCell className="p-2 lg:p-4 text-right tabular-nums text-sm lg:text-base">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-bold">{Math.ceil(totals.infraTokens / 500000)}</span>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div><strong>Total tokens:</strong> {formatNumber(totals.infraTokens)}</div>
                              <div><strong>Token packs:</strong> {Math.ceil(totals.infraTokens / 500000)} (500K per pack)</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  <TableCell className="p-2 lg:p-4" colSpan={3}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Add Site / Add Data Center Buttons */}
          <div className="flex items-center justify-between mt-4 lg:mt-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs lg:text-sm" onClick={addManualSite} data-testid="add-site-button">
                <Plus className="h-4 w-4 mr-1" /> Add Site
              </Button>
              <Button variant="outline" size="sm" className="text-xs lg:text-sm" onClick={addManualDataCenter} data-testid="add-dc-button">
                <Plus className="h-4 w-4 mr-1" /> Add Data Center
              </Button>
            </div>
            <p className="text-xs lg:text-sm text-muted-foreground">
              <Info className="h-3 w-3 lg:h-4 lg:w-4 inline mr-1" />
              Sites auto-sync from Quick Capture. All fields are editable.
            </p>
          </div>
          </div>{/* end px wrapper */}
        </CardContent>
      </Card>
    </div>
  );
}

export default TokenCalculatorSummary;
