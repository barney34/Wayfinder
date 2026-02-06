// Token models for NIOS X5/X6 series
export const tokenModels = [
  { model: 'X6', appSize: 926, tokens: 880 },
  { model: 'X6', appSize: 1516, tokens: 2270 },
  { model: 'X6', appSize: 1526, tokens: 2995 },
  { model: 'X6', appSize: 2326, tokens: 6755 },
  { model: 'X6', appSize: 4126, tokens: 17010 },
  { model: 'X5', appSize: 1415, tokens: 1800 },
  { model: 'X5', appSize: 1425, tokens: 2600 },
  { model: 'X5', appSize: 2215, tokens: 3860 },
  { model: 'X5', appSize: 2225, tokens: 5225 },
  { model: 'X5', appSize: 4015, tokens: 11690 },
  { model: 'X5', appSize: 4025, tokens: 13610 },
];

export const x5Models = tokenModels.filter(m => m.model === 'X5');
export const x6Models = tokenModels.filter(m => m.model === 'X6');

// NIOS TE-series servers
export const niosServerGuardrails = [
  { model: 'TE-926', appSize: 926, tokens: 880, maxDbObj: 110000, maxQPS: 33750, maxLPS: 225, maxGridMembers: 5, maxRPZRecords: 1500000, physicalOrVirtual: 'Both', key: 'TE-926' },
  { model: 'TE-1516', appSize: 1516, tokens: 2270, maxDbObj: 440000, maxQPS: 67500, maxLPS: 400, maxGridMembers: 40, maxRPZRecords: 3000000, physicalOrVirtual: 'Both', key: 'TE-1516' },
  { model: 'TE-1526', appSize: 1526, tokens: 2995, maxDbObj: 880000, maxQPS: 112500, maxLPS: 675, maxGridMembers: 100, maxRPZRecords: 3000000, physicalOrVirtual: 'Both', key: 'TE-1526' },
  { model: 'TE-2326', appSize: 2326, tokens: 6755, maxDbObj: 4500000, maxQPS: 250000, maxLPS: 1200, maxGridMembers: 100, maxRPZRecords: 4000000, physicalOrVirtual: 'Both', key: 'TE-2326' },
  { model: 'TE-4126', appSize: 4126, tokens: 17010, maxDbObj: 24000000, maxQPS: 450000, maxLPS: 1500, maxGridMembers: 500, maxRPZRecords: 4000000, physicalOrVirtual: 'Both', key: 'TE-4126' },
];

// NIOS-X Virtual Servers
export const niosxServerGuardrails = [
  { model: 'NXVS-XXS', size: 'XXS', sizeCode: 210, maxQPS: 5000, maxLPS: 75, maxAssets: 550, serverTokenCost: 130, key: 'NXVS-XXS' },
  { model: 'NXVS-XS', size: 'XS', sizeCode: 220, maxQPS: 10000, maxLPS: 150, maxAssets: 1300, serverTokenCost: 250, key: 'NXVS-XS' },
  { model: 'NXVS-S', size: 'S', sizeCode: 230, maxQPS: 20000, maxLPS: 200, maxAssets: 5000, serverTokenCost: 470, key: 'NXVS-S' },
  { model: 'NXVS-M', size: 'M', sizeCode: 240, maxQPS: 40000, maxLPS: 300, maxAssets: 19000, serverTokenCost: 880, key: 'NXVS-M' },
];

// NIOS Feature Performance Impact
export const niosFeatureImpacts = [
  { product: 'NIOS', role: 'DHCP', featureCode: 'DDNS', featureName: 'Dynamic DNS', impactPercent: 20, defaultEnabled: true },
  { product: 'NIOS', role: 'DHCP', featureCode: 'DHCP-FO', featureName: 'DHCP Failover', impactPercent: 50, defaultEnabled: true },
  { product: 'NIOS', role: 'DHCP', featureCode: 'OS-FP', featureName: 'Fingerprinting', impactPercent: 10, defaultEnabled: true },
  { product: 'NIOS', role: 'DHCP', featureCode: 'DHCP-DC', featureName: 'DHCP Reporting', impactPercent: 15, defaultEnabled: true },
  { product: 'NIOS', role: 'DNS', featureCode: 'ADP', featureName: 'Advanced DNS Protection', impactPercent: 20, defaultEnabled: false },
  { product: 'NIOS', role: 'DNS', featureCode: 'DTC', featureName: 'DNS Traffic Control', impactPercent: 25, defaultEnabled: true },
  { product: 'NIOS', role: 'DNS', featureCode: 'QR', featureName: 'Query Or Response Capture', impactPercent: 40, defaultEnabled: true },
  { product: 'NIOS', role: 'DNS', featureCode: 'QR2', featureName: 'Query And Response Capture', impactPercent: 10, defaultEnabled: true },
  { product: 'NIOS', role: 'DNS', featureCode: 'SYS', featureName: 'Forward to Syslog', impactPercent: 50, defaultEnabled: false },
  { product: 'NIOS', role: 'DNS', featureCode: 'DNS-DC', featureName: 'DNS Reporting', impactPercent: 15, defaultEnabled: true },
  { product: 'NIOS', role: 'DNS', featureCode: 'RPZ', featureName: 'DNS Firewall', impactPercent: 15, defaultEnabled: false },
  { product: 'NIOS', role: 'DNS', featureCode: 'NSIP', featureName: 'RPZ NSDNAME/NSIP', impactPercent: 30, defaultEnabled: false },
  { product: 'NIOS', role: 'DNS', featureCode: 'TI', featureName: 'RPZ Threat Insight', impactPercent: 30, defaultEnabled: false },
];

export function calculateNetPerformance(ratedValue, enabledFeatureCodes, role) {
  const features = niosFeatureImpacts.filter(f => f.role === role && enabledFeatureCodes.includes(f.featureCode));
  let netImpact = 1.0;
  for (const feature of features) {
    netImpact *= (1 - feature.impactPercent / 100);
  }
  return Math.ceil(ratedValue * netImpact);
}

export function getDefaultEnabledFeatures(role) {
  return niosFeatureImpacts
    .filter(f => f.role === role && f.defaultEnabled)
    .map(f => f.featureCode);
}

// NIOS Grid Sizing Constants
export const niosGridConstants = {
  maxDbUtilizationPercent: 60,
  bufferPercent: 10,
  dhcpLeaseObjectsPerClient: 2,
  dnsRecordsPerDhcpClient: 3,
  dnsRecordsPerStaticClient: 2,
  discoveryAssetPercent: 5,
  leaseTimeframeMinutes: 15,
  peakQpsDivisor: 3,
  lpsAggregateSeconds: 900,
  multiRolePenaltyPercent: 50,
  multiRoleCapacityMultiplier: 1.3,
};

// Map NIOS servers to legacy X6 format
export const x6ServerGuardrails = niosServerGuardrails.map(s => ({
  model: s.model,
  appSize: s.appSize,
  tokens: s.tokens,
  qps: s.maxQPS,
  lps: s.maxLPS,
  objects: s.maxDbObj,
  discAssets: 0,
  physicalOrVirtual: s.physicalOrVirtual,
  key: s.key,
}));

// Asset tiers
export const assetTiers = [
  { minWorkers: 0, maxWorkers: 1249, assetsPerWorker: 4.0, verifiedPerWorker: 0.860434208149139, unverifiedPerWorker: 3.139565791850861 },
  { minWorkers: 1250, maxWorkers: 2499, assetsPerWorker: 4.0, verifiedPerWorker: 0.860434208149139, unverifiedPerWorker: 3.139565791850861 },
  { minWorkers: 2500, maxWorkers: 4999, assetsPerWorker: 2.0, verifiedPerWorker: 0.222293797783083, unverifiedPerWorker: 1.777706202216917 },
  { minWorkers: 5000, maxWorkers: 9999, assetsPerWorker: 2.5, verifiedPerWorker: 0.956051177376914, unverifiedPerWorker: 1.543948822623086 },
  { minWorkers: 10000, maxWorkers: 10000, assetsPerWorker: 1.5, verifiedPerWorker: 0.278275475382063, unverifiedPerWorker: 1.221724524617937 },
  { minWorkers: 10001, maxWorkers: Infinity, assetsPerWorker: 1.0, verifiedPerWorker: 0.175607989024156, unverifiedPerWorker: 0.824392010975844 },
];

export function getAssetTier(knowledgeWorkers) {
  const tier = assetTiers.find(t => knowledgeWorkers >= t.minWorkers && knowledgeWorkers <= t.maxWorkers);
  return tier || assetTiers[assetTiers.length - 1];
}

export function getAssetsPerWorker(knowledgeWorkers) {
  return getAssetTier(knowledgeWorkers).assetsPerWorker;
}

// UDDI Token Calculator Data
export const uddiManagementTokenRates = [
  { objectType: 'DDI Objects', native: 25, nios: 50 },
  { objectType: 'Active IPs', native: 13, nios: 25 },
  { objectType: 'Discovered Assets', native: 3, nios: 13 },
];

export const uddiServerTokens = [
  { serverType: 'NXVS', serverSize: '3XS', qps: 1000, lps: 15, objects: 1000, discAssets: 550, connections: 0, tokens: 60, key: 'NXVS-3XS', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: '2XS', qps: 5000, lps: 75, objects: 3000, discAssets: 550, connections: 0, tokens: 130, key: 'NXVS-2XS', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: 'XS', qps: 10000, lps: 150, objects: 7500, discAssets: 1300, connections: 0, tokens: 250, key: 'NXVS-XS', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: 'S', qps: 20000, lps: 200, objects: 29000, discAssets: 5000, connections: 0, tokens: 470, key: 'NXVS-S', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: 'M', qps: 40000, lps: 300, objects: 110000, discAssets: 19000, connections: 0, tokens: 880, key: 'NXVS-M', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: 'L', qps: 70000, lps: 400, objects: 440000, discAssets: 75000, connections: 0, tokens: 1900, key: 'NXVS-L', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXVS', serverSize: 'XL', qps: 115000, lps: 675, objects: 880000, discAssets: 145000, connections: 0, tokens: 2700, key: 'NXVS-XL', serverTypeName: 'NIOS-X Virtual Server' },
  { serverType: 'NXaaS', serverSize: 'S', qps: 20000, lps: 200, objects: 29000, discAssets: 5000, connections: 10, tokens: 2400, key: 'NXaaS-S', serverTypeName: 'NIOS-X as a Service' },
  { serverType: 'NXaaS', serverSize: 'M', qps: 40000, lps: 300, objects: 110000, discAssets: 19000, connections: 20, tokens: 4100, key: 'NXaaS-M', serverTypeName: 'NIOS-X as a Service' },
  { serverType: 'NXaaS', serverSize: 'L', qps: 70000, lps: 400, objects: 440000, discAssets: 75000, connections: 35, tokens: 6100, key: 'NXaaS-L', serverTypeName: 'NIOS-X as a Service' },
  { serverType: 'NXaaS', serverSize: 'XL', qps: 115000, lps: 675, objects: 880000, discAssets: 145000, connections: 85, tokens: 8500, key: 'NXaaS-XL', serverTypeName: 'NIOS-X as a Service' },
];

export const nxvsServers = uddiServerTokens.filter(s => s.serverType === 'NXVS');
export const nxaasServers = uddiServerTokens.filter(s => s.serverType === 'NXaaS');

export const uddiEstimatorDefaults = {
  devicesPerUser: 2.5,
  qpdPerActiveIP: 3500,
  dnsRecsPerIP: 2.0,
  dnsRecsPerLease: 3.0,
  bufferOverhead: 0.15,
  dhcpHaFoMultiplier: 2.0,
  defaultLeaseTimeHr: 1.0,
  dhcpPercent: 80,
  staticPercent: 20,
  daysPerMonth: 31,
  workdaysPerMonth: 22,
  secondsPerWorkdayHrs: 9,
};
