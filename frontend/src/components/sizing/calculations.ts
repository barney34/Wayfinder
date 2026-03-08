import { hardwareSkuMapping, HardwareSkuMappings } from './constants';
import {
  getAssetsPerWorker,
  nxvsServers, nxaasServers,
  x6ServerGuardrails,
  niosServerGuardrails, niosGridConstants,
  canGMRunServices,
  dhcpFoAssociationLimits,
} from '@/lib/tokenData';
import { calculatePerfImpact } from './calculators/platformConfig';

export interface WorkloadRequirements {
  qps: number;
  lps: number;
  objects: number;
  discAssets: number;
  knowledgeWorkers: number;
  activeIPs: number;
}

export interface SiteWorkloadDetails {
  qps: number;
  lps: number;
  adjustedQPS: number;
  adjustedLPS: number;
  objects: number;
  dnsObjects: number;
  dhcpObjects: number;
  foObjects: number;
  dhcpClients: number;
  staticClients: number;
  penalties: string[];
  driver: string;
  isUDDI: boolean;
  qpsMultiplier: number;
  lpsMultiplier: number;
}

export interface SiteModelOptions {
  isSpoke?: boolean;
  hubLPS?: number;
  foObjects?: number;
  perfFeatures?: string[];
}

export interface ValidationResult {
  valid: boolean;
  warning: string | null;
}

export function getPartnerSku(packCount: number): string {
  if (packCount <= 5) return 'IB-TOKENS-SECURITY-1000-5000';
  if (packCount <= 17) return 'IB-TOKENS-SECURITY-6000-17000';
  return 'IB-TOKENS-SECURITY-18000+';
}

// Calculate LPS for a site (used for Hub sizing)
// Formula: dhcp_clients / 15 minutes (900 seconds)
export function calculateSiteLPS(numIPs: number, dhcpPercent: number, role: string): number {
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  
  // Multi-protocol penalty: 130% capacity needed for DNS+DHCP
  if (role === 'DNS/DHCP') {
    lps = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
  }
  
  return lps;
}

// Calculate DHCP objects for a site (used for FO object replication)
export function calculateSiteDhcpObjects(numIPs: number, dhcpPercent: number): number {
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  return dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
}

// Calculate QPS for a site
// Formula: active_IPs / 3 (peak QPS divisor)
export function calculateSiteQPS(numIPs: number, isUDDI = false): number {
  // UDDI uses different divisor
  const divisor = isUDDI ? 50 : niosGridConstants.peakQpsDivisor;
  return Math.ceil(numIPs / divisor);
}

// Calculate object count for a site
export function calculateSiteObjects(numIPs: number, dhcpPercent: number, role: string, isUDDI = false): { total: number; dns: number; dhcp: number } {
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // DHCP Lease Objects = clients × 2
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // DNS Objects: UDDI uses ×4 for DHCP (Kea DHCID in reverse zone), NIOS uses ×3
  const dhcpDnsMultiplier = isUDDI ? niosGridConstants.dnsRecordsPerDhcpClientUDDI : niosGridConstants.dnsRecordsPerDhcpClient;
  const dnsObjects = (dhcpClients * dhcpDnsMultiplier) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  
  // Return based on role
  if (role === 'DNS') return { total: dnsObjects, dns: dnsObjects, dhcp: 0 };
  if (role === 'DHCP') return { total: dhcpObjects, dns: 0, dhcp: dhcpObjects };
  // DNS/DHCP combined
  return { total: dnsObjects + dhcpObjects, dns: dnsObjects, dhcp: dhcpObjects };
}

// Validate DHCP FO association limits
export function validateDhcpFoLimits(model: string, totalFoIPs: number): ValidationResult {
  const limit = dhcpFoAssociationLimits[model];
  if (!limit) return { valid: true, warning: null };
  if (totalFoIPs > limit) {
    return {
      valid: false,
      warning: `${model}: DHCP FO association exceeds limit (${totalFoIPs.toLocaleString()} IPs > ${limit.toLocaleString()} max)`,
    };
  }
  return { valid: true, warning: null };
}

// Check if a GM model can run DNS/DHCP services
export function checkGMServiceWarning(model: string, role: string, memberCount = 0): string | null {
  // Only check for GM/GMC roles
  if (role !== 'GM' && role !== 'GMC') return null;
  
  const restriction = canGMRunServices(model, memberCount);
  
  if (!restriction.allowed) {
    return restriction.warning;
  }
  
  return null;
}

export function calculateWorkloadRequirements(answers: Record<string, string>): WorkloadRequirements {
  const knowledgeWorkers = parseInt(answers['ud-1']) || 0;
  const hasBYOD = answers['ud-2'] === 'Yes';
  const devicesPerUser = hasBYOD ? (parseInt(answers['ud-2a']) || 2) : 1;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;

  const isOverride = answers['ipam-1-override'] === 'true';
  const overrideValue = parseInt(answers['ipam-1']) || 0;
  const activeIPs = isOverride && overrideValue > 0
    ? overrideValue
    : Math.round(knowledgeWorkers * devicesPerUser * ipMultiplier);

  const dnsQPD = 3500;
  const qps = Math.round((activeIPs * dnsQPD) / (9 * 3600));

  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const dhcpIPs = Math.round(activeIPs * (dhcpPercent / 100));
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const lps = Math.round(dhcpIPs / (leaseTimeSeconds / 3600) / 9);

  const dnsRecsPerIP = 2.0;
  const objects = Math.round(activeIPs * dnsRecsPerIP);

  const assetRatio = getAssetsPerWorker(knowledgeWorkers);
  const discAssets = Math.round(knowledgeWorkers * assetRatio);

  return { qps, lps, objects, discAssets, knowledgeWorkers, activeIPs };
}

export function findRecommendedX6(workload: WorkloadRequirements) {
  for (const server of x6ServerGuardrails) {
    if (server.qps >= workload.qps && server.lps >= workload.lps &&
        server.objects >= workload.objects && server.discAssets >= workload.discAssets) {
      return server;
    }
  }
  return x6ServerGuardrails[x6ServerGuardrails.length - 1];
}

export function findRecommendedUDDI(workload: WorkloadRequirements, serverType: string) {
  const servers = serverType === 'NXVS' ? nxvsServers : nxaasServers;
  for (const server of servers) {
    if (server.qps * 0.6 >= workload.qps && server.lps * 0.6 >= workload.lps &&
        server.objects * 0.6 >= workload.objects && server.discAssets * 0.6 >= workload.discAssets) {
      return server;
    }
  }
  return servers[servers.length - 1];
}

export function findNIOSServerByObjects(objects: number): string {
  for (const server of niosServerGuardrails) {
    if (server.maxDbObj * 0.6 >= objects) return server.model;
  }
  return 'TE-4126';
}

export function findNIOSServerByPerformance(qps: number, lps: number, objects: number): string {
  for (const server of niosServerGuardrails) {
    if (server.maxQPS * 0.6 >= qps && server.maxLPS * 0.6 >= lps && server.maxDbObj * 0.6 >= objects) {
      return server.model;
    }
  }
  return 'TE-4126';
}

/**
 * getSiteRecommendedModel — enhanced with performance features and FO object replication
 *
 * @param numIPs             Active IPs for this site
 * @param role               Site role (DNS, DHCP, DNS/DHCP, GM, etc.)
 * @param platform           Global platform mode
 * @param dhcpPercent        DHCP percentage
 * @param leaseTimeSeconds   Lease time
 * @param sitePlatform       Per-site platform override
 * @param options
 *   isSpoke       Is this a spoke in FO
 *   hubLPS        Aggregate LPS from spokes (for hubs)
 *   foObjects     DHCP objects replicated from FO partner(s)
 *   perfFeatures Enabled performance features (DTC, SYSLOG, etc.)
 */
export function getSiteRecommendedModel(
  numIPs: number, 
  role: string, 
  platform: string, 
  dhcpPercent: number, 
  leaseTimeSeconds: number, 
  sitePlatform: string, 
  options: SiteModelOptions = {}
): string {
  const { isSpoke = false, hubLPS = 0, foObjects = 0, perfFeatures = [] } = options;

  // Reporting role → always TR-5005 (virtual)
  if (role === 'Reporting') return 'TR-5005';

  // Network Discovery role → size by IP count using ND appliances
  if (role === 'ND') {
    if (numIPs <= 5000)  return 'ND-906';
    if (numIPs <= 15000) return 'ND-1606';
    if (numIPs <= 40000) return 'ND-2306';
    return 'ND-4106';
  }
  
  const isUDDI = sitePlatform
    ? (sitePlatform === 'NXVS' || sitePlatform === 'NXaaS' || sitePlatform === 'NX-P')
    : (platform.includes('UDDI') || platform.includes('Hybrid'));
  
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // Calculate base workload metrics
  let qps = Math.ceil(numIPs / (isUDDI ? 50 : niosGridConstants.peakQpsDivisor));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  // DNS Objects: UDDI uses ×4 for DHCP (Kea DHCID in reverse zone), NIOS uses ×3
  const dhcpDnsMultiplier = isUDDI ? niosGridConstants.dnsRecordsPerDhcpClientUDDI : niosGridConstants.dnsRecordsPerDhcpClient;
  const dnsObjects = (dhcpClients * dhcpDnsMultiplier) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // If this is a Hub, add LPS from all spokes
  if (hubLPS > 0) {
    lps += hubLPS;
  }
  
  // NOTE: DHCP-FO 50% LPS penalty is applied via perfFeatures (auto-injected
  // by TokenCalculatorSummary when site has a DHCP partner). This applies
  // equally to both hub and spoke through the calculatePerfImpact system,
  // reducing the server's effective LPS capacity by 50%.

  // Calculate performance feature impact on effective capacity
  const { qpsMultiplier, lpsMultiplier } = calculatePerfImpact(perfFeatures, role);
  
  // The utilization threshold (60% target)
  const util = niosGridConstants.maxDbUtilizationPercent / 100;
  
  // Handle Grid Master and Grid Master Candidate roles
  if (role === 'GM' || role === 'GMC') {
    // GM/GMC: grid objects = all managed objects + FO replicated objects
    const gridObjects = dnsObjects + dhcpObjects + foObjects;
    
    if (isUDDI) return 'S';
    
    for (const server of niosServerGuardrails) {
      if (server.maxDbObj * util > gridObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
  
  // Handle GM/GMC with DNS/DHCP services
  if (role.startsWith('GM+') || role.startsWith('GMC+')) {
    const gridObjects = dnsObjects + dhcpObjects;
    const hasDNS = role.includes('DNS');
    const hasDHCP = role.includes('DHCP') && !role.includes('DNS/DHCP') || role.includes('DNS/DHCP');
    const hasBoth = role.includes('DNS/DHCP');
    
    let requiredQPS = 0;
    let requiredLPS = 0;
    let requiredObjects = gridObjects + foObjects;
    
    if (hasDNS || hasBoth) {
      requiredQPS = qps;
      requiredObjects += dnsObjects;
    }
    if (hasDHCP || hasBoth) {
      requiredLPS = lps;
      requiredObjects += dhcpObjects;
    }
    
    if (hasBoth) {
      requiredQPS = Math.ceil(requiredQPS * niosGridConstants.multiRoleCapacityMultiplier);
      requiredLPS = Math.ceil(requiredLPS * niosGridConstants.multiRoleCapacityMultiplier);
    }
    
    for (const server of niosServerGuardrails) {
      const effectiveQPS = server.maxQPS * util * qpsMultiplier;
      const effectiveLPS = server.maxLPS * util * lpsMultiplier;
      const effectiveObjects = server.maxDbObj * util;
      
      const meetsQPS = !hasDNS && !hasBoth || effectiveQPS > requiredQPS;
      const meetsLPS = !hasDHCP && !hasBoth || effectiveLPS > requiredLPS;
      const meetsObjects = effectiveObjects > requiredObjects;
      
      if (meetsQPS && meetsLPS && meetsObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
  
  // Handle combined DNS/DHCP role with multi-role penalty
  if (role === 'DNS/DHCP') {
    // FO: objects include replicated DHCP objects from partner(s)
    const combinedObjects = dnsObjects + dhcpObjects + foObjects;
    
    const adjustedQPS = Math.ceil(qps * niosGridConstants.multiRoleCapacityMultiplier);
    const adjustedLPS = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
    
    if (isUDDI) {
      for (const server of nxvsServers) {
        const effectiveQPS = server.qps * util * qpsMultiplier;
        const effectiveLPS = server.lps * util * lpsMultiplier;
        const effectiveObjects = server.objects * util;
        
        if (effectiveQPS > adjustedQPS && effectiveLPS > adjustedLPS && effectiveObjects > combinedObjects) {
          return server.serverSize;
        }
      }
      return 'XL';
    } else {
      for (const server of niosServerGuardrails) {
        const effectiveQPS = server.maxQPS * util * qpsMultiplier;
        const effectiveLPS = server.maxLPS * util * lpsMultiplier;
        const effectiveObjects = server.maxDbObj * util;
        
        if (effectiveQPS > adjustedQPS && effectiveLPS > adjustedLPS && effectiveObjects > combinedObjects) {
          return server.model;
        }
      }
      return 'TE-4126';
    }
  }
  
  // Handle DNS-only role
  if (role === 'DNS') {
    if (isUDDI) {
      for (const server of nxvsServers) {
        if (server.qps * util * qpsMultiplier > qps && server.objects * util > dnsObjects) {
          return server.serverSize;
        }
      }
      return 'XL';
    } else {
      for (const server of niosServerGuardrails) {
        if (server.maxQPS * util * qpsMultiplier > qps && server.maxDbObj * util > dnsObjects) {
          return server.model;
        }
      }
      return 'TE-4126';
    }
  }
  
  // Handle DHCP-only role (default case)
  // FO: objects include replicated DHCP objects from partner(s)
  const totalDhcpObjects = dhcpObjects + foObjects;
  
  if (isUDDI) {
    for (const server of nxvsServers) {
      if (server.lps * util * lpsMultiplier > lps && server.objects * util > totalDhcpObjects) {
        return server.serverSize;
      }
    }
    return 'XL';
  } else {
    for (const server of niosServerGuardrails) {
      if (server.maxLPS * util * lpsMultiplier > lps && server.maxDbObj * util > totalDhcpObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
}

export function getHardwareSkuOptions(softwareModel: string): string[] {
  const mapping = hardwareSkuMapping[softwareModel];
  if (!mapping) return ['N/A'];
  return [mapping.default, ...mapping.alternatives];
}

export function getDefaultHardwareSku(softwareModel: string): string {
  return hardwareSkuMapping[softwareModel]?.default || 'N/A';
}

export function isHardwareSkuLocked(softwareModel: string): boolean {
  return hardwareSkuMapping[softwareModel]?.locked || false;
}

export function getDefaultHwAddons(hardwareSku: string): string[] {
  if (hardwareSku === 'TE-1506-HW-AC' || hardwareSku === 'TE-1506-HW-DC') return ['PSU'];
  return [];
}

// Get detailed workload breakdown with the driver metric
// Enhanced: accepts perfFeatures and foObjects for accurate sizing details
export function getSiteWorkloadDetails(
  numIPs: number, 
  role: string, 
  platform: string, 
  dhcpPercent: number, 
  sitePlatform: string, 
  options: SiteModelOptions = {}
): SiteWorkloadDetails {
  const { isSpoke = false, hubLPS = 0, foObjects = 0, perfFeatures = [] } = options;
  
  const isUDDI = sitePlatform
    ? (sitePlatform === 'NXVS' || sitePlatform === 'NXaaS' || sitePlatform === 'NX-P')
    : (platform?.includes('UDDI') || platform?.includes('Hybrid'));
  
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // Base calculations
  let qps = Math.ceil(numIPs / (isUDDI ? 50 : niosGridConstants.peakQpsDivisor));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  
  // DNS Objects: UDDI uses ×4 for DHCP (Kea DHCID in reverse zone), NIOS uses ×3
  const dhcpDnsMultiplier = isUDDI ? niosGridConstants.dnsRecordsPerDhcpClientUDDI : niosGridConstants.dnsRecordsPerDhcpClient;
  const dnsObjects = (dhcpClients * dhcpDnsMultiplier) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // Track penalties
  const penalties: string[] = [];
  
  // Hub LPS addition
  if (hubLPS > 0) {
    penalties.push(`Hub: +${hubLPS} LPS from partner(s)`);
    lps += hubLPS;
  }
  
  // FO Object replication
  if (foObjects > 0) {
    penalties.push(`FO Objects: +${foObjects.toLocaleString()} replicated from partner(s)`);
  }
  
  // Performance feature impacts
  const { qpsMultiplier, lpsMultiplier } = calculatePerfImpact(perfFeatures, role);
  if (qpsMultiplier < 1.0) {
    const pct = Math.round((1 - qpsMultiplier) * 100);
    penalties.push(`Perf Features: −${pct}% effective QPS`);
  }
  if (lpsMultiplier < 1.0) {
    const pct = Math.round((1 - lpsMultiplier) * 100);
    penalties.push(`Perf Features: −${pct}% effective LPS`);
  }
  
  // Multi-role penalty
  let adjustedQPS = qps;
  let adjustedLPS = lps;
  if (role === 'DNS/DHCP') {
    penalties.push('Multi-protocol: 130% capacity');
    adjustedQPS = Math.ceil(qps * niosGridConstants.multiRoleCapacityMultiplier);
    adjustedLPS = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
  }
  
  // Handle GM/GMC with DNS/DHCP (additive load)
  const isGMWithServices = role.startsWith('GM+') || role.startsWith('GMC+');
  if (isGMWithServices) {
    const hasDNS = role.includes('DNS');
    const hasDHCP = role.includes('DHCP') && !role.includes('DNS/DHCP') || role.includes('DNS/DHCP');
    const hasBoth = role.includes('DNS/DHCP');
    
    penalties.push('⚠️ GM/GMC + Services: ADDITIVE sizing');
    
    if (hasBoth) {
      penalties.push('Multi-protocol: 130% capacity');
      adjustedQPS = Math.ceil(qps * niosGridConstants.multiRoleCapacityMultiplier);
      adjustedLPS = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
    } else if (hasDNS) {
      adjustedQPS = qps;
    } else if (hasDHCP) {
      adjustedLPS = lps;
    }
  }
  
  // Calculate objects based on role + FO replicated objects
  let objects = 0;
  if (role === 'GM' || role === 'GMC') {
    objects = dnsObjects + dhcpObjects + foObjects;
  } else if (role.startsWith('GM+') || role.startsWith('GMC+')) {
    objects = dnsObjects + dhcpObjects + foObjects;
    if (role.includes('DNS/DHCP')) {
      objects += dnsObjects + dhcpObjects;
    } else if (role.includes('DNS')) {
      objects += dnsObjects;
    } else if (role.includes('DHCP')) {
      objects += dhcpObjects;
    }
  } else if (role === 'DNS/DHCP') {
    objects = dnsObjects + dhcpObjects + foObjects;
  } else if (role === 'DNS') {
    objects = dnsObjects;
  } else if (role === 'DHCP') {
    objects = dhcpObjects + foObjects;
  }
  
  // Determine which metric drove the model selection
  let driver = 'objects';
  const servers = isUDDI ? nxvsServers : niosServerGuardrails;
  const utilization = niosGridConstants.maxDbUtilizationPercent / 100;
  
  for (const server of servers) {
    const maxQPS = isUDDI ? server.qps : server.maxQPS;
    const maxLPS = isUDDI ? server.lps : server.maxLPS;
    const maxObj = isUDDI ? server.objects : server.maxDbObj;
    
    // Apply perf feature impact to effective capacity
    const effQPS = maxQPS * utilization * qpsMultiplier;
    const effLPS = maxLPS * utilization * lpsMultiplier;
    const effObj = maxObj * utilization;
    
    const qpsUtil = (adjustedQPS / effQPS) * 100;
    const lpsUtil = (adjustedLPS / effLPS) * 100;
    const objUtil = (objects / effObj) * 100;
    
    if (qpsUtil > lpsUtil && qpsUtil > objUtil) {
      driver = 'qps';
    } else if (lpsUtil > qpsUtil && lpsUtil > objUtil) {
      driver = 'lps';
    } else {
      driver = 'objects';
    }
    break;
  }
  
  return {
    qps,
    lps,
    adjustedQPS,
    adjustedLPS,
    objects,
    dnsObjects,
    dhcpObjects,
    foObjects,
    dhcpClients,
    staticClients,
    penalties,
    driver,
    isUDDI,
    qpsMultiplier,
    lpsMultiplier,
  };
}
