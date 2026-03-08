/**
 * useSiteSizing — extracted computation hook for TokenCalculatorSummary
 *
 * Handles: site building from context, DHCP FO calculations, model selection,
 * token calculations, server expansion, unit assignments, totals, GM sizing, BOM.
 *
 * This keeps TokenCalculatorSummary focused on UI rendering and user interactions.
 */
import { useMemo, useCallback } from 'react';
import { useDiscovery } from '@/contexts/DiscoveryContext';
import {
  getSiteRecommendedModel,
  getDefaultHardwareSku,
  getHardwareSkuOptions,
  getDefaultHwAddons,
  calculateSiteLPS,
  calculateSiteDhcpObjects,
  validateDhcpFoLimits,
} from '../calculations';
import {
  gmServiceRestrictions,
  calculateGMObjects,
  findMinimumGMModel,
} from '@/lib/tokenData';
import { ROLE_OPTIONS_BY_MODE, PLATFORM_OPTIONS_BY_MODE } from './platformConfig';
import { getServiceImpact, getTokensForModel, getPartnerSkuFromTokens, getSkuDescription } from './tokenUtils';
import { computeUnitAssignments, getUnitLetterForRole, UNIT_SORT_ORDER } from './unitDesignations';

/**
 * Core sizing computation hook.
 * Consumes DiscoveryContext + drawing config and returns all computed sizing data.
 */
export function useSiteSizing() {
  const {
    dataCenters = [], sites: contextSites = [], answers = {},
    drawings, activeDrawingId, drawingConfigs,
    getDrawingConfig,
  } = useDiscovery();

  // Get active drawing config
  const activeDrawingConfig = getDrawingConfig(activeDrawingId);
  const siteOverrides = useMemo(
    () => activeDrawingConfig.siteOverrides || {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDrawingId, drawingConfigs]
  );
  const siteOrder = activeDrawingConfig.siteOrder || null;

  // Per-drawing platform mode
  const platformMode = activeDrawingConfig.platformMode || 'NIOS';
  const securityEnabled = activeDrawingConfig.featureSecurity ?? (answers['feature-security'] === 'Yes');
  const uddiEnabled = activeDrawingConfig.featureUDDI ?? (answers['feature-uddi'] === 'Yes');

  // Global settings from answers
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;

  // IP Calculator value
  const manualOverride = answers['ipam-1-override'] === 'true';
  const kwNum = parseInt(answers['ud-1']) || 0;
  const calculatedIPs = Math.round(kwNum * ipMultiplier);
  const manualIPs = parseInt(answers['ipam-1']) || 0;
  const ipCalcValue = manualOverride ? manualIPs : calculatedIPs;

  // Role/platform options based on platform mode
  const roleOptions = ROLE_OPTIONS_BY_MODE[platformMode] || ROLE_OPTIONS_BY_MODE.NIOS;
  const platformOptions = PLATFORM_OPTIONS_BY_MODE[platformMode] || PLATFORM_OPTIONS_BY_MODE.NIOS;

  // Stable IDs for memoization
  const dataCenterIds = useMemo(() => dataCenters.map(dc => dc.id).join(','), [dataCenters]);
  const contextSiteIds = useMemo(() => contextSites.map(s => s.id).join(','), [contextSites]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Build sites from Quick Capture + manual
  // ═══════════════════════════════════════════════════════════════════════════
  const sites = useMemo(() => {
    const buildBasicSite = (source: any, index: number, type: string) => {
      const hasPrefix = source.id.startsWith('site-') || source.id.startsWith('dc-');
      const singleKey = hasPrefix ? source.id : (type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`);
      const doubleKey = type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`;
      const override = siteOverrides[singleKey] || siteOverrides[doubleKey] || {};
      const key = singleKey;
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

      let numIPs: number;
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
        haEnabled: override.haEnabled || false,
        hwCount: override.hwCount,
        swAddons: override.swAddons || [],
        hwAddons: override.hwAddons, // Leave hwAddons undefined when not overridden
        sfpAddons: override.sfpAddons || {},
        perfFeatures: override.perfFeatures || [],
        rptQuantity: override.rptQuantity || null,
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

    // Apply manual sort order
    let allBasicSites: ReturnType<typeof buildBasicSite>[];
    if (siteOrder && siteOrder.length > 0) {
      const idToSite = Object.fromEntries(naturalOrder.map(s => [s.id, s]));
      const ordered = siteOrder.map((id: string) => idToSite[id]).filter(Boolean);
      const inOrder = new Set(siteOrder);
      naturalOrder.forEach(s => { if (!inOrder.has(s.id)) ordered.push(s); });
      allBasicSites = ordered;
    } else {
      allBasicSites = naturalOrder;
    }

    // ── DHCP FO: Calculate Hub LPS + FO Object Replication ──
    const HUB_FAILOVER_CAPACITY = 0.5;
    const hubLPSMap: Record<string, number> = {};
    const foObjectsMap: Record<string, number> = {};
    const partnerCountMap: Record<string, number> = {};

    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const spokeLPS = calculateSiteLPS(site.numIPs, site.dhcpPercent, site.role);
        const spokeDhcpObjs = calculateSiteDhcpObjects(site.numIPs, site.dhcpPercent);
        hubLPSMap[site.dhcpPartner] = (hubLPSMap[site.dhcpPartner] || 0) + Math.ceil(spokeLPS * HUB_FAILOVER_CAPACITY);
        foObjectsMap[site.dhcpPartner] = (foObjectsMap[site.dhcpPartner] || 0) + spokeDhcpObjs;
        partnerCountMap[site.dhcpPartner] = (partnerCountMap[site.dhcpPartner] || 0) + 1;
      }
    });

    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        const partnerSite = allBasicSites.find(s => s.id === site.dhcpPartner);
        if (partnerSite) {
          const partnerDhcpObjs = calculateSiteDhcpObjects(partnerSite.numIPs, partnerSite.dhcpPercent);
          foObjectsMap[site.id] = (foObjectsMap[site.id] || 0) + partnerDhcpObjs;
        }
      }
    });

    // ── Pass 2: Calculate model/tokens ──
    return allBasicSites.map(site => {
      const isSpoke = !!site.dhcpPartner;
      const hubLPS = hubLPSMap[site.id] || 0;
      const isHub = hubLPS > 0;
      const foObjects = foObjectsMap[site.id] || 0;
      const partnerCount = partnerCountMap[site.id] || 0;

      const effectivePlatform = site.role === 'Reporting'
        ? (site.platform || 'NIOS-V')
        : site.platform;

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
      const modelOverride = (site as any).modelOverride || null;
      const recommendedModel = modelOverride || autoRecommendedModel;

      let foWarning: string | null = null;
      if (isHub || isSpoke) {
        const totalFoIPs = isHub
          ? site.numIPs + allBasicSites.filter(s => s.dhcpPartner === site.id).reduce((sum, s) => sum + s.numIPs, 0)
          : site.numIPs + (allBasicSites.find(s => s.id === site.dhcpPartner)?.numIPs || 0);
        const validation = validateDhcpFoLimits(recommendedModel, totalFoIPs);
        if (!validation.valid) foWarning = validation.warning;
      }

      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);

      const isCDC = site.role === 'CDC';
      const baseTokens = isCDC ? 0 : getTokensForModel(recommendedModel, effectivePlatform);
      const serviceImpact = getServiceImpact(site.services);
      const singleServerTokens = isCDC ? 0 : Math.ceil(baseTokens * (1 + serviceImpact / 100));

      const haMultiplier = site.haEnabled ? 2 : 1;
      const swInstances = site.serverCount * haMultiplier;
      const adjustedTokens = singleServerTokens * swInstances;

      const isVirtualOrCloud = effectivePlatform !== 'NIOS' && effectivePlatform !== 'NX-P'
        || site.role === 'Reporting';
      const defaultHwCount = isVirtualOrCloud ? 0 : swInstances;
      const hwCount = (site as any).includeHW === false ? 0 : (site.hwCount !== undefined ? site.hwCount : defaultHwCount);

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
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue, siteOrder, answers['dhcp-fingerprint']]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Sort
  // ═══════════════════════════════════════════════════════════════════════════
  const sortByUnit = useCallback((setSiteOrder: (order: string[]) => void) => {
    const sorted = [...sites].sort((a, b) => {
      const la = a.unitLetterOverride || getUnitLetterForRole(a.role);
      const lb = b.unitLetterOverride || getUnitLetterForRole(b.role);
      const oa = UNIT_SORT_ORDER[la] ?? 99;
      const ob = UNIT_SORT_ORDER[lb] ?? 99;
      if (oa !== ob) return oa - ob;
      const na = a.unitNumberOverride ?? 999;
      const nb = b.unitNumberOverride ?? 999;
      return na - nb;
    });
    setSiteOrder(sorted.map(s => s.id));
  }, [sites]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Expand sites into display rows
  // ═══════════════════════════════════════════════════════════════════════════
  const expandedServers = useMemo(() => {
    const result: any[] = [];
    sites.forEach(site => {
      const count = site.serverCount || 1;
      if (count <= 1) {
        result.push({ ...site, _isExpanded: false, _serverIndex: 0, _parentSiteId: site.id });
      } else {
        const serverOverrides = (siteOverrides[site.id] as any)?.servers || {};
        const groupMode = site.groupingMode || 'individual';
        const customGroups = site.customGroups || [];

        if (groupMode === 'combined') {
          const srvOvr = serverOverrides[0] || {};
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
            _serverCount: count,
            serverCount: 1,
            swInstances: count * (site.haEnabled ? 2 : 1),
            hwCount: site.hwCount !== undefined ? site.hwCount : count,
          });
        } else if (groupMode === 'custom' && customGroups.length > 0) {
          const siteRows: any[] = [];
          const grouped = new Set<number>();

          customGroups.forEach(([s, e]: [number, number]) => {
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

          siteRows.sort((a, b) => a._serverIndex - b._serverIndex);
          result.push(...siteRows);
        } else {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Unit assignments
  // ═══════════════════════════════════════════════════════════════════════════
  const unitAssignments = useMemo(() => {
    const serversForUnit = expandedServers.map(srv => ({
      id: srv.id,
      role: srv.role,
      unitLetterOverride: srv.unitLetterOverride || null,
      _serverCount: srv._serverCount || 1,
    }));
    return computeUnitAssignments(serversForUnit);
  }, [expandedServers]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Totals
  // ═══════════════════════════════════════════════════════════════════════════
  const totals = useMemo(() => {
    const memberSites = sites.filter(s => s.role !== 'GM' && s.role !== 'GMC' && !s.role?.startsWith('GM+') && !s.role?.startsWith('GMC+'));
    const totalIPs = memberSites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const infraTokens = sites.reduce((sum, s) => sum + ((s as any).tokens || 0), 0);

    const tdTokens = parseInt(answers['td-cloud-tokens']) || 0;
    const dossierTokens = parseInt(answers['dossier-tokens']) || 0;
    const lookalikeTokens = parseInt(answers['lookalike-tokens']) || 0;
    const socTokens = parseInt(answers['soc-insights-tokens']) || 0;
    const domainTokens = parseInt(answers['domain-takedown-tokens']) || 0;
    const reportingTokens = parseInt(answers['reporting-tokens']) || 0;
    const securityTokens = securityEnabled ? (tdTokens + dossierTokens + lookalikeTokens + socTokens + domainTokens + reportingTokens) : 0;
    const uddiMgmtTokens = uddiEnabled ? (parseInt(answers['uddi-mgmt-tokens']) || 0) : 0;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // GM Sizing
  // ═══════════════════════════════════════════════════════════════════════════
  const gmSizing = useMemo(() => {
    if (platformMode === 'UDDI') return null;
    const discoveryEnabled = answers['feature-discovery'] === 'Yes';
    const gmObjects = calculateGMObjects(sites, dhcpPercent, discoveryEnabled);
    const recommendedGM = findMinimumGMModel(gmObjects.totalObjects);
    const gmSites = sites.filter(s => s.role === 'GM' || s.role === 'GMC');
    const serviceWarnings = gmSites
      .filter(s => { const r = gmServiceRestrictions[(s as any).recommendedModel]; return r && !r.canRunServices; })
      .map(s => ({ site: s.name, model: (s as any).recommendedModel, warning: gmServiceRestrictions[(s as any).recommendedModel]?.note }));
    return { ...gmObjects, recommendedGM, serviceWarnings, memberCount: totals.memberCount };
  }, [sites, dhcpPercent, platformMode, answers, totals.memberCount]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BOM
  // ═══════════════════════════════════════════════════════════════════════════
  const bom = useMemo(() => {
    const bomItems: Record<string, { sku: string; description: string; quantity: number; sites: string[] }> = {};
    sites.forEach(site => {
      const sku = (site as any).hardwareSku || 'N/A';
      if (!sku || sku === 'N/A' || sku === 'VM' || sku === 'Cloud') return;
      const hwCount = (site as any).hwCount ?? 0;
      if (hwCount <= 0) return;
      if (!bomItems[sku]) bomItems[sku] = { sku, description: getSkuDescription(sku), quantity: 0, sites: [] };
      bomItems[sku].quantity += hwCount;
      bomItems[sku].sites.push(site.name);
    });
    return Object.values(bomItems);
  }, [sites]);

  const partnerSku = useMemo(() => getPartnerSkuFromTokens(totals.totalTokens), [totals.totalTokens]);

  const tokenPacks = useMemo(() => {
    if (platformMode === 'NIOS' || totals.totalTokens <= 0) return null;
    return getPartnerSkuFromTokens(totals.totalTokens).sku;
  }, [totals.totalTokens, platformMode]);

  return {
    // Computed data
    sites,
    expandedServers,
    unitAssignments,
    totals,
    gmSizing,
    bom,
    partnerSku,
    tokenPacks,

    // Config / derived state
    platformMode,
    securityEnabled,
    uddiEnabled,
    dhcpPercent,
    leaseTimeSeconds,
    ipMultiplier,
    ipCalcValue,
    roleOptions,
    platformOptions,
    siteOverrides,
    siteOrder,

    // Helpers
    sortByUnit,
  };
}
