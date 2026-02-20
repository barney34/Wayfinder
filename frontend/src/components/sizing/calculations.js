import { hardwareSkuMapping } from './constants';
import {
  getAssetsPerWorker,
  nxvsServers, nxaasServers,
  x6ServerGuardrails,
  niosServerGuardrails, niosGridConstants,
  canGMRunServices,
} from '@/lib/tokenData';

export function getPartnerSku(packCount) {
  if (packCount <= 5) return 'IB-TOKENS-SECURITY-1000-5000';
  if (packCount <= 17) return 'IB-TOKENS-SECURITY-6000-17000';
  return 'IB-TOKENS-SECURITY-18000+';
}

// Calculate LPS for a site (used for Hub sizing)
// Formula: dhcp_clients / 15 minutes (900 seconds)
export function calculateSiteLPS(numIPs, dhcpPercent, role) {
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  
  // Multi-protocol penalty: 130% capacity needed for DNS+DHCP
  if (role === 'DNS/DHCP') {
    lps = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
  }
  
  return lps;
}

// Calculate QPS for a site
// Formula: active_IPs / 3 (peak QPS divisor)
export function calculateSiteQPS(numIPs, isUDDI = false) {
  // UDDI uses different divisor
  const divisor = isUDDI ? 50 : niosGridConstants.peakQpsDivisor;
  return Math.ceil(numIPs / divisor);
}

// Calculate object count for a site
export function calculateSiteObjects(numIPs, dhcpPercent, role) {
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // DHCP Lease Objects = clients × 2
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // DNS Objects = DHCP clients × 3 + static × 2
  const dnsObjects = (dhcpClients * niosGridConstants.dnsRecordsPerDhcpClient) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  
  // Return based on role
  if (role === 'DNS') return { total: dnsObjects, dns: dnsObjects, dhcp: 0 };
  if (role === 'DHCP') return { total: dhcpObjects, dns: 0, dhcp: dhcpObjects };
  // DNS/DHCP combined
  return { total: dnsObjects + dhcpObjects, dns: dnsObjects, dhcp: dhcpObjects };
}

// Check if a GM model can run DNS/DHCP services
export function checkGMServiceWarning(model, role, memberCount = 0) {
  // Only check for GM/GMC roles
  if (role !== 'GM' && role !== 'GMC') return null;
  
  // Only check if trying to run services (not pure GM role)
  // In our UI, GM/GMC don't run DNS/DHCP by default, but we check the model restriction
  const restriction = canGMRunServices(model, memberCount);
  
  if (!restriction.allowed) {
    return restriction.warning;
  }
  
  return null;
}

export function calculateWorkloadRequirements(answers) {
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

export function findRecommendedX6(workload) {
  for (const server of x6ServerGuardrails) {
    if (server.qps >= workload.qps && server.lps >= workload.lps &&
        server.objects >= workload.objects && server.discAssets >= workload.discAssets) {
      return server;
    }
  }
  return x6ServerGuardrails[x6ServerGuardrails.length - 1];
}

export function findRecommendedUDDI(workload, serverType) {
  const servers = serverType === 'NXVS' ? nxvsServers : nxaasServers;
  for (const server of servers) {
    if (server.qps * 0.6 >= workload.qps && server.lps * 0.6 >= workload.lps &&
        server.objects * 0.6 >= workload.objects && server.discAssets * 0.6 >= workload.discAssets) {
      return server;
    }
  }
  return servers[servers.length - 1];
}

export function findNIOSServerByObjects(objects) {
  for (const server of niosServerGuardrails) {
    if (server.maxDbObj * 0.6 >= objects) return server.model;
  }
  return 'TE-4126';
}

export function findNIOSServerByPerformance(qps, lps, objects) {
  for (const server of niosServerGuardrails) {
    if (server.maxQPS * 0.6 >= qps && server.maxLPS * 0.6 >= lps && server.maxDbObj * 0.6 >= objects) {
      return server.model;
    }
  }
  return 'TE-4126';
}

export function getSiteRecommendedModel(numIPs, role, platform, dhcpPercent, leaseTimeSeconds, sitePlatform, options = {}) {
  const { isSpoke = false, hubLPS = 0 } = options;
  
  const isUDDI = sitePlatform
    ? (sitePlatform === 'NXVS' || sitePlatform === 'NXaaS')
    : (platform.includes('UDDI') || platform.includes('Hybrid'));
  
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // Calculate base workload metrics
  let qps = Math.ceil(numIPs / (isUDDI ? 50 : niosGridConstants.peakQpsDivisor));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  const dnsObjects = (dhcpClients * niosGridConstants.dnsRecordsPerDhcpClient) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // If this is a Hub, add LPS from all spokes
  if (hubLPS > 0) {
    lps += hubLPS;
  }
  
  // If this is a Spoke, apply 50% LPS penalty (forwarding to Hub)
  if (isSpoke) {
    lps = Math.ceil(lps * 2); // Need 2x capacity to handle same workload
  }
  
  // Handle Grid Master and Grid Master Candidate roles
  // GM/GMC primarily care about object capacity, not QPS/LPS
  if (role === 'GM' || role === 'GMC') {
    // Grid objects = total managed objects across the grid
    const gridObjects = dnsObjects + dhcpObjects;
    
    if (isUDDI) {
      // UDDI doesn't have GM/GMC - should not reach here, but fallback to S
      return 'S';
    }
    
    // For NIOS GM/GMC, size based on object capacity with buffer
    for (const server of niosServerGuardrails) {
      if (server.maxDbObj * (niosGridConstants.maxDbUtilizationPercent / 100) >= gridObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
  
  // Handle GM/GMC with DNS/DHCP services (not recommended but supported)
  // These are ADDITIVE: object management + QPS/LPS penalties
  if (role.startsWith('GM+') || role.startsWith('GMC+')) {
    const gridObjects = dnsObjects + dhcpObjects;
    const hasDNS = role.includes('DNS');
    const hasDHCP = role.includes('DHCP') && !role.includes('DNS/DHCP') || role.includes('DNS/DHCP');
    const hasBoth = role.includes('DNS/DHCP');
    
    // Calculate combined workload requirements
    let requiredQPS = 0;
    let requiredLPS = 0;
    let requiredObjects = gridObjects; // Start with grid management objects
    
    if (hasDNS || hasBoth) {
      requiredQPS = qps;
      requiredObjects += dnsObjects;
    }
    if (hasDHCP || hasBoth) {
      requiredLPS = lps;
      requiredObjects += dhcpObjects;
    }
    
    // Apply multi-role penalty for combined DNS/DHCP
    if (hasBoth) {
      requiredQPS = Math.ceil(requiredQPS * niosGridConstants.multiRoleCapacityMultiplier);
      requiredLPS = Math.ceil(requiredLPS * niosGridConstants.multiRoleCapacityMultiplier);
    }
    
    // Find a server that can handle BOTH the GM object load AND the DNS/DHCP workload
    // This is additive sizing - we need capacity for both roles
    for (const server of niosServerGuardrails) {
      const effectiveQPS = server.maxQPS * (niosGridConstants.maxDbUtilizationPercent / 100);
      const effectiveLPS = server.maxLPS * (niosGridConstants.maxDbUtilizationPercent / 100);
      const effectiveObjects = server.maxDbObj * (niosGridConstants.maxDbUtilizationPercent / 100);
      
      // Check if server can handle the combined workload
      const meetsQPS = !hasDNS && !hasBoth || effectiveQPS >= requiredQPS;
      const meetsLPS = !hasDHCP && !hasBoth || effectiveLPS >= requiredLPS;
      const meetsObjects = effectiveObjects >= requiredObjects;
      
      if (meetsQPS && meetsLPS && meetsObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
  
  // Handle combined DNS/DHCP role with multi-role penalty
  if (role === 'DNS/DHCP') {
    const combinedObjects = dnsObjects + dhcpObjects;
    
    // Apply multi-role capacity multiplier (need more capacity for combined workload)
    const adjustedQPS = Math.ceil(qps * niosGridConstants.multiRoleCapacityMultiplier);
    const adjustedLPS = Math.ceil(lps * niosGridConstants.multiRoleCapacityMultiplier);
    
    if (isUDDI) {
      for (const server of nxvsServers) {
        const effectiveQPS = server.qps * (niosGridConstants.maxDbUtilizationPercent / 100);
        const effectiveLPS = server.lps * (niosGridConstants.maxDbUtilizationPercent / 100);
        const effectiveObjects = server.objects * (niosGridConstants.maxDbUtilizationPercent / 100);
        
        if (effectiveQPS >= adjustedQPS && effectiveLPS >= adjustedLPS && effectiveObjects >= combinedObjects) {
          return server.serverSize;
        }
      }
      return 'XL';
    } else {
      for (const server of niosServerGuardrails) {
        const effectiveQPS = server.maxQPS * (niosGridConstants.maxDbUtilizationPercent / 100);
        const effectiveLPS = server.maxLPS * (niosGridConstants.maxDbUtilizationPercent / 100);
        const effectiveObjects = server.maxDbObj * (niosGridConstants.maxDbUtilizationPercent / 100);
        
        if (effectiveQPS >= adjustedQPS && effectiveLPS >= adjustedLPS && effectiveObjects >= combinedObjects) {
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
        if (server.qps * 0.6 >= qps && server.objects * 0.6 >= dnsObjects) {
          return server.serverSize;
        }
      }
      return 'XL';
    } else {
      for (const server of niosServerGuardrails) {
        if (server.maxQPS * 0.6 >= qps && server.maxDbObj * 0.6 >= dnsObjects) {
          return server.model;
        }
      }
      return 'TE-4126';
    }
  }
  
  // Handle DHCP-only role (default case)
  if (isUDDI) {
    for (const server of nxvsServers) {
      if (server.lps * 0.6 >= lps && server.objects * 0.6 >= dhcpObjects) {
        return server.serverSize;
      }
    }
    return 'XL';
  } else {
    for (const server of niosServerGuardrails) {
      if (server.maxLPS * 0.6 >= lps && server.maxDbObj * 0.6 >= dhcpObjects) {
        return server.model;
      }
    }
    return 'TE-4126';
  }
}

export function getHardwareSkuOptions(softwareModel) {
  const mapping = hardwareSkuMapping[softwareModel];
  if (!mapping) return ['N/A'];
  return [mapping.default, ...mapping.alternatives];
}

export function getDefaultHardwareSku(softwareModel) {
  return hardwareSkuMapping[softwareModel]?.default || 'N/A';
}

export function isHardwareSkuLocked(softwareModel) {
  return hardwareSkuMapping[softwareModel]?.locked || false;
}

// Get detailed workload breakdown with the driver metric
export function getSiteWorkloadDetails(numIPs, role, platform, dhcpPercent, sitePlatform, options = {}) {
  const { isSpoke = false, hubLPS = 0 } = options;
  
  const isUDDI = sitePlatform
    ? (sitePlatform === 'NXVS' || sitePlatform === 'NXaaS')
    : (platform?.includes('UDDI') || platform?.includes('Hybrid'));
  
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;
  
  // Base calculations
  let qps = Math.ceil(numIPs / (isUDDI ? 50 : niosGridConstants.peakQpsDivisor));
  let lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
  
  const dnsObjects = (dhcpClients * niosGridConstants.dnsRecordsPerDhcpClient) + 
                     (staticClients * niosGridConstants.dnsRecordsPerStaticClient);
  const dhcpObjects = dhcpClients * niosGridConstants.dhcpLeaseObjectsPerClient;
  
  // Track penalties
  const penalties = [];
  
  // Hub LPS addition
  if (hubLPS > 0) {
    penalties.push(`Hub: +${hubLPS} LPS (50% of spoke capacity for failover)`);
    lps += hubLPS;
  }
  
  // Spoke penalty
  if (isSpoke) {
    penalties.push('Spoke: 2x LPS (50% penalty)');
    lps = Math.ceil(lps * 2);
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
  
  // Calculate objects based on role
  let objects = 0;
  if (role === 'GM' || role === 'GMC') {
    objects = dnsObjects + dhcpObjects;
  } else if (role.startsWith('GM+') || role.startsWith('GMC+')) {
    // GM/GMC with services: grid management objects + service objects
    objects = dnsObjects + dhcpObjects; // Grid management base
    if (role.includes('DNS/DHCP')) {
      objects += dnsObjects + dhcpObjects; // Add service objects
    } else if (role.includes('DNS')) {
      objects += dnsObjects;
    } else if (role.includes('DHCP')) {
      objects += dhcpObjects;
    }
  } else if (role === 'DNS/DHCP') {
    objects = dnsObjects + dhcpObjects;
  } else if (role === 'DNS') {
    objects = dnsObjects;
  } else if (role === 'DHCP') {
    objects = dhcpObjects;
  }
  
  // Determine which metric drove the model selection
  let driver = 'objects'; // default
  const servers = isUDDI ? nxvsServers : niosServerGuardrails;
  const utilization = niosGridConstants.maxDbUtilizationPercent / 100;
  
  for (const server of servers) {
    const maxQPS = isUDDI ? server.qps : server.maxQPS;
    const maxLPS = isUDDI ? server.lps : server.maxLPS;
    const maxObj = isUDDI ? server.objects : server.maxDbObj;
    
    const effQPS = maxQPS * utilization;
    const effLPS = maxLPS * utilization;
    const effObj = maxObj * utilization;
    
    // Check which metric would fail first (is the limiting factor)
    const qpsUtil = (adjustedQPS / effQPS) * 100;
    const lpsUtil = (adjustedLPS / effLPS) * 100;
    const objUtil = (objects / effObj) * 100;
    
    // Find which has highest utilization (the driver)
    if (qpsUtil > lpsUtil && qpsUtil > objUtil) {
      driver = 'qps';
    } else if (lpsUtil > qpsUtil && lpsUtil > objUtil) {
      driver = 'lps';
    } else {
      driver = 'objects';
    }
    break; // Just need the pattern, not the exact server
  }
  
  return {
    qps,
    lps,
    adjustedQPS,
    adjustedLPS,
    objects,
    dnsObjects,
    dhcpObjects,
    dhcpClients,
    staticClients,
    penalties,
    driver,
    isUDDI,
  };
}
