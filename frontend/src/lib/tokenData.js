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
  maxDbUtilizationPercent: 60,        // Target no more than 60% capacity at rollout
  bufferPercent: 10,                  // 10% buffer for grid objects (110%)
  dhcpLeaseObjectsPerClient: 2,       // DHCP lease objects = clients × 2
  dnsRecordsPerDhcpClient: 3,         // DNS records per DHCP client (dynamic)
  dnsRecordsPerStaticClient: 2,       // DNS records per static client
  discoveryAssetPercent: 5,           // Discovery assets as % of active IPs
  leaseTimeframeMinutes: 15,          // Lease timeframe for LPS calculation
  peakQpsDivisor: 3,                  // Peak QPS = active IPs / 3
  lpsAggregateSeconds: 900,           // 15 minutes in seconds
  multiRolePenaltyPercent: 50,        // NIOS: 50% penalty for DNS+DHCP on same server
  multiRoleCapacityMultiplier: 1.3,   // NIOS/UDDI: Need 130% capacity for multi-role
  uddiMultiRoleMultiplier: 1.3,       // UDDI: net_qps/lps must be > requirement × 130%
  dhcpFailoverPenaltyPercent: 50,     // DHCP Failover decreases performance by 50%
  dhcpFingerprintPenaltyPercent: 10,  // DHCP Fingerprinting: 10% reduction
  hubSpokeHubPenalty: 0,              // Hub takes aggregate LPS from spokes (no penalty, just summed)
  hubSpokeSpokePenalty: 50,           // Spoke DHCP forwarding: 50% performance reduction (2x sizing)
};

// UDDI/NIOS-X Feature Performance Impacts (from Best Practices)
export const uddiFeatureImpacts = [
  { product: 'UDDI', role: 'DNS', featureCode: 'DFP', featureName: 'DNS Forwarding Proxy', impactPercent: 0, defaultEnabled: true },
  { product: 'UDDI', role: 'DHCP', featureCode: 'DHCP-HA', featureName: 'DHCP High Availability', impactPercent: 50, defaultEnabled: false },
  { product: 'UDDI', role: 'DHCP', featureCode: 'DHCP-FP', featureName: 'DHCP Fingerprinting', impactPercent: 10, defaultEnabled: false },
  { product: 'UDDI', role: 'ALL', featureCode: 'MULTI-ROLE', featureName: 'Multi-Protocol (DNS+DHCP)', impactPercent: 30, defaultEnabled: false },
];

// GM Service Restrictions - Models where running DNS/DHCP is NOT recommended
export const gmServiceRestrictions = {
  'TE-926': { canRunServices: true, maxMembers: 5, note: 'OK if no Reporting Server' },
  'TE-1516': { canRunServices: true, maxMembers: 8, note: 'Not recommended if >8 members' },
  'TE-1526': { canRunServices: false, maxMembers: 100, note: 'NOT RECOMMENDED - Designs requiring 1526+ GM should not run services on GM' },
  'TE-2326': { canRunServices: false, maxMembers: 100, note: 'NOT RECOMMENDED' },
  'TE-4126': { canRunServices: false, maxMembers: 500, note: 'NOT RECOMMENDED' },
};

// Check if GM can run DNS/DHCP services
export function canGMRunServices(model, memberCount = 0) {
  const restriction = gmServiceRestrictions[model];
  if (!restriction) return { allowed: true, warning: null };
  
  if (!restriction.canRunServices) {
    return { 
      allowed: false, 
      warning: `${model}: ${restriction.note}. GM should be dedicated to grid management only.`
    };
  }
  
  if (memberCount > restriction.maxMembers) {
    return {
      allowed: false,
      warning: `${model}: ${restriction.note}. Current member count (${memberCount}) exceeds limit (${restriction.maxMembers}).`
    };
  }
  
  return { allowed: true, warning: null };
}

// Calculate Grid Master object requirements
export function calculateGMObjects(sites, dhcpPercent = 80, discoveryEnabled = false) {
  let totalDhcpClients = 0;
  let totalStaticClients = 0;
  let totalActiveIPs = 0;
  
  sites.forEach(site => {
    const dhcpClients = Math.ceil(site.numIPs * (dhcpPercent / 100));
    const staticClients = site.numIPs - dhcpClients;
    totalDhcpClients += dhcpClients;
    totalStaticClients += staticClients;
    totalActiveIPs += site.numIPs;
  });
  
  // DHCP Lease Objects = clients × 2
  const dhcpLeaseObjects = totalDhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // DNS Objects = DHCP clients × 3 (dynamic) + static × 2
  const dnsObjects = (totalDhcpClients * niosGridConstants.dnsRecordsPerDhcpClient) + 
                     (totalStaticClients * niosGridConstants.dnsRecordsPerStaticClient);
  
  // Discovery Objects = 1 per active IP (if enabled)
  const discoveryObjects = discoveryEnabled ? totalActiveIPs : 0;
  
  // Total Grid Objects with 10% buffer
  const totalObjects = Math.ceil((dhcpLeaseObjects + dnsObjects + discoveryObjects) * (1 + niosGridConstants.bufferPercent / 100));
  
  return {
    dhcpLeaseObjects,
    dnsObjects,
    discoveryObjects,
    totalObjects,
    totalActiveIPs,
    totalDhcpClients,
    totalStaticClients,
  };
}

// Find minimum GM model for object count
export function findMinimumGMModel(totalObjects) {
  const targetCapacity = niosGridConstants.maxDbUtilizationPercent / 100;
  
  for (const server of niosServerGuardrails) {
    const effectiveCapacity = server.maxDbObj * targetCapacity;
    if (effectiveCapacity >= totalObjects) {
      const utilization = Math.round((totalObjects / server.maxDbObj) * 100);
      return {
        model: server.model,
        maxDbObj: server.maxDbObj,
        effectiveCapacity: Math.round(effectiveCapacity),
        utilization,
        isOverCapacity: utilization > 60,
      };
    }
  }
  
  // If no model fits, return the largest with warning
  const largest = niosServerGuardrails[niosServerGuardrails.length - 1];
  return {
    model: largest.model,
    maxDbObj: largest.maxDbObj,
    effectiveCapacity: Math.round(largest.maxDbObj * targetCapacity),
    utilization: Math.round((totalObjects / largest.maxDbObj) * 100),
    isOverCapacity: true,
    warning: 'Grid object count exceeds maximum capacity. Consider splitting the grid.',
  };
}

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

// ========== Software SKU Mapping for Drawing Export ==========

// SW Base SKU by model (subscription)
export const swBaseSkuMap = {
  // NIOS TE-series
  'TE-926': 'TE-926-SWSUB',
  'TE-1516': 'TE-1516-SWSUB',
  'TE-1526': 'TE-1526-SWSUB',
  'TE-2326': 'TE-2326-SWSUB',
  'TE-4126': 'TE-4126-SWSUB',
  // NIOS-X Virtual Servers
  'NXVS-3XS': 'NXVS-3XS-SWSUB',
  'NXVS-2XS': 'NXVS-2XS-SWSUB',
  'NXVS-XS': 'NXVS-XS-SWSUB',
  'NXVS-S': 'NXVS-S-SWSUB',
  'NXVS-M': 'NXVS-M-SWSUB',
  'NXVS-L': 'NXVS-L-SWSUB',
  'NXVS-XL': 'NXVS-XL-SWSUB',
  // NIOS-X CDC
  'NXVS-CDC': 'NXVS-CDC-SWSUB',
  // NXaaS
  'NXaaS-S': 'NXaaS-S-SWSUB',
  'NXaaS-M': 'NXaaS-M-SWSUB',
  'NXaaS-L': 'NXaaS-L-SWSUB',
  'NXaaS-XL': 'NXaaS-XL-SWSUB',
};

// SW Package codes by role combination
export const swPackageMap = {
  'DNS': 'DD',           // DNS only
  'DHCP': 'DH',          // DHCP only
  'DNS/DHCP': 'DDIDH',   // DNS + DHCP
  'GM': 'DDI',           // Grid Master (full DDI)
  'GMC': 'DDI',          // Grid Master Candidate
  'DNS/DHCP/Discovery': 'DDIGD',  // DNS + DHCP + Discovery
  'Discovery': 'GD',     // Discovery only
};

// Hardware SKU mapping
export const hwSkuMap = {
  // NIOS TE-series Physical
  'TE-926': { hwSku: 'TE-926-HW-AC', description: 'NIOS TE-926 Appliance' },
  'TE-1516': { hwSku: 'TE-1516-HW-AC', description: 'NIOS TE-1516 Appliance' },
  'TE-1526': { hwSku: 'TE-1526-HW-AC', description: 'NIOS TE-1526 Appliance' },
  'TE-2326': { hwSku: 'TE-2326-HW-AC', description: 'NIOS TE-2326 Appliance' },
  'TE-4126': { hwSku: 'TE-4126-HW-AC', description: 'NIOS TE-4126 Appliance' },
  // Virtual - no HW SKU
  'NXVS-3XS': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-2XS': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-XS': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-S': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-M': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-L': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-XL': { hwSku: 'VM', description: 'Virtual Machine' },
  'NXVS-CDC': { hwSku: 'VM', description: 'Virtual Machine (CDC)' },
  // NXaaS - Cloud
  'NXaaS-S': { hwSku: 'Cloud', description: 'Cloud Service' },
  'NXaaS-M': { hwSku: 'Cloud', description: 'Cloud Service' },
  'NXaaS-L': { hwSku: 'Cloud', description: 'Cloud Service' },
  'NXaaS-XL': { hwSku: 'Cloud', description: 'Cloud Service' },
};

// Unit Group codes based on role
export const unitGroupMap = {
  'GM': 'A',
  'GMC': 'B', 
  'DNS/DHCP': 'C',
  'DNS': 'D',
  'DHCP': 'E',
  'dataCenter': 'F',
  'site': 'G',
};

// Helper to get SW Base SKU
export function getSwBaseSku(model) {
  return swBaseSkuMap[model] || `${model}-SWSUB`;
}

// Helper to get SW Package
export function getSwPackage(role, hasDiscovery = false) {
  if (hasDiscovery && (role === 'DNS/DHCP' || role === 'DNS')) {
    return swPackageMap['DNS/DHCP/Discovery'] || 'DDIGD';
  }
  return swPackageMap[role] || 'DDI';
}

// Helper to get HW SKU info
export function getHwSkuInfo(model) {
  return hwSkuMap[model] || { hwSku: 'VM', description: 'Virtual Machine' };
}

// Unit Group mapping based on Lucidchart alphabet chart
// A = GM/GMC, B = Internal DNS, C = DHCP, D = Edge/Remote, E = External DNS
// F = Cache/DMZ, G = Guest, M = MSFT Sync, N = Network Insight, RPT = Reporting
export function getUnitGroup(role, sourceType, services = []) {
  // GM and GMC are always A
  if (role === 'GM') return 'A';
  if (role === 'GMC') return 'A';
  
  // Check for special services
  if (services?.includes('NI') || services?.includes('Network Insight')) return 'N';
  if (services?.includes('Reporting')) return 'RPT';
  if (services?.includes('MSFT') || services?.includes('Microsoft')) return 'M';
  
  // Role-based mapping
  if (role === 'DNS' || role === 'DNS/DHCP' || role?.includes('Internal DNS')) return 'B';
  if (role === 'DHCP') return 'C';
  if (role?.toLowerCase()?.includes('edge') || role?.toLowerCase()?.includes('remote')) return 'D';
  if (role?.toLowerCase()?.includes('external') || role?.toLowerCase()?.includes('authoritative')) return 'E';
  if (role?.toLowerCase()?.includes('cache') || role?.toLowerCase()?.includes('forward') || role?.toLowerCase()?.includes('dmz')) return 'F';
  if (role?.toLowerCase()?.includes('guest')) return 'G';
  
  // Default based on source type
  if (sourceType === 'dataCenter') return 'B'; // DCs are typically internal DNS
  return 'B'; // Default to internal DNS
}
