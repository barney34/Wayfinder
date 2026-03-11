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
  getDefaultHwAddons,
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
import type { Association } from "./SiteTableRow";
import { SizingTableHeader } from "./SizingTableHeader";
import { DrawingTabs, useDrawings, CompareDrawingsDialog, CopySiteToDrawingMenu } from "./DrawingManager";
import { computeUnitAssignments, getUnitLetterForRole, UNIT_SORT_ORDER } from "./unitDesignations";
import { useSiteSizing } from "./useSiteSizing";

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
  const sortMode = activeDrawingConfig.sortMode || 'auto'; // 'auto' or 'manual'

  // Setters that write to active drawing config
  const setSiteOverrides = useCallback((updater) => {
    const current = getDrawingConfig(activeDrawingId).siteOverrides || {};
    const next = typeof updater === 'function' ? updater(current) : updater;
    updateDrawingConfig(activeDrawingId, { siteOverrides: next });
  }, [activeDrawingId, getDrawingConfig, updateDrawingConfig]);

  const setSiteOrder = useCallback((order) => {
    updateDrawingConfig(activeDrawingId, { siteOrder: order });
  }, [activeDrawingId, updateDrawingConfig]);

  const setSortMode = useCallback((mode: 'auto' | 'manual') => {
    updateDrawingConfig(activeDrawingId, { sortMode: mode });
  }, [activeDrawingId, updateDrawingConfig]);

  // dhcpAssociations: drawing-level store for NIOS FOAs and UDDI HA groups
  const dhcpAssociations: Association[] = useMemo(
    () => (activeDrawingConfig.dhcpAssociations as Association[]) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDrawingId, drawingConfigs]
  );
  const setDhcpAssociations = useCallback((updater) => {
    const current = (getDrawingConfig(activeDrawingId).dhcpAssociations as Association[]) || [];
    const next = typeof updater === 'function' ? updater(current) : updater;
    updateDrawingConfig(activeDrawingId, { dhcpAssociations: next });
  }, [activeDrawingId, getDrawingConfig, updateDrawingConfig]);
  const addAssociation = useCallback((assoc: Association) => {
    setDhcpAssociations((prev: Association[]) => [...prev, assoc]);
  }, [setDhcpAssociations]);
  const removeAssociation = useCallback((assocId: string) => {
    setDhcpAssociations((prev: Association[]) => prev.filter(a => a.id !== assocId));
  }, [setDhcpAssociations]);

  // Drawing clone/copy adapters
  const copyDrawing = useCallback((drawingId) => {
    ctxCloneDrawing(drawingId);
  }, [ctxCloneDrawing]);

  const copySiteToDrawing = useCallback((site, targetDrawingId) => {
    // Store a copy of the site's override in the target drawing
    const srcOverrideKey = site.sourceId ? `site-${site.sourceId}` : site.id;
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

  // UI toggle for column visibility — persisted to localStorage so they survive navigation
  const [showHardware, _setShowHardware] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('sizing-columns-visibility') || '{}').showHardware ?? false; } catch { return false; }
  });
  const [showKW, _setShowKW] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('sizing-columns-visibility') || '{}').showKW ?? false; } catch { return false; }
  });
  const [showServices, _setShowServices] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('sizing-columns-visibility') || '{}').showServices ?? false; } catch { return false; }
  });
  const [showDescription, _setShowDescription] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('sizing-columns-visibility') || '{}').showDescription ?? false; } catch { return false; }
  });
  const [exportView, setExportView] = useState(false);

  const _persistColPref = (col: string, val: boolean) => {
    try {
      const prefs = JSON.parse(localStorage.getItem('sizing-columns-visibility') || '{}');
      localStorage.setItem('sizing-columns-visibility', JSON.stringify({ ...prefs, [col]: val }));
    } catch {}
  };
  const setShowHardware = (val) => { const b = Boolean(val); _setShowHardware(b); _persistColPref('showHardware', b); };
  const setShowKW = (val) => { const b = Boolean(val); _setShowKW(b); _persistColPref('showKW', b); };
  const setShowServices = (val) => { const b = Boolean(val); _setShowServices(b); _persistColPref('showServices', b); };
  const setShowDescription = (val) => { const b = Boolean(val); _setShowDescription(b); _persistColPref('showDescription', b); };

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

  // Safety net: any platformMode change within the same drawing clears ALL associations.
  // This fires regardless of HOW the mode changed (toggle, dropdown, Hybrid button, etc.).
  const _prevModeRef = useRef<{ drawingId: string; mode: string } | null>(null);
  useEffect(() => {
    const prev = _prevModeRef.current;
    if (!prev || prev.drawingId !== activeDrawingId) {
      _prevModeRef.current = { drawingId: activeDrawingId, mode: platformMode };
      return;
    }
    if (prev.mode === platformMode) return;
    _prevModeRef.current = { drawingId: activeDrawingId, mode: platformMode };
    const current = getDrawingConfig(activeDrawingId).siteOverrides || {};
    const cleaned = Object.fromEntries(
      Object.entries(current).map(([id, ovr]: [string, any]) => {
        const { dhcpPartner: _dp, ...rest } = ovr;
        return [id, rest];
      })
    );
    updateDrawingConfig(activeDrawingId, { dhcpAssociations: [], siteOverrides: cleaned });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformMode, activeDrawingId]);
  const securityEnabled = activeDrawingConfig.featureSecurity ?? (answers['feature-security'] === 'Yes');
  const uddiEnabled = activeDrawingConfig.featureUDDI ?? (answers['feature-uddi'] === 'Yes');

  // Recommended platform based on DC/Site counts
  const recommendedMode = useMemo(() =>
    getRecommendedPlatformMode(dataCenters.length, contextSites.length),
    [dataCenters.length, contextSites.length]
  );

  // Handle platform mode change with confirmation for non-recommended
  // Now updates ACTIVE DRAWING config only (not global)
  // Strip stale per-site platform overrides when switching modes so sites revert
  // to the new mode's appropriate default (e.g. NXVS for Hybrid members).
  // Build a single atomic drawing-config update for platform mode change.
  // Merges platformMode + cleared siteOverrides + empty dhcpAssociations in one call
  // to avoid stale-state races from multiple sequential updateDrawingConfig calls.
  const buildPlatformChangeUpdate = useCallback((newMode: string) => {
    const current = getDrawingConfig(activeDrawingId).siteOverrides || {};
    const cleanedSiteOverrides = {};
    Object.keys(current).forEach(id => {
      const { platform: _p, modelOverride: _m, hardwareSku: _s, dhcpPartner: _dp, ...rest } = current[id];
      cleanedSiteOverrides[id] = rest;
    });
    return {
      platformMode: newMode as 'NIOS' | 'UDDI' | 'Hybrid',
      featureNIOS: newMode === 'NIOS' || newMode === 'Hybrid',
      featureUDDI: newMode === 'UDDI' || newMode === 'Hybrid',
      siteOverrides: cleanedSiteOverrides,
      dhcpAssociations: [],
    };
  }, [activeDrawingId, getDrawingConfig]);

  const handlePlatformModeChange = useCallback((newMode) => {
    if (!newMode) return;
    if (newMode !== recommendedMode && platformMode === recommendedMode) {
      setPendingPlatformChange(newMode);
      setShowPlatformAlert(true);
    } else {
      updateDrawingConfig(activeDrawingId, buildPlatformChangeUpdate(newMode));
    }
  }, [recommendedMode, platformMode, updateDrawingConfig, activeDrawingId, buildPlatformChangeUpdate]);

  const confirmPlatformChange = useCallback(() => {
    if (pendingPlatformChange) {
      updateDrawingConfig(activeDrawingId, buildPlatformChangeUpdate(pendingPlatformChange));
    }
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, [pendingPlatformChange, updateDrawingConfig, activeDrawingId, buildPlatformChangeUpdate]);

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

  // Migration: merge drawing-level dhcpAssociations with any legacy dhcpPartner overrides.
  // Also synchronously filters out associations incompatible with the current platform mode
  // so invalid FOA/HA types are never rendered, even before the cleanup useEffect fires.
  const effectiveAssociations = useMemo((): Association[] => {
    const result: Association[] = [...dhcpAssociations];
    Object.entries(siteOverrides).forEach(([siteId, override]: [string, any]) => {
      const partnerId = override.dhcpPartner;
      if (!partnerId) return;
      const alreadyExists = result.some(a =>
        a.members.some(m => m.rowId === siteId) && a.members.some(m => m.rowId === partnerId)
      );
      if (!alreadyExists) {
        result.push({
          id: `migrated-${siteId}-${partnerId}`,
          name: 'failover',
          type: 'nios_failover',
          members: [
            { rowId: siteId, role: 'peer' },
            { rowId: partnerId, role: 'peer' },
          ],
        });
      }
    });
    if (platformMode === 'NIOS') return result.filter(a => a.type !== 'uddi_ha');
    if (platformMode === 'UDDI') return result.filter(a => a.type !== 'nios_failover');
    return result;
  }, [dhcpAssociations, siteOverrides, platformMode]);

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

      // Per-DC/Site IP calculation uses its own KW, not global KW
      const dcSiteAutoIPs = Math.round(kw * ipMultiplier);
      let numIPs;
      if (type === 'dataCenter') {
        numIPs = override.numIPs !== undefined ? override.numIPs : dcSiteAutoIPs;
        const serviceIPs = (role === 'GM' || role === 'GMC' || role.startsWith('GM+') || role.startsWith('GMC+')) ? services.length * 100 : 0;
        numIPs += serviceIPs;
      } else {
        numIPs = override.numIPs !== undefined ? override.numIPs : dcSiteAutoIPs;
      }

      return {
        id: key, sourceId: source.id, sourceType: type,
        name: source.name || override.name || `${type === 'dataCenter' ? 'DC' : 'Site'} ${index + 1}`,
        numIPs, numIPsAuto: dcSiteAutoIPs,
        knowledgeWorkers: kw, role, services, platform,
        dhcpPercent: override.dhcpPercent ?? dhcpPercent,
        dhcpPartner: override.dhcpPartner || null,
        serverCount: override.serverCount || 1,
        haEnabled: override.haEnabled || false, // HA checkbox - doubles SW instances
        hwCount: override.hwCount, // User-editable HW count (undefined = auto)
        swAddons: override.swAddons || [], // SW Add-ons array
        hwAddons: override.hwAddons, // HW Add-ons array (undefined = use default based on hardware)
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
        modelOverride: override.modelOverride || null,
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

    // Always keep DC/GM rows (unit A) at the top, sorted by their current order
    // Enforce: A1 = GM, A2+ = GMC (preserves composite roles like GM+DNS → GMC+DNS)
    const isUnitA = (s) => s.sourceType === 'dataCenter' || s.role === 'GM' || s.role === 'GMC' || s.role?.startsWith('GM+') || s.role?.startsWith('GMC+');
    const aRows = allBasicSites.filter(s => isUnitA(s));
    const nonARows = allBasicSites.filter(s => !isUnitA(s));
    // Re-assign GM/GMC based on position: first = GM, rest = GMC
    aRows.forEach((s, i) => {
      if (platformMode === 'UDDI') return; // No GM/GMC in UDDI mode
      const isComposite = s.role?.includes('+');
      const suffix = isComposite ? s.role.replace(/^GM\+|^GMC\+/, '') : '';
      if (i === 0) {
        s.role = suffix ? `GM+${suffix}` : 'GM';
      } else {
        s.role = suffix ? `GMC+${suffix}` : 'GMC';
      }
    });
    allBasicSites = [...aRows, ...nonARows];

    // === DHCP FO / HA: Compute hub LPS, FO objects, partner counts from effectiveAssociations ===
    const HUB_FAILOVER_CAPACITY = 0.5;
    const hubLPSMap: Record<string, number> = {};
    const foObjectsMap: Record<string, number> = {};
    const partnerCountMap: Record<string, number> = {};

    effectiveAssociations.forEach(assoc => {
      const [mA, mB] = assoc.members;
      if (!mA || !mB) return;
      const siteA = allBasicSites.find(s => s.id === mA.rowId);
      const siteB = allBasicSites.find(s => s.id === mB.rowId);
      if (!siteA || !siteB) return;
      const lpsA = calculateSiteLPS(siteA.numIPs, siteA.dhcpPercent, siteA.role);
      const lpsB = calculateSiteLPS(siteB.numIPs, siteB.dhcpPercent, siteB.role);
      const objsA = calculateSiteDhcpObjects(siteA.numIPs, siteA.dhcpPercent);
      const objsB = calculateSiteDhcpObjects(siteB.numIPs, siteB.dhcpPercent);
      hubLPSMap[mA.rowId] = (hubLPSMap[mA.rowId] || 0) + Math.ceil(lpsB * HUB_FAILOVER_CAPACITY);
      hubLPSMap[mB.rowId] = (hubLPSMap[mB.rowId] || 0) + Math.ceil(lpsA * HUB_FAILOVER_CAPACITY);
      foObjectsMap[mA.rowId] = (foObjectsMap[mA.rowId] || 0) + objsB;
      foObjectsMap[mB.rowId] = (foObjectsMap[mB.rowId] || 0) + objsA;
      partnerCountMap[mA.rowId] = (partnerCountMap[mA.rowId] || 0) + 1;
      partnerCountMap[mB.rowId] = (partnerCountMap[mB.rowId] || 0) + 1;
    });

    // === Pass 2: Calculate model/tokens with HA, FO objects, and perf features ===
    return allBasicSites.map(site => {
      const partnerCount = partnerCountMap[site.id] || 0;
      const isSpoke = partnerCount > 0;
      const isHub = partnerCount >= 2;
      const hubLPS = hubLPSMap[site.id] || 0;
      const foObjects = foObjectsMap[site.id] || 0;
      const siteAssociations = effectiveAssociations.filter(a => a.members.some(m => m.rowId === site.id));
      const hasDhcpRole = site.role === 'DHCP' || site.role === 'DNS/DHCP' ||
        (site.role || '').includes('+DHCP') || (site.role || '').includes('+DNS/DHCP');
      const isUddiSite = site.platform === 'NXVS' || site.platform === 'NXaaS' || site.platform === 'NX-P';
      const displayLabel = !hasDhcpRole
        ? 'N/A'
        : partnerCount === 0
        ? '—'
        : partnerCount === 1
        ? (siteAssociations[0]?.name || '—')
        : isUddiSite ? `Hub (${partnerCount})` : `Mesh (${partnerCount})`;

      // Reporting → force virtual platform; ND → force NIOS physical if not already set
      const effectivePlatform = site.role === 'Reporting'
        ? (site.platform || 'NIOS-V')   // RPT defaults to virtual
        : site.platform;

      // Auto-inject DHCP-FO into perfFeatures when site is in an FO relationship
      // This ensures the 50% LPS penalty is applied to BOTH hub and spoke
      const basePerfFeatures = site.perfFeatures || [];
      let effectivePerfFeatures = (isHub || isSpoke) && !basePerfFeatures.includes('DHCP-FO')
        ? [...basePerfFeatures, 'DHCP-FO']
        : basePerfFeatures;
      // Auto-inject DHCP-FP when fingerprinting is enabled globally, site runs DHCP, and platform is NIOS
      const dhcpRoles = ['DHCP','DNS/DHCP','GM+DHCP','GM+DNS/DHCP','GMC+DHCP','GMC+DNS/DHCP'];
      const isNiosPlatform = effectivePlatform !== 'NXVS' && effectivePlatform !== 'NXaaS' && effectivePlatform !== 'NX-P';
      if (answers['dhcp-fingerprint'] === 'Yes' && dhcpRoles.includes(site.role) && isNiosPlatform && !effectivePerfFeatures.includes('DHCP-FP')) {
        effectivePerfFeatures = [...effectivePerfFeatures, 'DHCP-FP'];
      }

      const autoRecommendedModel = getSiteRecommendedModel(
        site.numIPs, site.role, platformMode, site.dhcpPercent,
        leaseTimeSeconds, effectivePlatform,
        { isSpoke, hubLPS, foObjects, perfFeatures: effectivePerfFeatures }
      );
      // Apply user model override if set (stored in siteOverrides)
      const modelOverride = site.modelOverride || null;
      const recommendedModel = modelOverride || autoRecommendedModel;

      // Validate DHCP FO association limits
      let foWarning = null;
      if (isSpoke) {
        const partnerIPs = siteAssociations.reduce((sum, assoc) => {
          const pm = assoc.members.find(m => m.rowId !== site.id);
          const ps = pm ? allBasicSites.find(s => s.id === pm.rowId) : null;
          return sum + (ps?.numIPs || 0);
        }, 0);
        const validation = validateDhcpFoLimits(recommendedModel, site.numIPs + partnerIPs);
        if (!validation.valid) foWarning = validation.warning;
      }

      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const RPT_LARGE_QUANTITIES = ['20GB', '50GB', '100GB', '200GB', '500GB'];
      const defaultHardware = site.role === 'Reporting'
        ? (RPT_LARGE_QUANTITIES.includes(site.rptQuantity || '') ? 'TE-2306-HW-AC' : 'TE-1606-HW-AC')
        : getDefaultHardwareSku(recommendedModel);

      // Zero-token roles: CDC (design reference), ND/ND-X (discovery appliances)
      const isZeroTokenRole = site.role === 'CDC' || site.role === 'ND-X' || site.role === 'ND';
      const baseTokens = isZeroTokenRole ? 0 : getTokensForModel(recommendedModel, effectivePlatform);
      const serviceImpact = getServiceImpact(site.services);
      const singleServerTokens = isZeroTokenRole ? 0 : Math.ceil(baseTokens * (1 + serviceImpact / 100));
      
      // HA doubles the SW instances (serverCount * 2 if HA enabled)
      const haMultiplier = site.haEnabled ? 2 : 1;
      const swInstances = site.serverCount * haMultiplier;
      const adjustedTokens = singleServerTokens * swInstances;
      
      // HW count: Reporting is physical. ND is physical. NIOS-V/NXVS/NXaaS are virtual.
      const isVirtualOrCloud = effectivePlatform !== 'NIOS' && effectivePlatform !== 'NX-P'
        && site.role !== 'Reporting';
      const defaultHwCount = isVirtualOrCloud ? 0 : swInstances;
      const hwCount = site.includeHW === false ? 0 : (site.hwCount !== undefined ? site.hwCount : defaultHwCount);

      return {
        ...site,
        platform: effectivePlatform,
        recommendedModel,
        autoRecommendedModel,
        isModelOverridden: !!modelOverride,
        hardwareSku: siteOverrides[site.id]?.hardwareSku || defaultHardware,
        hwAddons: site.hwAddons !== undefined ? site.hwAddons : getDefaultHwAddons(siteOverrides[site.id]?.hardwareSku || defaultHardware),
        hardwareOptions, tokens: adjustedTokens, tokensPerServer: singleServerTokens,
        serviceImpact, isHub, isSpoke, hubLPS, foObjects, partnerCount, foWarning,
        effectivePerfFeatures,
        swInstances,
        hwCount,
        siteAssociations,
        displayLabel,
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue, siteOrder, effectiveAssociations, answers['dhcp-fingerprint']]);

  // Sort sites by unit group (A→B→C→…→RPT→LIC→CDC) then by unit number within group
  const sortByUnit = useCallback(() => {
    const sorted = [...sites].sort((a, b) => {
      const la = a.unitLetterOverride || getUnitLetterForRole(a.role);
      const lb = b.unitLetterOverride || getUnitLetterForRole(b.role);
      const oa = UNIT_SORT_ORDER[la] ?? 99;
      const ob = UNIT_SORT_ORDER[lb] ?? 99;
      if (oa !== ob) return oa - ob;
      // Within A group: GM (and GM+ variants) before GMC (and GMC+ variants)
      if (la === 'A') {
        const aIsGM = (a.role === 'GM' || a.role?.startsWith('GM+')) && !a.role?.startsWith('GMC');
        const bIsGM = (b.role === 'GM' || b.role?.startsWith('GM+')) && !b.role?.startsWith('GMC');
        if (aIsGM && !bIsGM) return -1;
        if (!aIsGM && bIsGM) return 1;
      }
      // Within same group, sort by unit number override or natural order
      const na = a.unitNumberOverride ?? 999;
      const nb = b.unitNumberOverride ?? 999;
      return na - nb;
    });
    setSiteOrder(sorted.map(s => s.id));
  }, [sites, setSiteOrder]);

  // Toggle sort mode and trigger auto-sort when switching to auto
  const toggleSortMode = useCallback(() => {
    if (sortMode === 'manual') {
      // Switching to auto: clear all unitNumberOverride values and trigger sort
      setSiteOverrides(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (next[key]?.unitNumberOverride !== undefined) {
            const updated = { ...next[key] };
            delete updated.unitNumberOverride;
            next[key] = updated;
          }
        });
        return next;
      });
      setSortMode('auto');
      sortByUnit();
    } else {
      // Switching to manual: preserve current order
      setSortMode('manual');
    }
  }, [sortMode, setSortMode, sortByUnit, setSiteOverrides]);

  // One-time cleanup: clear all unitNumberOverride values when in auto mode
  // This ensures existing drawings with legacy overrides get contiguous numbering
  useEffect(() => {
    if (sortMode === 'auto') {
      const hasAnyOverrides = Object.values(siteOverrides).some(
        (override: any) => override?.unitNumberOverride !== undefined
      );
      
      if (hasAnyOverrides) {
        setSiteOverrides(prev => {
          const next = { ...prev };
          let changed = false;
          Object.keys(next).forEach(key => {
            if (next[key]?.unitNumberOverride !== undefined) {
              const updated = { ...next[key] };
              delete updated.unitNumberOverride;
              next[key] = updated;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [sortMode, siteOverrides, setSiteOverrides]);

  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((siteId: string) => {
    setDragSourceId(siteId);
  }, []);

  const handleDragOver = useCallback((siteId: string) => {
    setDragOverId(siteId);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    setDragSourceId(null);
    setDragOverId(null);
    if (!dragSourceId || dragSourceId === targetId) return;
    const currentIds = siteOrder || sites.map(s => s.id);
    const sourceIdx = currentIds.indexOf(dragSourceId);
    const targetIdx = currentIds.indexOf(targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const newOrder = [...currentIds];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, dragSourceId);
    setSiteOrder(newOrder);
    
    // In auto mode, the drag position is preserved, and unit numbers are auto-assigned
    // based on the new order (no re-sort needed, just renumbering happens via unitAssignments)
  }, [dragSourceId, siteOrder, sites, setSiteOrder]);

  const handleDragEnd = useCallback(() => {
    setDragSourceId(null);
    setDragOverId(null);
  }, []);

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
    const infraTokens = sites.reduce((sum, s) => {
      // Only NXVS/NXaaS/NX-P platforms consume BloxOne server tokens — NIOS appliances do not
      if (s.platform !== 'NXVS' && s.platform !== 'NXaaS' && s.platform !== 'NX-P') return sum;
      return sum + (s.tokens || 0);
    }, 0);

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
    // Discovery objects only apply to NIOS sites — NIOS-X platforms don't support NIOS-style discovery
    const niosSitesForGM = sites.filter(s => s.platform !== 'NXVS' && s.platform !== 'NXaaS' && s.platform !== 'NX-P');
    const gmObjects = calculateGMObjects(niosSitesForGM, dhcpPercent, discoveryEnabled);
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
    return partnerSku.sku;
  }, [partnerSku.sku, platformMode]);

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

    const totalObjects = gmSizing?.totalObjects ?? 0;
    setSizingSummary({
      totalTokens: totals.totalTokens, totalIPs: totals.totalIPs,
      partnerSku: partnerSku.sku, siteCount: sites.length,
      infraTokens: totals.infraTokens, securityTokens: totals.securityTokens,
      uddiMgmtTokens: totals.uddiMgmtTokens || 0,
      tokenPack: tokenPacks,
      platformMode: platformMode,
      dnsSiteCount: internalDnsSiteCount,
      externalDnsSiteCount,
      totalObjects,
    });
  }, [totals, partnerSku.sku, sites, tokenPacks, platformMode, setSizingSummary]);

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

    // Platform change → any existing FOA/HA pairing for this site is invalid; remove it
    if ('platform' in updates) {
      setDhcpAssociations((prev: Association[]) => prev.filter(a => !a.members.some(m => m.rowId === siteId)));
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

    // If updating name or KW, sync to context (TopBar) and DON'T add to local override
    if (('knowledgeWorkers' in updates || 'name' in updates) && site.sourceType) {
      const contextUpdates: Record<string, unknown> = {};
      if ('knowledgeWorkers' in updates) contextUpdates.knowledgeWorkers = updates.knowledgeWorkers;
      if ('name' in updates) contextUpdates.name = updates.name;
      if (site.sourceType === 'site' && contextUpdateSite) {
        contextUpdateSite(site.sourceId, contextUpdates);
      } else if (site.sourceType === 'dataCenter' && contextUpdateDC) {
        contextUpdateDC(site.sourceId, contextUpdates);
      }
      // If ONLY name/KW were updated, we're done — don't store in siteOverrides
      const { knowledgeWorkers: _kw, name: _nm, ...remaining } = updates;
      if (Object.keys(remaining).length === 0) return;
      // Otherwise fall through to store remaining fields in siteOverrides
      // (use remaining instead of updates for the rest of the function)
      setSiteOverrides(prev => {
        const doubleKey = siteId.startsWith('site-') ? `site-${siteId}` : (siteId.startsWith('dc-') ? `dc-${siteId}` : null);
        const hasDoubleKey = doubleKey && prev[doubleKey];
        const effectiveKey = hasDoubleKey ? doubleKey : siteId;
        return { ...prev, [effectiveKey]: { ...prev[effectiveKey], ...remaining } };
      });
      return;
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

    // When unit number changes in auto mode, reorder rows within that unit group
    if ('unitNumberOverride' in updates && sortMode === 'auto') {
      if (site) {
        const targetUnitLetter = site.unitLetterOverride || getUnitLetterForRole(site.role);
        const targetNumber = updates.unitNumberOverride;
        
        // If user cleared the number (undefined/null), just clear the override and let auto-assignment handle it
        if (targetNumber === undefined || targetNumber === null) {
          setSiteOverrides(prev => {
            const doubleKey = siteId.startsWith('site-') ? `site-${siteId}` : (siteId.startsWith('dc-') ? `dc-${siteId}` : null);
            const hasDoubleKey = doubleKey && prev[doubleKey];
            const effectiveKey = hasDoubleKey ? doubleKey : siteId;
            const updated = { ...prev[effectiveKey] };
            delete updated.unitNumberOverride;
            return { ...prev, [effectiveKey]: updated };
          });
          return;
        }
        
        // Get all rows in the same unit group
        const sameUnitRows = sites.filter(s => {
          const letter = s.unitLetterOverride || getUnitLetterForRole(s.role);
          return letter === targetUnitLetter;
        });
        
        // Find current position of the site being changed
        const currentIdx = sameUnitRows.findIndex(s => s.id === siteId);
        if (currentIdx === -1) return;
        
        // Calculate target position (0-indexed, but user sees 1-indexed)
        const targetIdx = Math.max(0, Math.min(targetNumber - 1, sameUnitRows.length - 1));
        
        // Reorder within the unit group
        const reordered = [...sameUnitRows];
        const [movedRow] = reordered.splice(currentIdx, 1);
        reordered.splice(targetIdx, 0, movedRow);
        
        // Clear all unitNumberOverride for this unit group (let auto-assignment handle numbering)
        setSiteOverrides(prev => {
          const next = { ...prev };
          reordered.forEach(s => {
            const key = s.id;
            const doubleKey = key.startsWith('site-') ? `site-${key}` : (key.startsWith('dc-') ? `dc-${key}` : null);
            const effectiveKey = (doubleKey && next[doubleKey]) ? doubleKey : key;
            if (next[effectiveKey]?.unitNumberOverride !== undefined) {
              const updated = { ...next[effectiveKey] };
              delete updated.unitNumberOverride;
              next[effectiveKey] = updated;
            }
          });
          return next;
        });
        
        // Update site order: replace the unit group with reordered version
        const otherRows = sites.filter(s => {
          const letter = s.unitLetterOverride || getUnitLetterForRole(s.role);
          return letter !== targetUnitLetter;
        });
        
        // Rebuild order: maintain relative positions of other unit groups
        const currentOrder = siteOrder || sites.map(s => s.id);
        const newOrder = [];
        const reorderedIds = new Set(reordered.map(r => r.id));
        const otherIds = new Set(otherRows.map(r => r.id));
        
        let reorderedInserted = false;
        currentOrder.forEach(id => {
          if (reorderedIds.has(id) && !reorderedInserted) {
            // Insert all reordered rows at the position of the first one
            newOrder.push(...reordered.map(r => r.id));
            reorderedInserted = true;
          } else if (otherIds.has(id)) {
            newOrder.push(id);
          }
        });
        
        // If reordered group wasn't inserted yet, append it
        if (!reorderedInserted) {
          newOrder.push(...reordered.map(r => r.id));
        }
        
        setSiteOrder(newOrder);
        return;
      }
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
  }, [sites, contextUpdateSite, contextUpdateDC, setSiteOrder]);

  // Add manual site - uses context to persist across navigation
  const addManualSite = useCallback(() => {
    const newSiteName = `Site ${sites.length + 1}`;
    // Use context addSite function - sites are persisted in context and saved to server
    if (contextAddSite) {
      // Add to the first data center if one exists, otherwise create without parent
      const parentDcId = dataCenters.length > 0 ? dataCenters[0].id : null;
      contextAddSite(newSiteName, parentDcId, kwNum || 0); // name, dataCenterId, knowledgeWorkers (global KW)
    }
  }, [sites.length, dataCenters, contextAddSite, kwNum]);

  // Add manual data center - syncs to TopBar and updates Discovery # of Data Centers
  // Uses async/await to ensure state is persisted before any navigation
  const addManualDataCenter = useCallback(async () => {
    const currentDCCount = dataCenters.length;
    const newDCName = `Data Center ${currentDCCount + 1}`;
    
    // Add to context (shows in TopBar) — pre-fill with global KW
    if (contextAddDC) {
      contextAddDC(newDCName, kwNum || 0); // name, knowledgeWorkers (global KW)
    }
    
    // Update "# of Data Centers" answer (ud-5) to match the new count
    const newCount = String(currentDCCount + 1);
    setAnswer('ud-5', newCount);
    
    // Force immediate save to server to persist changes before any navigation
    // This prevents the race condition where debounced auto-save loses the change
    if (saveToServer) {
      try {
        await saveToServer();
      } catch (err) {
        console.error(`[addManualDataCenter] Save failed:`, err);
      }
    }
    
  }, [dataCenters.length, contextAddDC, setAnswer, saveToServer, kwNum]);

  // Add discovery site — ND for NIOS mode, ND-X for UDDI/Hybrid
  const addDiscoverySite = useCallback(() => {
    const isNiosOnly = platformMode === 'NIOS';
    const role = isNiosOnly ? 'ND' : 'ND-X';
    const platform = isNiosOnly ? 'NIOS-V' : 'NXVS';
    const unitLetter = isNiosOnly ? 'N' : 'NX';
    // Count existing discovery rows of the same type to get next number (don't renumber on delete)
    const sameTypeCount = sites.filter(s => s.role === role).length;
    const newSiteName = `${unitLetter} ${sameTypeCount + 1}`;
    if (contextAddSite) {
      // Discovery rows: blank location (no parent DC), marked _type='discovery' so TopBar can filter them out
      const newId = (contextAddSite as (...args: unknown[]) => string)(newSiteName, '__discovery__', 0);
      // Set role + platform override immediately so it renders as discovery
      if (newId) {
        const key = newId.startsWith('site-') ? newId : `site-${newId}`;
        setSiteOverrides(prev => ({
          ...prev,
          [key]: { ...prev[key], role, platform, unitLetterOverride: isNiosOnly ? 'N' : 'NX' },
        }));
      }
    }
  }, [platformMode, sites, dataCenters, contextAddSite, setSiteOverrides]);

  // Delete site - removes from context and local overrides
  const deleteSite = useCallback((siteId) => {
    // Clean associations that involve this site
    setDhcpAssociations((prev: Association[]) => prev.filter(a => !a.members.some(m => m.rowId === siteId)));
    // Remove local overrides
    setSiteOverrides(prev => { 
      const next = { ...prev }; 
      delete next[siteId]; 
      return next; 
    });
    
    // Find the site to determine if it's a DC or site
    const site = sites.find(s => s.id === siteId);
    if (site) {
      if (site.sourceType === 'dataCenter' && contextDeleteDC) {
        contextDeleteDC(site.sourceId);
      } else if (site.sourceType === 'site' && contextDeleteSite) {
        contextDeleteSite(site.sourceId);
      }
    }
    
    // In auto mode, renumbering happens automatically via unitAssignments based on remaining order
    // No need to re-sort, just let the unit assignment logic handle sequential numbering
  }, [sites, contextDeleteDC, contextDeleteSite, setDhcpAssociations, setSiteOverrides]);

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
      <div className="border rounded-lg overflow-hidden">
          {/* Sticky header — single compact row */}
          <div className="sticky top-0 z-30 bg-card px-4 lg:px-6 py-2 border-b border-border">
            <div className="relative flex items-center gap-2">

              {/* Drawing tabs — far left */}
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
                compact
              />

              {/* Compare Dialog */}
              <CompareDrawingsDialog
                open={showCompareDialog}
                onOpenChange={setShowCompareDialog}
                drawings={drawings}
                currentSites={sites}
                drawingConfigs={drawingConfigs}
              />

              {/* Stats bar — absolutely centered in header */}
              {!exportView && (() => {
                const ipDeviates = ipCalcValue > 0 &&
                  Math.abs(totals.totalIPs - ipCalcValue) / ipCalcValue > 0.20;
                return (
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-[11px] text-muted-foreground pointer-events-none select-none border border-border rounded px-2 py-0.5 bg-card">
                    <span><span className="font-semibold text-foreground">{sites.filter(s => s.sourceType !== 'dataCenter').length}</span> sites</span>
                    <span className="text-border">·</span>
                    <span><span className="font-semibold text-foreground">{dataCenters.length}</span> DCs</span>
                    <span className="text-border">·</span>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`flex items-center gap-0.5 pointer-events-auto cursor-default ${ipDeviates ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                            <span className={`font-semibold ${ipDeviates ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{formatNumber(totals.totalIPs)}</span>
                            {' '}IPs
                            {ipDeviates && <span className="ml-0.5">⚠</span>}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                          {ipDeviates
                            ? `Total site IPs (${formatNumber(totals.totalIPs)}) deviate >20% from global target (${formatNumber(ipCalcValue)}). DC IPs excluded.`
                            : `Total site IPs: ${formatNumber(totals.totalIPs)} · Global target: ${formatNumber(ipCalcValue)}`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-border">·</span>
                    <span>SW <span className="font-semibold text-foreground">{sites.reduce((sum, s) => sum + (s.swInstances || 0), 0)}</span></span>
                    <span className="text-border">·</span>
                    <span>HW <span className="font-semibold text-foreground">{sites.reduce((sum, s) => sum + (s.hwCount || 0), 0)}</span></span>
                  </div>
                );
              })()}

              {/* Right-side controls */}
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <Button
                  variant={exportView ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => { const v = !exportView; setExportView(v); if (v) { setShowKW(false); setShowServices(false); } }}
                  data-testid="export-view-toggle"
                >
                  Export View
                </Button>

                {!exportView && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1" data-testid="columns-dropdown-trigger">
                        <Columns3 className="h-3 w-3" />
                        Columns
                        {[showDescription, showKW, showServices, showHardware].filter(Boolean).length > 0 && (
                          <span className="ml-0.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 leading-4 font-semibold">
                            {[showDescription, showKW, showServices, showHardware].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-0" align="end">
                      {/* Section 1: Always Exported */}
                      <div className="px-3 pt-3 pb-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileSpreadsheet className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Exported to Lucid</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed pl-0.5 space-y-0.5">
                          <div>Unit · # · Solution · Model · SW# · HW#</div>
                          <div>SW Add-ons · HW Add-ons · RPT · BOM</div>
                          <div className="text-[10px] italic opacity-70">+ Description &amp; HW SKU when toggled on below</div>
                        </div>
                      </div>
                      <div className="border-t mx-3" />
                      {/* Section 2: Working View */}
                      <div className="px-3 pt-2 pb-3">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Working View
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={showDescription} onCheckedChange={setShowDescription} data-testid="show-description-toggle" />
                            <span className="text-foreground">Description</span>
                            <span className="ml-auto text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">exported</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={showKW} onCheckedChange={setShowKW} data-testid="show-kw-toggle" />
                            <span className="text-foreground">KW</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={showServices} onCheckedChange={setShowServices} data-testid="show-services-toggle" />
                            <span className="text-foreground">Services</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={showHardware} onCheckedChange={setShowHardware} data-testid="show-hardware-toggle" />
                            <span className="text-foreground">HW SKU</span>
                            <span className="ml-auto text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">exported</span>
                          </label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  variant={sortMode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleSortMode}
                  className="text-xs h-7 px-2"
                  title={sortMode === 'auto' ? 'Auto-sort enabled (click for manual)' : 'Manual sort (click for auto-sort)'}
                >
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  {sortMode === 'auto' ? 'Auto' : 'Manual'}
                </Button>

                <Button
                  variant="outline" size="sm"
                  onClick={() => exportForLucid(expandedServers, activeDrawing?.name || '10', unitAssignments)}
                  className="text-xs h-7 px-2"
                  data-testid="export-drawing-button"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  Lucid
                </Button>
              </div>
            </div>
          </div>{/* end sticky header area */}

          <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <Table className="table-auto w-full">
              <SizingTableHeader 
                showHardware={showHardware} 
                showKW={showKW && !exportView} 
                showServices={showServices && !exportView}
                showDescription={showDescription && !exportView}
                platformMode={platformMode}
                exportView={exportView}
              />
              <TableBody>
                {(() => {
                  // Calculate total visible columns for the location header colSpan
                  let totalCols = 14; // base: Unit, #/Range, Location, IPs, Role, DHCP, Srv#, HA, Solution, Model, SW#, HW#, SW Add-ons, HW Add-ons
                  if (showDescription && !exportView) totalCols++;
                  if (showKW && !exportView) totalCols++;
                  if (showServices && !exportView) totalCols++;
                  if (showHardware) totalCols++;
                  // tokens column removed — handled by Token Calculator section
                  totalCols += 3; // Rpt, BOM, Actions
                  
                  // Split servers into main rows and discovery rows (ND/ND-X)
                  const isDiscoveryRole = (role: string) => role === 'ND' || role === 'ND-X';
                  const mainServers = expandedServers.filter(srv => !isDiscoveryRole(srv.role));
                  const discoveryServers = expandedServers.filter(srv => isDiscoveryRole(srv.role));

                  const rows = [];
                  let lastParentId = null;
                  
                  // ── Main rows (DNS, DHCP, GM, etc.) ──
                  mainServers.forEach((srv, idx) => {
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
                        showDescription={showDescription && !exportView}
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
                        isDragging={dragSourceId === srv.id}
                        isDragOver={dragOverId === srv.id && dragSourceId !== srv.id}
                        onDragStart={!srv._isExpanded ? () => handleDragStart(srv.id) : undefined}
                        onDragOver={!srv._isExpanded ? () => handleDragOver(srv.id) : undefined}
                        onDrop={!srv._isExpanded ? () => handleDrop(srv.id) : undefined}
                        onDragEnd={!srv._isExpanded ? handleDragEnd : undefined}
                        dhcpAssociations={dhcpAssociations}
                        onAddAssociation={addAssociation}
                        onRemoveAssociation={removeAssociation}
                        unitAssignments={unitAssignments}
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
                            {/* Tokens column removed */}
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

                  // ── Network Discovery section header + column headers + rows (ND / ND-X) ──
                  if (discoveryServers.length > 0 || !exportView) {
                    // Section title row
                    rows.push(
                      <TableRow key="discovery-section-header" className="bg-muted/40 border-t-2 border-primary/20">
                        <TableCell colSpan={totalCols} className="py-1.5 px-3">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">Network Discovery</span>
                            <span className="text-xs text-muted-foreground">{discoveryServers.length} member{discoveryServers.length !== 1 ? 's' : ''}</span>
                            <span className="text-[10px] text-muted-foreground italic ml-auto">Devices = L2/L3 switches &amp; routers</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    // Discovery-specific column headers (compact — no Services, FO/HA, HA, SW Add-ons)
                    if (!exportView) {
                      rows.push(
                        <TableRow key="discovery-col-headers" className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wide">
                          <TableCell className="p-1 w-6" />{/* drag handle */}
                          <TableCell className="p-1 w-14 text-center font-semibold">Unit</TableCell>
                          <TableCell className="p-1 w-12 text-center font-semibold">#</TableCell>
                          <TableCell className="p-1 font-semibold">Location</TableCell>
                          {showKW && <TableCell className="p-1 w-16 font-semibold">KW</TableCell>}
                          <TableCell className="p-1 w-20 font-semibold">Devices</TableCell>
                          <TableCell className="p-1 w-24 font-semibold" colSpan={1 + (showServices ? 1 : 0) + (showDescription ? 1 : 0)}>Role</TableCell>
                          <TableCell className="p-1 w-20 font-semibold">FO / HA</TableCell>
                          <TableCell className="p-1 w-24 text-center font-semibold">Member Count</TableCell>
                          <TableCell className="p-1 w-10 text-center font-semibold">HA</TableCell>
                          <TableCell className="p-1 w-24 font-semibold">Platform</TableCell>
                          <TableCell className="p-1 w-16 font-semibold">Model</TableCell>
                          {showHardware && <TableCell className="p-1 w-28 font-semibold">HW SKU</TableCell>}
                          <TableCell className="p-1 w-12 text-center font-semibold">SW#</TableCell>
                          <TableCell className="p-1 w-16 text-center font-semibold">HW#</TableCell>
                          <TableCell className="p-1 w-20 font-semibold">HW Add-ons</TableCell>
                          <TableCell className="p-1 w-8 text-center font-semibold">Rpt</TableCell>
                          <TableCell className="p-1 w-8 text-center font-semibold">BOM</TableCell>
                          <TableCell className="p-1 w-10" />
                        </TableRow>
                      );
                    }

                    let lastDiscParent = null;
                    discoveryServers.forEach((srv) => {
                      const parentSite = sites.find(s => s.id === srv._parentSiteId);
                      if (srv._isExpanded && srv._parentSiteId !== lastDiscParent && parentSite) {
                        rows.push(
                          <LocationHeaderRow
                            key={`disc-header-${srv._parentSiteId}`}
                            site={parentSite}
                            onUpdateSite={updateSite}
                            onDeleteSite={deleteSite}
                            totalColumns={totalCols}
                          />
                        );
                      }
                      lastDiscParent = srv._parentSiteId;

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
                          showDescription={showDescription && !exportView}
                          exportView={exportView}
                          onUpdateSite={updateSite}
                          onToggleService={() => {}}
                          onTogglePerfFeature={() => {}}
                          onDeleteSite={deleteSite}
                          onOpenModelDialog={openModelDialog}
                          onCopySiteToDrawing={copySiteToDrawing}
                          unitAssignment={unitAssignments[srv.id]}
                          isDragging={dragSourceId === srv.id}
                          isDragOver={dragOverId === srv.id && dragSourceId !== srv.id}
                          onDragStart={!srv._isExpanded ? () => handleDragStart(srv.id) : undefined}
                          onDragOver={!srv._isExpanded ? () => handleDragOver(srv.id) : undefined}
                          onDrop={!srv._isExpanded ? () => handleDrop(srv.id) : undefined}
                          onDragEnd={!srv._isExpanded ? handleDragEnd : undefined}
                          dhcpAssociations={[]}
                          onAddAssociation={addAssociation}
                          onRemoveAssociation={removeAssociation}
                          unitAssignments={unitAssignments}
                        />
                      );
                    });
                  }

                  return rows;
                })()}
              </TableBody>
            </Table>
          </div>{/* end overflowX */}

          {/* Footer — Add Site / Add DC */}
          {!exportView && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/20">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={addManualSite} data-testid="add-site-button">
                <Plus className="h-3 w-3 mr-1" /> Add Site
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={addManualDataCenter} data-testid="add-dc-button">
                <Plus className="h-3 w-3 mr-1" /> Add DC
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={addDiscoverySite} data-testid="add-discovery-button">
                <Plus className="h-3 w-3 mr-1" /> Add Discovery
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}

export default TokenCalculatorSummary;
