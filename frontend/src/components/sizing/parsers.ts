import { defaultAssetConfigData, defaultUDDIData, AssetConfigData, UDDIData } from './constants';
import { getAssetTier } from '@/lib/tokenData';

export interface Token {
  id: string;
  model: 'X5' | 'X6';
  appSize: number;
  tokens: number;
  quantity?: number;
}

export interface TDNiosData {
  enabled: boolean;
  collapsed: boolean;
  tokens: Token[];
}

export interface DossierData {
  enabled: boolean;
  quantity: number;
}

export interface LookalikeData {
  enabled: boolean;
  quantity: number;
}

export interface SocInsightsData {
  enabled: boolean;
  collapsed: boolean;
  knowledgeWorkers: number;
  overrideKW: boolean;
  assetsPerWorker: number;
  overrideAPW: boolean;
  totalAssets: number;
  calculatedTokens: number;
}

export interface DomainTakedownData {
  enabled: boolean;
  collapsed: boolean;
  quantity: number;
}

export interface ReportingDataExtended {
  enabled: boolean;
  collapsed: boolean;
  securityEventsOverride: boolean;
  securityEventsPercent: number;
  securityEventsTokens: number;
  reportingGrowthBufferEnabled: boolean;
  reportingGrowthBuffer: number;
  totalReportingTokens?: number;
  verifiedAssets?: number;
  unverifiedAssets?: number;
}

export interface SiteData {
  id: string;
  name?: string;
  serverType?: string;
  numIPs?: number;
  role?: string;
  platform?: string;
  knowledgeWorkers?: number;
  dhcpPercent?: number;
  [key: string]: string | number | boolean | undefined | string[];
}

export function safeParseTokens(value: string): Token[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        item => typeof item === 'object' && item !== null &&
          typeof item.id === 'string' &&
          (item.model === 'X5' || item.model === 'X6') &&
          typeof item.appSize === 'number' &&
          typeof item.tokens === 'number'
      ).map(item => ({
        ...item,
        quantity: typeof item.quantity === 'number' ? item.quantity : 1
      }));
    }
    return [];
  } catch { return []; }
}

export function safeParseTDNios(value: string): TDNiosData {
  if (!value) return { enabled: false, collapsed: false, tokens: [] };
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const legacyTokens = parsed.filter(
        item => typeof item === 'object' && item !== null &&
          typeof item.id === 'string' &&
          (item.model === 'X5' || item.model === 'X6') &&
          typeof item.appSize === 'number' &&
          typeof item.tokens === 'number'
      ).map(item => ({ ...item, quantity: typeof item.quantity === 'number' ? item.quantity : 1 }));
      return { enabled: legacyTokens.length > 0, collapsed: false, tokens: legacyTokens };
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : false,
        tokens: Array.isArray(parsed.tokens) ? parsed.tokens.filter(
          item => typeof item === 'object' && item !== null &&
            typeof item.id === 'string' &&
            (item.model === 'X5' || item.model === 'X6') &&
            typeof item.appSize === 'number' &&
            typeof item.tokens === 'number'
        ).map(item => ({ ...item, quantity: typeof item.quantity === 'number' ? item.quantity : 1 })) : [],
      };
    }
    return { enabled: false, collapsed: true, tokens: [] };
  } catch { return { enabled: false, collapsed: true, tokens: [] }; }
}

export function safeParseDossier(value: string): DossierData {
  if (!value) return { enabled: false, quantity: 0 };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        quantity: typeof parsed.quantity === 'number' ? parsed.quantity : 0,
      };
    }
    return { enabled: false, quantity: 0 };
  } catch { return { enabled: false, quantity: 0 }; }
}

export function safeParseLookalike(value: string): LookalikeData {
  if (!value) return { enabled: false, quantity: 0 };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        quantity: typeof parsed.quantity === 'number' ? parsed.quantity : 0,
      };
    }
    return { enabled: false, quantity: 0 };
  } catch { return { enabled: false, quantity: 0 }; }
}

export function safeParseAssetConfig(value: string, knowledgeWorkers = 0): AssetConfigData {
  if (!value) {
    const tier = getAssetTier(knowledgeWorkers);
    return {
      ...defaultAssetConfigData,
      assetsPerWorker: tier.assetsPerWorker,
      verifiedPerWorker: tier.verifiedPerWorker,
      unverifiedPerWorker: tier.unverifiedPerWorker,
      totalAssets: Math.round(knowledgeWorkers * tier.assetsPerWorker),
      verifiedAssets: Math.ceil(knowledgeWorkers * tier.verifiedPerWorker),
      unverifiedAssets: Math.round(knowledgeWorkers * tier.assetsPerWorker) - Math.ceil(knowledgeWorkers * tier.verifiedPerWorker),
    };
  }
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      const tier = getAssetTier(knowledgeWorkers);
      return {
        assetsPerWorker: typeof parsed.assetsPerWorker === 'number' ? parsed.assetsPerWorker : tier.assetsPerWorker,
        override: typeof parsed.override === 'boolean' ? parsed.override : false,
        knowledgeWorkersOverride: typeof parsed.knowledgeWorkersOverride === 'number' ? parsed.knowledgeWorkersOverride : 0,
        verifiedPerWorker: typeof parsed.verifiedPerWorker === 'number' ? parsed.verifiedPerWorker : tier.verifiedPerWorker,
        unverifiedPerWorker: typeof parsed.unverifiedPerWorker === 'number' ? parsed.unverifiedPerWorker : tier.unverifiedPerWorker,
        totalAssets: typeof parsed.totalAssets === 'number' ? parsed.totalAssets : Math.round(knowledgeWorkers * tier.assetsPerWorker),
        verifiedAssets: typeof parsed.verifiedAssets === 'number' ? parsed.verifiedAssets : Math.ceil(knowledgeWorkers * tier.verifiedPerWorker),
        unverifiedAssets: typeof parsed.unverifiedAssets === 'number' ? parsed.unverifiedAssets : Math.round(knowledgeWorkers * tier.assetsPerWorker) - Math.ceil(knowledgeWorkers * tier.verifiedPerWorker),
        growthBufferEnabled: typeof parsed.growthBufferEnabled === 'boolean' ? parsed.growthBufferEnabled : false,
        growthBufferOverride: typeof parsed.growthBufferOverride === 'boolean' ? parsed.growthBufferOverride : false,
        growthBuffer: typeof parsed.growthBuffer === 'number' ? parsed.growthBuffer : 0.15,
        tdCloudEnabled: typeof parsed.tdCloudEnabled === 'boolean' ? parsed.tdCloudEnabled : false,
        overrideAssetsPerKW: typeof parsed.overrideAssetsPerKW === 'boolean' ? parsed.overrideAssetsPerKW : false,
        customAssetsPerKW: typeof parsed.customAssetsPerKW === 'number' ? parsed.customAssetsPerKW : 0,
        overrideVerifiedPerKW: typeof parsed.overrideVerifiedPerKW === 'boolean' ? parsed.overrideVerifiedPerKW : false,
        customVerifiedPerKW: typeof parsed.customVerifiedPerKW === 'number' ? parsed.customVerifiedPerKW : 0,
        overrideUnverifiedPerKW: typeof parsed.overrideUnverifiedPerKW === 'boolean' ? parsed.overrideUnverifiedPerKW : false,
        customUnverifiedPerKW: typeof parsed.customUnverifiedPerKW === 'number' ? parsed.customUnverifiedPerKW : 0,
      };
    }
    return { ...defaultAssetConfigData };
  } catch { return { ...defaultAssetConfigData }; }
}

export function safeParseSocInsights(value: string): SocInsightsData {
  const defaults: SocInsightsData = { enabled: false, collapsed: true, knowledgeWorkers: 0, overrideKW: false, assetsPerWorker: 4.0, overrideAPW: false, totalAssets: 0, calculatedTokens: 0 };
  if (!value) return defaults;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : true,
        knowledgeWorkers: typeof parsed.knowledgeWorkers === 'number' ? parsed.knowledgeWorkers : 0,
        overrideKW: typeof parsed.overrideKW === 'boolean' ? parsed.overrideKW : false,
        assetsPerWorker: typeof parsed.assetsPerWorker === 'number' ? parsed.assetsPerWorker : 4.0,
        overrideAPW: typeof parsed.overrideAPW === 'boolean' ? parsed.overrideAPW : false,
        totalAssets: typeof parsed.totalAssets === 'number' ? parsed.totalAssets : 0,
        calculatedTokens: typeof parsed.calculatedTokens === 'number' ? parsed.calculatedTokens : 0,
      };
    }
    return defaults;
  } catch { return defaults; }
}

export function safeParseDomainTakedown(value: string): DomainTakedownData {
  if (!value) return { enabled: false, collapsed: true, quantity: 0 };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : true,
        quantity: typeof parsed.quantity === 'number' ? parsed.quantity : 0,
      };
    }
    return { enabled: false, collapsed: true, quantity: 0 };
  } catch { return { enabled: false, collapsed: true, quantity: 0 }; }
}

export function safeParseReporting(value: string): ReportingDataExtended {
  const defaults: ReportingDataExtended = { enabled: false, collapsed: true, securityEventsOverride: false, securityEventsPercent: 5, securityEventsTokens: 0, reportingGrowthBufferEnabled: false, reportingGrowthBuffer: 15 };
  if (!value) return defaults;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
        collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : true,
        securityEventsOverride: typeof parsed.securityEventsOverride === 'boolean' ? parsed.securityEventsOverride : false,
        securityEventsPercent: typeof parsed.securityEventsPercent === 'number' ? parsed.securityEventsPercent : 5,
        securityEventsTokens: typeof parsed.securityEventsTokens === 'number' ? parsed.securityEventsTokens : 0,
        reportingGrowthBufferEnabled: typeof parsed.reportingGrowthBufferEnabled === 'boolean' ? parsed.reportingGrowthBufferEnabled : false,
        reportingGrowthBuffer: typeof parsed.reportingGrowthBuffer === 'number' ? parsed.reportingGrowthBuffer : 15,
      };
    }
    return defaults;
  } catch { return defaults; }
}

export function safeParseUDDI(value: string): UDDIData {
  if (!value) return { ...defaultUDDIData };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaultUDDIData.enabled,
        mode: parsed.mode === 'nios' ? 'nios' : 'native',
        knowledgeWorkers: typeof parsed.knowledgeWorkers === 'number' ? parsed.knowledgeWorkers : defaultUDDIData.knowledgeWorkers,
        devicesPerUser: typeof parsed.devicesPerUser === 'number' ? parsed.devicesPerUser : defaultUDDIData.devicesPerUser,
        isIPv6InScope: typeof parsed.isIPv6InScope === 'boolean' ? parsed.isIPv6InScope : defaultUDDIData.isIPv6InScope,
        activeIPs: typeof parsed.activeIPs === 'number' ? parsed.activeIPs : defaultUDDIData.activeIPs,
        assets: typeof parsed.assets === 'number' ? parsed.assets : defaultUDDIData.assets,
        dhcpPercent: typeof parsed.dhcpPercent === 'number' ? parsed.dhcpPercent : defaultUDDIData.dhcpPercent,
        staticPercent: typeof parsed.staticPercent === 'number' ? parsed.staticPercent : defaultUDDIData.staticPercent,
        enableDNSManagement: typeof parsed.enableDNSManagement === 'boolean' ? parsed.enableDNSManagement : defaultUDDIData.enableDNSManagement,
        enableDNSProtocol: typeof parsed.enableDNSProtocol === 'boolean' ? parsed.enableDNSProtocol : defaultUDDIData.enableDNSProtocol,
        staticClients: typeof parsed.staticClients === 'number' ? parsed.staticClients : defaultUDDIData.staticClients,
        dynamicClients: typeof parsed.dynamicClients === 'number' ? parsed.dynamicClients : defaultUDDIData.dynamicClients,
        enableIPAMManagement: typeof parsed.enableIPAMManagement === 'boolean' ? parsed.enableIPAMManagement : defaultUDDIData.enableIPAMManagement,
        enableDHCPManagement: typeof parsed.enableDHCPManagement === 'boolean' ? parsed.enableDHCPManagement : defaultUDDIData.enableDHCPManagement,
        enableDHCPProtocol: typeof parsed.enableDHCPProtocol === 'boolean' ? parsed.enableDHCPProtocol : defaultUDDIData.enableDHCPProtocol,
        dhcpClients: typeof parsed.dhcpClients === 'number' ? parsed.dhcpClients : defaultUDDIData.dhcpClients,
        sitesBranches: typeof parsed.sitesBranches === 'number' ? parsed.sitesBranches : defaultUDDIData.sitesBranches,
        networksPerSite: typeof parsed.networksPerSite === 'number' ? parsed.networksPerSite : defaultUDDIData.networksPerSite,
        daysPerMonth: typeof parsed.daysPerMonth === 'number' ? parsed.daysPerMonth : defaultUDDIData.daysPerMonth,
        workdaysPerMonth: typeof parsed.workdaysPerMonth === 'number' ? parsed.workdaysPerMonth : defaultUDDIData.workdaysPerMonth,
        secondsPerWorkdayHrs: typeof parsed.secondsPerWorkdayHrs === 'number' ? parsed.secondsPerWorkdayHrs : defaultUDDIData.secondsPerWorkdayHrs,
        qpdPerActiveIP: typeof parsed.qpdPerActiveIP === 'number' ? parsed.qpdPerActiveIP : defaultUDDIData.qpdPerActiveIP,
        dnsRecsPerIP: typeof parsed.dnsRecsPerIP === 'number' ? parsed.dnsRecsPerIP : defaultUDDIData.dnsRecsPerIP,
        dnsRecsPerLease: typeof parsed.dnsRecsPerLease === 'number' ? parsed.dnsRecsPerLease : defaultUDDIData.dnsRecsPerLease,
        bufferOverhead: typeof parsed.bufferOverhead === 'number' ? parsed.bufferOverhead : defaultUDDIData.bufferOverhead,
        dhcpHaFo: typeof parsed.dhcpHaFo === 'boolean' ? parsed.dhcpHaFo : defaultUDDIData.dhcpHaFo,
        defaultLeaseTimeHr: typeof parsed.defaultLeaseTimeHr === 'number' ? parsed.defaultLeaseTimeHr : defaultUDDIData.defaultLeaseTimeHr,
        growthBuffer: typeof parsed.growthBuffer === 'number' ? parsed.growthBuffer : defaultUDDIData.growthBuffer,
        servers: Array.isArray(parsed.servers) 
          ? parsed.servers.filter(s => typeof s === 'object' && s !== null && typeof s.id === 'string' && typeof s.serverType === 'string')
          : defaultUDDIData.servers,
        ddiObjects: typeof parsed.ddiObjects === 'number' ? parsed.ddiObjects : defaultUDDIData.ddiObjects,
        calculatedActiveIPs: typeof parsed.calculatedActiveIPs === 'number' ? parsed.calculatedActiveIPs : defaultUDDIData.calculatedActiveIPs,
        discoveredAssets: typeof parsed.discoveredAssets === 'number' ? parsed.discoveredAssets : defaultUDDIData.discoveredAssets,
        totalManagementTokens: typeof parsed.totalManagementTokens === 'number' ? parsed.totalManagementTokens : defaultUDDIData.totalManagementTokens,
        totalMonthlyLogs: typeof parsed.totalMonthlyLogs === 'number' ? parsed.totalMonthlyLogs : defaultUDDIData.totalMonthlyLogs,
      };
    }
    return { ...defaultUDDIData };
  } catch { return { ...defaultUDDIData }; }
}

export function safeParseSites(value: string): SiteData[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [];
  } catch { return []; }
}
