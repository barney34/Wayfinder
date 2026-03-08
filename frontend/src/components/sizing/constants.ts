export const DOSSIER_TOKENS_PER_UNIT = 450;
export const LOOKALIKE_TOKENS_PER_UNIT = 1200;
export const DOMAIN_TAKEDOWN_TOKENS_PER_UNIT = 200;

export const NIOS_MODELS = ['TE-926', 'TE-1516', 'TE-1526', 'TE-2326', 'TE-4126'];
export const UDDI_SIZES = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL'];

export interface HardwareSkuMapping {
  default: string;
  alternatives: string[];
  locked?: boolean;
}

export interface HardwareSkuMappings {
  [key: string]: HardwareSkuMapping;
}

export const hardwareSkuMapping: HardwareSkuMappings = {
  // UDDI NX-P appliances
  '3XS': { default: 'TE-906-HW-2AC', alternatives: ['TE-906-HW-AC', 'TE-1506-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  '2XS': { default: 'TE-906-HW-2AC', alternatives: ['TE-906-HW-AC', 'TE-1506-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  'XS':  { default: 'TE-906-HW-2AC', alternatives: ['TE-906-HW-AC', 'TE-1506-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  'S':   { default: 'TE-906-HW-2AC', alternatives: ['TE-906-HW-AC', 'TE-1506-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  'M':   { default: 'TE-1506-HW-AC', alternatives: ['TE-906-HW-2AC', 'TE-906-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  'L':   { default: 'TE-1506-HW-AC', alternatives: ['TE-906-HW-2AC', 'TE-906-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  'XL':  { default: 'TE-1506-HW-AC', alternatives: ['TE-906-HW-2AC', 'TE-906-HW-AC', 'B1-105-HW-AC', 'B1-212-HW-AC'] },
  // NIOS TE-series (software model → hardware chassis options)
  'TE-926':  { default: 'TE-906-HW-2AC', alternatives: ['TE-906-HW-AC', 'TE-906-HW-DC'] },
  'TE-1516': { default: 'TE-1506-HW-AC', alternatives: ['TE-1506-HW-DC', 'TE-1506-10GE-HW-AC', 'TE-1506-10GE-HW-DC'] },
  'TE-1526': { default: 'TE-1606-HW-AC', alternatives: ['TE-1606-HW-DC', 'TE-1606-10GE-HW-AC', 'TE-1606-10GE-HW-DC'] },
  'TE-2326': { default: 'TE-2306-HW-AC', alternatives: ['TE-2306-HW-DC', 'TE-2306-10GE-HW-AC', 'TE-2306-10GE-HW-DC'] },
  'TE-4126': { default: 'TE-4106-HW-AC', alternatives: ['TE-4106-HW-DC', 'TE-4106-10GE-HW-AC', 'TE-4106-10GE-HW-DC'] },
  // NIOS ND-series (Network Discovery appliances)
  'ND-906':  { default: 'ND-906-HW-AC',  alternatives: ['ND-906-HW-DC'] },
  'ND-1606': { default: 'ND-1606-HW-AC', alternatives: ['ND-1606-HW-DC'] },
  'ND-2306': { default: 'ND-2306-HW-AC', alternatives: ['ND-2306-HW-DC'] },
  'ND-4106': { default: 'ND-4106-HW-AC', alternatives: ['ND-4106-HW-DC'] },
  // Reporting Server — physical appliance (auto-driven by rptQuantity threshold)
  'TR-5005': { default: 'TE-1606-HW-AC', alternatives: ['TE-2306-HW-AC'] },
  // Legacy locked models
  'TE-825':  { default: 'TE-805-HW-AC',  alternatives: [], locked: true },
  'TE-2215': { default: 'TE-2205-HW-AC', alternatives: [], locked: true },
  'TE-4015': { default: 'TE-4005-HW-AC', alternatives: ['TE-4005-10G-HW-AC'], locked: true },
  'TE-4025': { default: 'TE-4005-HW-AC', alternatives: ['TE-4005-10G-HW-AC'], locked: true },
};

export interface AssetConfigData {
  assetsPerWorker: number;
  override: boolean;
  knowledgeWorkersOverride: number;
  verifiedPerWorker: number;
  unverifiedPerWorker: number;
  totalAssets: number;
  verifiedAssets: number;
  unverifiedAssets: number;
  growthBufferEnabled: boolean;
  growthBufferOverride: boolean;
  growthBuffer: number;
  tdCloudEnabled: boolean;
  overrideAssetsPerKW: boolean;
  customAssetsPerKW: number;
  overrideVerifiedPerKW: boolean;
  customVerifiedPerKW: number;
  overrideUnverifiedPerKW: boolean;
  customUnverifiedPerKW: number;
}

export const defaultAssetConfigData: AssetConfigData = {
  assetsPerWorker: 4.0,
  override: false,
  knowledgeWorkersOverride: 0,
  verifiedPerWorker: 0.86,
  unverifiedPerWorker: 3.14,
  totalAssets: 0,
  verifiedAssets: 0,
  unverifiedAssets: 0,
  growthBufferEnabled: false,
  growthBufferOverride: false,
  growthBuffer: 0.15,
  tdCloudEnabled: false,
  overrideAssetsPerKW: false,
  customAssetsPerKW: 0,
  overrideVerifiedPerKW: false,
  customVerifiedPerKW: 0,
  overrideUnverifiedPerKW: false,
  customUnverifiedPerKW: 0,
};

export interface ReportingData {
  enabled: boolean;
  collapsed: boolean;
  securityEventsOverride: boolean;
  securityEventsPercent: number;
  securityEventsTokens: number;
  reportingGrowthBufferEnabled: boolean;
  reportingGrowthBuffer: number;
  securityEventsEnabled: boolean;
  totalReportingTokens: number;
  verifiedAssets: number;
  unverifiedAssets: number;
}

export const defaultReportingData: ReportingData = {
  enabled: false,
  collapsed: true,
  securityEventsOverride: false,
  securityEventsPercent: 5,
  securityEventsTokens: 0,
  reportingGrowthBufferEnabled: false,
  reportingGrowthBuffer: 15,
  securityEventsEnabled: true,
  totalReportingTokens: 0,
  verifiedAssets: 0,
  unverifiedAssets: 0,
};

export interface UDDIServer {
  id: string;
  serverType: string;
  serverSize?: string;
  name?: string;
  numIPs?: number;
  role?: string;
  platform?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UDDIData {
  enabled: boolean;
  mode: string;
  knowledgeWorkers: number;
  devicesPerUser: number;
  isIPv6InScope: boolean;
  activeIPs: number;
  assets: number;
  dhcpPercent: number;
  staticPercent: number;
  enableDNSManagement: boolean;
  enableDNSProtocol: boolean;
  staticClients: number;
  servers: UDDIServer[];
  dynamicClients: number;
  enableIPAMManagement: boolean;
  enableDHCPManagement: boolean;
  enableDHCPProtocol: boolean;
  dhcpClients: number;
  sitesBranches: number;
  networksPerSite: number;
  daysPerMonth: number;
  workdaysPerMonth: number;
  secondsPerWorkdayHrs: number;
  qpdPerActiveIP: number;
  dnsRecsPerIP: number;
  dnsRecsPerLease: number;
  bufferOverhead: number;
  dhcpHaFo: boolean;
  defaultLeaseTimeHr: number;
  growthBuffer: number;
  ddiObjects: number;
  calculatedActiveIPs: number;
  discoveredAssets: number;
  totalManagementTokens: number;
  totalMonthlyLogs: number;
}

export const defaultUDDIData: UDDIData = {
  enabled: false,
  mode: 'native',
  knowledgeWorkers: 0,
  devicesPerUser: 2.5,
  isIPv6InScope: false,
  activeIPs: 0,
  assets: 0,
  dhcpPercent: 80,
  staticPercent: 20,
  enableDNSManagement: true,
  enableDNSProtocol: true,
  staticClients: 0,
  servers: [],
  dynamicClients: 0,
  enableIPAMManagement: true,
  enableDHCPManagement: true,
  enableDHCPProtocol: true,
  dhcpClients: 0,
  sitesBranches: 0,
  networksPerSite: 0,
  daysPerMonth: 31,
  workdaysPerMonth: 22,
  secondsPerWorkdayHrs: 9,
  qpdPerActiveIP: 3500,
  dnsRecsPerIP: 2.0,
  dnsRecsPerLease: 3.0,
  bufferOverhead: 15,
  dhcpHaFo: true,
  defaultLeaseTimeHr: 1.0,
  growthBuffer: 20,
  ddiObjects: 0,
  calculatedActiveIPs: 0,
  discoveredAssets: 0,
  totalManagementTokens: 0,
  totalMonthlyLogs: 0,
};
