import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Server, Plus, Info, FileSpreadsheet, ArrowUpDown, ChevronUp, ChevronDown, Columns3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  getSiteRecommendedModel,
  getDefaultHardwareSku,
  getHardwareSkuOptions,
  calculateSiteLPS,
  calculateSiteDhcpObjects,
  validateDhcpFoLimits,
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
    dataCenters = [], sites: contextSites = [], answers = {}, setAnswer, setPlatformMode, setSizingSummary,
    updateSite: contextUpdateSite, updateDataCenter: contextUpdateDC, addDataCenter: contextAddDC, addSite: contextAddSite,
    deleteSite: contextDeleteSite, deleteDataCenter: contextDeleteDC,
    saveToServer,
    // Drawing management from context
    drawings, activeDrawingId, drawingConfigs,
    getDrawingConfig, updateDrawingConfig,
    setActiveDrawingId, addDrawing, cloneDrawing: ctxCloneDrawing, deleteDrawing, renameDrawing,
  } = useDiscovery();

  // Get active drawing config — all per-drawing state lives here
  const activeDrawingConfig = getDrawingConfig(activeDrawingId);
  const siteOverrides = useMemo(
    () => activeDrawingConfig.siteOverrides || {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDrawingId, drawingConfigs]
  );
  const siteOrder = activeDrawingConfig.siteOrder || null;

  // Setters that write to active drawing config
  const setSiteOverrides = useCallback((updater) => {
    const current = getDrawingConfig(activeDrawingId).siteOverrides || {};
    const next = typeof updater === 'function' ? updater(current) : updater;
    updateDrawingConfig(activeDrawingId, { siteOverrides: next });
  }, [activeDrawingId, getDrawingConfig, updateDrawingConfig]);

  const setSiteOrder = useCallback((order) => {
    updateDrawingConfig(activeDrawingId, { siteOrder: order });
  }, [activeDrawingId, updateDrawingConfig]);

  // Drawing clone/copy adapters
  const copyDrawing = useCallback((drawingId) => {
    ctxCloneDrawing(drawingId);
  }, [ctxCloneDrawing]);

  const copySiteToDrawing = useCallback((site, targetDrawingId) => {
    // Store a copy of the site's override in the target drawing
    const srcOverrideKey = `site-${site.sourceId}` || site.id;
    const srcOverride = siteOverrides[srcOverrideKey] || {};
    updateDrawingConfig(targetDrawingId, {
      siteOverrides: {
        ...(getDrawingConfig(targetDrawingId).siteOverrides || {}),
        [srcOverrideKey]: { ...srcOverride },
      }
    });
  }, [siteOverrides, getDrawingConfig, updateDrawingConfig]);

  // Compare dialog state
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Alert dialog state for platform change confirmation
  const [showPlatformAlert, setShowPlatformAlert] = useState(false);
  const [pendingPlatformChange, setPendingPlatformChange] = useState(null);

  // UI toggle for Hardware SKU column
  const [showHardware, setShowHardware] = useState(false);
  const [showKW, setShowKW] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [exportView, setExportView] = useState(false);

  // "Why this model?" dialog state
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [selectedSiteForDialog, setSelectedSiteForDialog] = useState(null);

  const openModelDialog = useCallback((site) => {
    setSelectedSiteForDialog(site);
    setShowModelDialog(true);
  }, []);

  // ── Per-drawing platform mode (shadows global platformMode) ─────────────────
  // Each drawing has its own platformMode stored in drawingConfigs
  // MUST be defined BEFORE handlePlatformModeChange to avoid TDZ error
  const platformMode = activeDrawingConfig.platformMode || 'NIOS';
  const securityEnabled = activeDrawingConfig.featureSecurity ?? (answers['feature-security'] === 'Yes');
  const uddiEnabled = activeDrawingConfig.featureUDDI ?? (answers['feature-uddi'] === 'Yes');

  // Recommended platform based on DC/Site counts
  const recommendedMode = useMemo(() =>
    getRecommendedPlatformMode(dataCenters.length, contextSites.length),
    [dataCenters.length, contextSites.length]
  );

  // Handle platform mode change with confirmation for non-recommended
  // Now updates ACTIVE DRAWING config only (not global)
  const handlePlatformModeChange = useCallback((newMode) => {
    if (!newMode) return;
    if (newMode !== recommendedMode && platformMode === recommendedMode) {
      setPendingPlatformChange(newMode);
      setShowPlatformAlert(true);
    } else {
      updateDrawingConfig(activeDrawingId, {
        platformMode: newMode,
        featureNIOS: newMode === 'NIOS' || newMode === 'Hybrid',
        featureUDDI: newMode === 'UDDI' || newMode === 'Hybrid',
      });
    }
  }, [recommendedMode, platformMode, updateDrawingConfig, activeDrawingId]);

  const confirmPlatformChange = useCallback(() => {
    if (pendingPlatformChange) {
      updateDrawingConfig(activeDrawingId, {
        platformMode: pendingPlatformChange,
        featureNIOS: pendingPlatformChange === 'NIOS' || pendingPlatformChange === 'Hybrid',
        featureUDDI: pendingPlatformChange === 'UDDI' || pendingPlatformChange === 'Hybrid',
      });
    }
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, [pendingPlatformChange, updateDrawingConfig, activeDrawingId]);

  const cancelPlatformChange = useCallback(() => {
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, []);

  // Global settings
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;

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
      // Handle both old format (double prefix) and new format (single prefix)
      // Old data has keys like "site-site-xxx" or "dc-dc-xxx"
      // New data has keys like "site-xxx" or "dc-xxx"
      const hasPrefix = source.id.startsWith('site-') || source.id.startsWith('dc-');
      const singleKey = hasPrefix ? source.id : (type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`);
      const doubleKey = type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`;
      // Try single-prefix first (new format), fall back to double-prefix (old format)
      const override = siteOverrides[singleKey] || siteOverrides[doubleKey] || {};
      // Use single-key format for id (consistent going forward)
      const key = singleKey;
      // KW comes directly from source (context) - not from override
      const kw = source.knowledgeWorkers || 0;

      let defaultRole = 'DNS/DHCP';
      if (type === 'dataCenter' && platformMode !== 'UDDI') {
        defaultRole = index === 0 ? 'GM' : 'GMC';
      }

      let role = override.role || source.role || defaultRole;
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
        sfpAddons: override.sfpAddons || {}, // SFP add-ons with quantity { 'IB-SFP-CO': 4 }
        perfFeatures: override.perfFeatures || [], // Performance features (DTC, SYSLOG, etc.)
        rptQuantity: override.rptQuantity || null, // RPT quantity for Reporting role
        addToReport: override.addToReport !== undefined ? override.addToReport : true,
        addToBom: override.addToBom !== undefined ? override.addToBom : true,
        unitLetterOverride: override.unitLetterOverride || null,
        unitNumberOverride: override.unitNumberOverride !== undefined ? override.unitNumberOverride : undefined,
        groupingMode: override.groupingMode || 'individual',
        customGroups: override.customGroups || [],
        description: override.description || '',
        isDisabledInUddi, originalRole: role,
      };
    };

    const dcSites = dataCenters.map((dc, i) => buildBasicSite(dc, i, 'dataCenter'));
    const branchSites = contextSites.map((site, i) => buildBasicSite(site, i, 'site'));
    const naturalOrder = [...dcSites, ...branchSites];

    // Apply manual sort order if set — determines drawing display & export order
    let allBasicSites;
    if (siteOrder && siteOrder.length > 0) {
      const idToSite = Object.fromEntries(naturalOrder.map(s => [s.id, s]));
      const ordered = siteOrder.map(id => idToSite[id]).filter(Boolean);
      const inOrder = new Set(siteOrder);
      naturalOrder.forEach(s => { if (!inOrder.has(s.id)) ordered.push(s); });
      allBasicSites = ordered;
    } else {
      allBasicSites = naturalOrder;
    }

    // === DHCP FO: Calculate Hub LPS + FO Object Replication ===
    // Pass 1: Determine who is a spoke (has a partner) and compute LPS + DHCP objects
    const HUB_FAILOVER_CAPACITY = 0.5; // 50% of spoke LPS added to hub
    const hubLPSMap = {};       // hubId → aggregate LPS from all spokes
    const foObjectsMap = {};    // siteId → DHCP objects replicated from FO partner(s)
    const partnerCountMap = {}; // hubId → number of sites pointing to it

    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const spokeLPS = calculateSiteLPS(site.numIPs, site.dhcpPercent, site.role);
        const spokeDhcpObjs = calculateSiteDhcpObjects(site.numIPs, site.dhcpPercent);
        // Hub gets aggregate LPS from spokes (50% of each spoke)
        hubLPSMap[site.dhcpPartner] = (hubLPSMap[site.dhcpPartner] || 0) + Math.ceil(spokeLPS * HUB_FAILOVER_CAPACITY);
        // Hub gets ALL spoke DHCP objects (FO replication — whole object count)
        foObjectsMap[site.dhcpPartner] = (foObjectsMap[site.dhcpPartner] || 0) + spokeDhcpObjs;
        // Count partners per hub
        partnerCountMap[site.dhcpPartner] = (partnerCountMap[site.dhcpPartner] || 0) + 1;
      }
    });

    // Spoke gets partner's (hub's) DHCP objects replicated to it
    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const partnerSite = allBasicSites.find(s => s.id === site.dhcpPartner);
        if (partnerSite) {
          const partnerDhcpObjs = calculateSiteDhcpObjects(partnerSite.numIPs, partnerSite.dhcpPercent);
          foObjectsMap[site.id] = (foObjectsMap[site.id] || 0) + partnerDhcpObjs;
        }
      }
    });

    // === Pass 2: Calculate model/tokens with HA, FO objects, and perf features ===
    return allBasicSites.map(site => {
      const isSpoke = !!site.dhcpPartner;
      const hubLPS = hubLPSMap[site.id] || 0;
      const isHub = hubLPS > 0;
      const foObjects = foObjectsMap[site.id] || 0;
      const partnerCount = partnerCountMap[site.id] || 0;

      // Reporting → force virtual platform; ND → force NIOS physical if not already set
      const effectivePlatform = site.role === 'Reporting'
        ? (site.platform || 'NIOS-V')   // RPT defaults to virtual
        : site.platform;

      // Auto-inject DHCP-FO into perfFeatures when site is in an FO relationship
      // This ensures the 50% LPS penalty is applied to BOTH hub and spoke
      const basePerfFeatures = site.perfFeatures || [];
      const effectivePerfFeatures = (isHub || isSpoke) && !basePerfFeatures.includes('DHCP-FO')
        ? [...basePerfFeatures, 'DHCP-FO']
        : basePerfFeatures;

      const recommendedModel = getSiteRecommendedModel(
        site.numIPs, site.role, platformMode, site.dhcpPercent,
        leaseTimeSeconds, effectivePlatform,
        { isSpoke, hubLPS, foObjects, perfFeatures: effectivePerfFeatures }
      );

      // Validate DHCP FO association limits
      let foWarning = null;
      if (isHub || isSpoke) {
        const totalFoIPs = isHub
          ? site.numIPs + allBasicSites.filter(s => s.dhcpPartner === site.id).reduce((sum, s) => sum + s.numIPs, 0)
          : site.numIPs + (allBasicSites.find(s => s.id === site.dhcpPartner)?.numIPs || 0);
        const validation = validateDhcpFoLimits(recommendedModel, totalFoIPs);
        if (!validation.valid) foWarning = validation.warning;
      }

      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);

      // CDC role: no tokens — it's a design reference only, not a token-bearing server
      const isCDC = site.role === 'CDC';
      const baseTokens = isCDC ? 0 : getTokensForModel(recommendedModel, effectivePlatform);
      const serviceImpact = getServiceImpact(site.services);
      const singleServerTokens = isCDC ? 0 : Math.ceil(baseTokens * (1 + serviceImpact / 100));
      
      // HA doubles the SW instances (serverCount * 2 if HA enabled)
      const haMultiplier = site.haEnabled ? 2 : 1;
      const swInstances = site.serverCount * haMultiplier;
      const adjustedTokens = singleServerTokens * swInstances;
      
      // HW count: Reporting is always virtual (0 HW). ND is physical.
      const isVirtualOrCloud = effectivePlatform !== 'NIOS' && effectivePlatform !== 'NX-P'
        || site.role === 'Reporting';
      const defaultHwCount = isVirtualOrCloud ? 0 : swInstances;
      const hwCount = site.includeHW === false ? 0 : (site.hwCount !== undefined ? site.hwCount : defaultHwCount);

      return {
        ...site,
        platform: effectivePlatform,
        recommendedModel,
        hardwareSku: siteOverrides[site.id]?.hardwareSku || defaultHardware,
        hardwareOptions, tokens: adjustedTokens, tokensPerServer: singleServerTokens,
        serviceImpact, isHub, isSpoke, hubLPS, foObjects, partnerCount, foWarning,
        effectivePerfFeatures,
        swInstances,
        hwCount,
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue, siteOrder]);

  // Sort sites by unit group (A→B→C→…→RPT→LIC→CDC) then by unit number within group
  const sortByUnit = useCallback(() => {
    const { UNIT_SORT_ORDER } = require('./unitDesignations');
    const sorted = [...sites].sort((a, b) => {
      const la = a.unitLetterOverride || getUnitLetterForRole(a.role);
      const lb = b.unitLetterOverride || getUnitLetterForRole(b.role);
      const oa = UNIT_SORT_ORDER[la] ?? 99;
      const ob = UNIT_SORT_ORDER[lb] ?? 99;
      if (oa !== ob) return oa - ob;
      // Within same group, sort by unit number override or natural order
      const na = a.unitNumberOverride ?? 999;
      const nb = b.unitNumberOverride ?? 999;
      return na - nb;
    });
    setSiteOrder(sorted.map(s => s.id));
  }, [sites]);

  // Move a parent site up or down in the order
  const moveSite = useCallback((siteId, direction) => {
    const currentIds = siteOrder || sites.map(s => s.id);
    const idx = currentIds.indexOf(siteId);
    if (idx < 0) return;
    const newOrder = [...currentIds];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setSiteOrder(newOrder);
  }, [siteOrder, sites]);

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
            _groupMode: groupMode,
            _isExpanded: true,
            _serverIndex: 0,
            _parentSiteId: site.id,
            _parentName: site.name,
            _serverCount: count, // original count for display - used to calculate unit range
            serverCount: 1, // display as 1 row
            swInstances: count * (site.haEnabled ? 2 : 1), // sum of all server SW instances
            hwCount: site.hwCount !== undefined ? site.hwCount : count,
          });
        } else if (groupMode === 'custom' && customGroups.length > 0) {
          // Custom groups: each range → 1 row, ungrouped → individual rows
          // Collect all rows first, then sort by server index to maintain correct order
          const siteRows = [];
          const grouped = new Set();
          
          // Add grouped ranges
          customGroups.forEach(([s, e]) => {
            for (let i = s; i <= e; i++) grouped.add(i);
            const srvOvr = serverOverrides[s - 1] || {};
            const rangeCount = e - s + 1;
            siteRows.push({
              ...site,
              id: `${site.id}__grp__${s}-${e}`,
              name: srvOvr.name || site.name,
              numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
              role: srvOvr.role || site.role,
              services: srvOvr.services || site.services,
              platform: srvOvr.platform || site.platform,
              haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
              unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
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
          
          // Add ungrouped servers as individual rows
          for (let i = 1; i <= count; i++) {
            if (!grouped.has(i)) {
              const srvOvr = serverOverrides[i - 1] || {};
              siteRows.push({
                ...site,
                id: `${site.id}__srv__${i - 1}`,
                name: srvOvr.name || site.name,
                numIPs: srvOvr.numIPs !== undefined ? srvOvr.numIPs : site.numIPs,
                role: srvOvr.role || site.role,
                services: srvOvr.services || site.services,
                platform: srvOvr.platform || site.platform,
                haEnabled: srvOvr.haEnabled !== undefined ? srvOvr.haEnabled : site.haEnabled,
                unitLetterOverride: srvOvr.unitLetterOverride || site.unitLetterOverride,
                _groupMode: groupMode,
                _isExpanded: true,
                _serverIndex: i - 1,
                _parentSiteId: site.id,
                _parentName: site.name,
                _serverCount: 1,
                serverCount: 1,
                swInstances: site.haEnabled ? 2 : 1,
                hwCount: site.hwCount !== undefined ? Math.max(1, Math.round(site.hwCount / count)) : 1,
              });
            }
          }
          
          // Sort by server index to maintain correct order, then push to result
          siteRows.sort((a, b) => a._serverIndex - b._serverIndex);
          result.push(...siteRows);
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
              _groupMode: groupMode,
              _isExpanded: true,
              _serverIndex: i,
              _parentSiteId: site.id,
              _parentName: site.name,
              _serverCount: 1,
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
      _serverCount: srv._serverCount || 1, // grouped rows advance counter by their count
    }));
    return computeUnitAssignments(serversForUnit);
  }, [expandedServers]);

  // Calculate totals — exclude GM/GMC IPs from total
  const totals = useMemo(() => {
    const memberSites = sites.filter(s => s.role !== 'GM' && s.role !== 'GMC' && !s.role?.startsWith('GM+') && !s.role?.startsWith('GMC+'));
    const totalIPs = memberSites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const infraTokens = sites.reduce((sum, s) => sum + (s.tokens || 0), 0);

    const tdTokens = parseInt(answers['td-cloud-tokens']) || 0;
    const dossierTokens = parseInt(answers['dossier-tokens']) || 0;
    const lookalikeTokens = parseInt(answers['lookalike-tokens']) || 0;
    const socTokens = parseInt(answers['soc-insights-tokens']) || 0;
    const domainTokens = parseInt(answers['domain-takedown-tokens']) || 0;
    const reportingTokens = parseInt(answers['reporting-tokens']) || 0;
    const securityTokens = securityEnabled ? (tdTokens + dossierTokens + lookalikeTokens + socTokens + domainTokens + reportingTokens) : 0;
    const uddiMgmtTokens = uddiEnabled ? (parseInt(answers['uddi-mgmt-tokens']) || 0) : 0;
    // UDDI server tokens are already included in infraTokens (NXVS/NXaaS sites)
    // So total UDDI-specific tokens = management tokens only (server tokens already counted)
    const uddiMgmtWithBuffer = uddiMgmtTokens > 0
      ? Math.ceil(uddiMgmtTokens * (1 + (parseInt(answers['uddi-growth-buffer']) || 20) / 100))
      : 0;

    return {
      totalIPs, totalKW, infraTokens, securityTokens, uddiTokens: uddiMgmtWithBuffer,
      uddiMgmtTokens: uddiMgmtWithBuffer,
      totalTokens: infraTokens + securityTokens + uddiMgmtWithBuffer,
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

  // BOM — include all physical hardware SKUs (TE, ND), exclude VM/Cloud/N/A
  const bom = useMemo(() => {
    const bomItems = {};
    sites.forEach(site => {
      const sku = site.hardwareSku || 'N/A';
      // Only include real physical hardware SKUs
      if (!sku || sku === 'N/A' || sku === 'VM' || sku === 'Cloud') return;
      const hwCount = site.hwCount ?? 0;
      if (hwCount <= 0) return;
      if (!bomItems[sku]) bomItems[sku] = { sku, description: getSkuDescription(sku), quantity: 0, sites: [] };
      bomItems[sku].quantity += hwCount;
      bomItems[sku].sites.push(site.name);
    });
    return Object.values(bomItems);
  }, [sites]);

  const partnerSku = useMemo(() => getPartnerSkuFromTokens(totals.totalTokens), [totals.totalTokens]);
  
  // Token SKU based on total tokens (replaces incorrect 500K-per-pack formula)
  const tokenPacks = useMemo(() => {
    if (platformMode === 'NIOS' || totals.totalTokens <= 0) return null;
    return getPartnerSkuFromTokens(totals.totalTokens).sku;
  }, [totals.totalTokens, platformMode]);

  // Update context with sizing summary — includes DNS server counts for Discovery QPS
  useEffect(() => {
    // Count DNS-capable sites for Discovery QPS auto-calc
    const internalDnsSiteCount = Math.max(1, sites.filter(s => {
      const letter = s.unitLetterOverride || (s.role === 'ExtDNS' ? 'E' : null);
      const hasDns = s.role === 'DNS' || s.role === 'DNS/DHCP'
        || s.role?.startsWith('GM+DNS') || s.role?.startsWith('GMC+DNS')
        || (s.role?.includes('DNS') && s.role !== 'ExtDNS');
      return hasDns && letter !== 'E';
    }).length);
    const externalDnsSiteCount = Math.max(1, sites.filter(s => {
      const letter = s.unitLetterOverride;
      return letter === 'E' || s.role === 'ExtDNS';
    }).length);

    setSizingSummary({
      totalTokens: totals.totalTokens, totalIPs: totals.totalIPs,
      partnerSku: partnerSku.sku, siteCount: sites.length,
      infraTokens: totals.infraTokens, securityTokens: totals.securityTokens,
      uddiMgmtTokens: totals.uddiMgmtTokens || 0,
      tokenPack: tokenPacks,
      platformMode: platformMode,
      dnsSiteCount: internalDnsSiteCount,
      externalDnsSiteCount,
    });
  }, [totals, partnerSku.sku, sites, tokenPacks, platformMode, setSizingSummary]);

  // Reset sort order when switching drawings (siteOrder is now per-drawing, nothing to do)
  useEffect(() => {
    // Intentionally empty — siteOrder is now stored per drawing in drawingConfigs
  }, [activeDrawingId]);

  // ── CDC Auto-Sync: svc-3 ↔ CDC role in Sizing ─────────────────────────────
  // Check contextSites (raw) to avoid computed-sites race conditions on remount
  const cdcSyncRef = useRef(false);
  useEffect(() => {
    if (cdcSyncRef.current) return;
    // Check the raw context sites for CDC role (most reliable - persists across navigation)
    const hasCdcInContext = contextSites.some(s => s.role === 'CDC');
    const cdcAnswer = answers['svc-3'];

    if (hasCdcInContext && cdcAnswer !== 'Yes') {
      // CDC exists in sizing → mark in discovery
      cdcSyncRef.current = true;
      setAnswer('svc-3', 'Yes');
      setTimeout(() => { cdcSyncRef.current = false; }, 300);
    } else if (cdcAnswer === 'Yes' && !hasCdcInContext) {
      // svc-3=Yes but no CDC site → add one (only once)
      cdcSyncRef.current = true;
      const newId = contextAddSite('CDC', null, 0);
      // Add synchronously to context before clearing lock
      contextUpdateSite(newId, { role: 'CDC', numIPs: 0 });
      // Keep lock for 1s to prevent immediate re-trigger on state flush
      setTimeout(() => { cdcSyncRef.current = false; }, 1000);
    }
  // Depend on raw contextSites roles string (stable, no computed delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers['svc-3'], contextSites.map(s => s.role).join(',')]);

  // ── DFP Auto-Discovery: if any site has DFP in services → svc-7='Yes' ─────
  // ── NXaaS Auto-Discovery: if any site is NXaaS → svc-9='Yes' ─────────────
  useEffect(() => {
    const hasDfp = sites.some(s => (s.services || []).includes('DFP'));
    if (hasDfp && answers['svc-7'] !== 'Yes') {
      setAnswer('svc-7', 'Yes');
    }
    const hasNxaas = sites.some(s => s.platform === 'NXaaS');
    if (hasNxaas && answers['svc-9'] !== 'Yes') {
      setAnswer('svc-9', 'Yes');
    }
  }, [sites.map(s => `${s.platform}:${(s.services||[]).join('-')}`).join(','), answers['svc-7'], answers['svc-9']]);

  // ni-3 (Discovery) → ND sites (Sizing) sync
  // When user enters SNMP/SSH devices count in Discovery, distribute to ND sites
  const ni3Value = answers['ni-3'];
  useEffect(() => {
    const ndSites = sites.filter(s => s.role === 'ND');
    if (ndSites.length === 0 || !ni3Value) return;
    
    const targetTotal = parseInt(ni3Value) || 0;
    const currentTotal = ndSites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    
    // Only sync if Discovery value differs from current Sizing total
    // This prevents infinite loops and unnecessary updates
    if (targetTotal !== currentTotal && targetTotal > 0) {
      // Distribute evenly to all ND sites, first site gets remainder
      const perSite = Math.floor(targetTotal / ndSites.length);
      const remainder = targetTotal % ndSites.length;
      
      ndSites.forEach((site, i) => {
        const newIPs = perSite + (i === 0 ? remainder : 0);
        if (site.numIPs !== newIPs) {
          setSiteOverrides(prev => {
            const key = site.id;
            const doubleKey = key.startsWith('site-') ? `site-${key}` : null;
            const effectiveKey = (doubleKey && prev[doubleKey]) ? doubleKey : key;
            return { ...prev, [effectiveKey]: { ...prev[effectiveKey], numIPs: newIPs } };
          });
        }
      });
    }
  }, [ni3Value, sites.filter(s => s.role === 'ND').length]);



  // Update site field — handles both regular sites and expanded server sub-rows
  // Accepts (siteId, field, value) OR (siteId, { field: value, ... }) for atomic multi-field updates
  const updateSite = useCallback((siteId, fieldOrUpdates, value) => {
    // Normalize to updates object for atomic writes
    const updates = typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null
      ? fieldOrUpdates
      : { [fieldOrUpdates]: value };

    // Apply role-related side effects
    if (updates.role && updates.role !== 'DHCP' && updates.role !== 'DNS/DHCP') {
      updates.dhcpPartner = null;
    }

    // Check if this is a server sub-row update (id contains __srv__)
    const srvMatch = siteId.match(/^(.+)__srv__(\d+)$/);
    if (srvMatch) {
      const parentId = srvMatch[1];
      const srvIndex = parseInt(srvMatch[2]);
      setSiteOverrides(prev => {
        const parentOvr = prev[parentId] || {};
        const servers = { ...(parentOvr.servers || {}) };
        servers[srvIndex] = { ...(servers[srvIndex] || {}), ...updates };
        return { ...prev, [parentId]: { ...parentOvr, servers } };
      });
      return;
    }

    // Check if this is a grouped row update (id contains __grp__) — route to parent
    const grpMatch = siteId.match(/^(.+)__grp__/);
    if (grpMatch) {
      const parentId = grpMatch[1];
      setSiteOverrides(prev => ({ ...prev, [parentId]: { ...prev[parentId], ...updates } }));
      return;
    }

    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    // If updating KW, sync to context and DON'T add to local override
    if ('knowledgeWorkers' in updates && site.sourceType) {
      if (site.sourceType === 'site' && contextUpdateSite) {
        contextUpdateSite(site.sourceId, { knowledgeWorkers: updates.knowledgeWorkers });
        return;
      } else if (site.sourceType === 'dataCenter' && contextUpdateDC) {
        contextUpdateDC(site.sourceId, { knowledgeWorkers: updates.knowledgeWorkers });
        return;
      }
    }

    // ND ↔ ni-3 sync: When ND site's numIPs changes, update Discovery answer
    // ni-3 = "What is the total number of SNMP/SSH devices that will be managed/interrogated?"
    if ('numIPs' in updates && site.role === 'ND') {
      // Sum all ND sites' numIPs to get total for ni-3
      const ndSites = sites.filter(s => s.role === 'ND');
      const currentTotal = ndSites.reduce((sum, s) => {
        if (s.id === siteId) return sum + (updates.numIPs || 0);
        return sum + (s.numIPs || 0);
      }, 0);
      setAnswer('ni-3', String(currentTotal));
    }

    // All other fields go into per-drawing siteOverrides — ATOMIC single write
    // Handle backward compatibility: if there's existing data with double-prefix key, use that
    setSiteOverrides(prev => {
      // Check if data exists under double-prefix key (old format: site-site-xxx or dc-dc-xxx)
      const doubleKey = siteId.startsWith('site-') ? `site-${siteId}` : (siteId.startsWith('dc-') ? `dc-${siteId}` : null);
      const hasDoubleKey = doubleKey && prev[doubleKey];
      const effectiveKey = hasDoubleKey ? doubleKey : siteId;
      return { ...prev, [effectiveKey]: { ...prev[effectiveKey], ...updates } };
    });
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

  // Find active drawing object from drawings array
  const activeDrawing = drawings.find(d => d.id === activeDrawingId);

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
            onCloneDrawing={copyDrawing}
            onCopyDrawing={copyDrawing}
            onDeleteDrawing={deleteDrawing}
            onRenameDrawing={renameDrawing}
            onCompare={() => setShowCompareDialog(true)}
            currentSiteCount={sites.length}
          />

          {/* Compare Dialog */}
          <CompareDrawingsDialog
            open={showCompareDialog}
            onOpenChange={setShowCompareDialog}
            drawings={drawings}
            currentSites={sites}
            drawingConfigs={drawingConfigs}
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
                onClick={sortByUnit}
                className="text-xs"
                title="Sort rows by Unit Group (A→B→C→…→RPT→LIC→CDC)"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Sort
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => exportForLucid(expandedServers, activeDrawing?.name || '10', unitAssignments)}
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
                  let totalCols = 15; // base: Unit, #/Range, Location, IPs, Role, Description, DHCP, Srv#, HA, Solution, Model, SW#, HW#, SW Add-ons, HW Add-ons
                  if (showKW && !exportView) totalCols++;
                  if (showServices && !exportView) totalCols++;
                  if (showHardware) totalCols++;
                  if (platformMode !== 'NIOS') totalCols++; // tokens
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
                        onTogglePerfFeature={(siteId, featValue) => {
                          const s = sites.find(x => x.id === siteId);
                          if (!s) return;
                          const current = s.perfFeatures || [];
                          const updated = current.includes(featValue)
                            ? current.filter(f => f !== featValue)
                            : [...current, featValue];
                          updateSite(siteId, 'perfFeatures', updated);
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
                        onMoveUp={!srv._isExpanded ? () => moveSite(srv.id, 'up') : undefined}
                        onMoveDown={!srv._isExpanded ? () => moveSite(srv.id, 'down') : undefined}
                      />
                    );

                    // Add TR-SWTL companion row immediately after each Reporting row (both views)
                    if (srv.role === 'Reporting') {
                      const ua = unitAssignments[srv.id];
                      // Companion is always unit + 1 (immediately after main row)
                      const companionUnit = (ua?.unitNumber ?? 1) + 1;

                      if (exportView) {
                        // Export view: match exact export column order
                        // Columns: Unit Grp, Solution, Model, SW#, Description, SW Base SKU, SW Pkg, SW Add-ons, HW License SKU, HW Add-ons, HW#, Rpt, BOM, (actions)
                        rows.push(
                          <TableRow key={`${srv.id}-trswtl`} className="hover:bg-muted/30 text-xs">
                            <TableCell className="p-1.5 text-center font-medium">RPT</TableCell>
                            <TableCell className="p-1.5 text-center font-mono">{companionUnit}</TableCell>
                            <TableCell className="p-1.5">NIOS</TableCell>
                            <TableCell className="p-1.5 font-mono text-[11px]">TR-5005</TableCell>
                            <TableCell className="p-1.5 text-center">1</TableCell>
                            <TableCell className="p-1.5 text-muted-foreground text-[11px]">
                              Reporting Data Volume
                            </TableCell>
                            <TableCell className="p-1.5 font-mono text-[11px]">TR-SWTL</TableCell>
                            <TableCell className="p-1.5 font-mono text-[11px]">{srv.rptQuantity || '—'}</TableCell>
                            <TableCell className="p-1.5 text-muted-foreground">—</TableCell>
                            <TableCell className="p-1.5 font-mono text-[11px]">—</TableCell>
                            <TableCell className="p-1.5 text-muted-foreground">—</TableCell>
                            <TableCell className="p-1.5 text-center">0</TableCell>
                            <TableCell className="p-1.5 text-center"><span className="text-[10px] text-primary">✓</span></TableCell>
                            <TableCell className="p-1.5 text-center"><span className="text-[10px] text-primary">✓</span></TableCell>
                            <TableCell className="p-1.5"></TableCell>
                          </TableRow>
                        );
                      } else {
                        // Normal drawing view: show a compact sub-row with colspan
                        // Col1=Unit(1), Col2=#(1), Col3=Location+spanning(colspanned), then key export cols at end
                        rows.push(
                          <TableRow key={`${srv.id}-trswtl`} className="text-[11px] text-muted-foreground border-dashed">
                            {/* Unit group */}
                            <TableCell className="p-1 text-center text-[10px]">RPT</TableCell>
                            {/* Unit # */}
                            <TableCell className="p-1 text-center font-mono text-[10px]">{companionUnit}</TableCell>
                            {/* Span: Location, IPs, [KW], Role, Desc, [Svc], DHCP, Srv#, HA, Solution, Model, [HW SKU], SW#, HW# */}
                            <TableCell colSpan={totalCols - 9} className="p-1">
                              <span className="italic text-[10px]">↳ TR-SWTL companion — Reporting Data Volume</span>
                            </TableCell>
                            {/* SW Add-ons (storage) */}
                            <TableCell className="p-1 font-mono text-[10px]">{srv.rptQuantity || '—'}</TableCell>
                            {/* HW Add-ons */}
                            <TableCell className="p-1 text-center text-[10px]">—</TableCell>
                            {/* Tokens col if shown */}
                            {platformMode !== 'NIOS' && <TableCell className="p-1"></TableCell>}
                            {/* Rpt */}
                            <TableCell className="p-1 text-center"><span className="text-[10px] text-primary">✓</span></TableCell>
                            {/* BOM */}
                            <TableCell className="p-1 text-center"><span className="text-[10px] text-primary">✓</span></TableCell>
                            {/* Actions (empty) */}
                            <TableCell className="p-1"></TableCell>
                          </TableRow>
                        );
                      }
                    }
                  });
                  return rows;
                })()}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="p-1" colSpan={2}></TableCell>
                  <TableCell className="p-1 text-sm">
                    <span className="font-semibold">Total</span>
                    <span className="text-[10px] text-muted-foreground ml-1">({sites.length} sites)</span>
                  </TableCell>
                  <TableCell className="p-1 tabular-nums text-sm">
                    <div>{formatNumber(totals.totalIPs)}</div>
                    <div className="text-[9px] text-muted-foreground">excl. GM/GMC</div>
                  </TableCell>
                  {showKW && (
                    <TableCell className="p-1 tabular-nums text-sm">{formatNumber(totals.totalKW)}</TableCell>
                  )}
                  <TableCell className="p-1"></TableCell>
                  <TableCell className="p-1"></TableCell>
                  {showServices && <TableCell className="p-1"></TableCell>}
                  <TableCell className="p-1"></TableCell>
                  <TableCell className="p-1"></TableCell>
                  <TableCell className="p-1"></TableCell>
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
                              <span className="font-bold">{formatNumber(totals.totalTokens)}</span>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <div><strong>Server Tokens (Sizing):</strong> {formatNumber(totals.infraTokens)}</div>
                              {totals.uddiMgmtTokens > 0 && (
                                <div><strong>UDDI Mgmt Tokens:</strong> {formatNumber(totals.uddiMgmtTokens)}</div>
                              )}
                              {totals.securityTokens > 0 && (
                                <div><strong>Security Tokens:</strong> {formatNumber(totals.securityTokens)}</div>
                              )}
                              <div className="border-t border-border/40 pt-1 font-bold">Total: {formatNumber(totals.totalTokens)}</div>
                              <div><strong>Token SKU:</strong> {getPartnerSkuFromTokens(totals.totalTokens).sku}</div>
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

          {/* UDDI Management Token Summary — shown when mgmt tokens are calculated */}
          {uddiEnabled && totals.uddiMgmtTokens > 0 && (
            <div className="mx-4 lg:mx-6 mt-3 p-3 bg-[#12C2D3]/5 border border-[#12C2D3]/20 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#12C2D3]">UDDI Token Breakdown</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-[#12C2D3]/60" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p>Server tokens come from NXVS/NXaaS rows in the Sizing table.</p>
                          <p>Management tokens come from the UDDI Estimator in Discovery (DDI objects, IPs, assets).</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    Server: <span className="font-mono font-semibold text-foreground">{formatNumber(totals.infraTokens)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Mgmt: <span className="font-mono font-semibold text-foreground">{formatNumber(totals.uddiMgmtTokens)}</span>
                  </span>
                  {totals.securityTokens > 0 && (
                    <span className="text-muted-foreground">
                      Security: <span className="font-mono font-semibold text-foreground">{formatNumber(totals.securityTokens)}</span>
                    </span>
                  )}
                  <span className="font-bold text-[#12C2D3]">
                    Total: {formatNumber(totals.totalTokens)} → {getPartnerSkuFromTokens(totals.totalTokens).description}
                  </span>
                </div>
              </div>
            </div>
          )}

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
