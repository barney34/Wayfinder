import { hardwareSkuMapping } from './constants';
import {
  getAssetsPerWorker,
  nxvsServers, nxaasServers,
  x6ServerGuardrails,
  niosServerGuardrails, niosGridConstants,
} from '@/lib/tokenData';

export function getPartnerSku(packCount) {
  if (packCount <= 5) return 'IB-TOKENS-SECURITY-1000-5000';
  if (packCount <= 17) return 'IB-TOKENS-SECURITY-6000-17000';
  return 'IB-TOKENS-SECURITY-18000+';
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

export function getSiteRecommendedModel(numIPs, role, platform, dhcpPercent, leaseTimeSeconds, sitePlatform) {
  const isUDDI = sitePlatform
    ? (sitePlatform === 'NXVS' || sitePlatform === 'NXaaS')
    : (platform.includes('UDDI') || platform.includes('Hybrid'));
  const dhcpClients = Math.ceil(numIPs * (dhcpPercent / 100));
  const staticClients = numIPs - dhcpClients;

  if (isUDDI) {
    if (role === 'DNS') {
      const qps = Math.ceil(numIPs / 50);
      const objects = (dhcpClients * 3) + (staticClients * 2);
      for (const server of nxvsServers) {
        if (server.qps * 0.6 >= qps && server.objects * 0.6 >= objects) return server.serverSize;
      }
      return 'XL';
    } else {
      const lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
      const objects = dhcpClients * 2;
      for (const server of nxvsServers) {
        if (server.lps * 0.6 >= lps && server.objects * 0.6 >= objects) return server.serverSize;
      }
      return 'XL';
    }
  } else {
    if (role === 'DNS') {
      const qps = Math.ceil(numIPs / niosGridConstants.peakQpsDivisor);
      const objects = (dhcpClients * 3) + (staticClients * 2);
      for (const server of niosServerGuardrails) {
        if (server.maxQPS * 0.6 >= qps && server.maxDbObj * 0.6 >= objects) return server.model;
      }
      return 'TE-4126';
    } else {
      const lps = Math.max(1, Math.ceil(dhcpClients / niosGridConstants.lpsAggregateSeconds));
      const objects = dhcpClients * 2;
      for (const server of niosServerGuardrails) {
        if (server.maxLPS * 0.6 >= lps && server.maxDbObj * 0.6 >= objects) return server.model;
      }
      return 'TE-4126';
    }
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
