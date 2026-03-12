/**
 * Token Calculation Utility Functions
 * Extracted from TokenCalculatorSummary.jsx for better organization
 */

import { niosServerGuardrails, uddiServerTokens, tokenModels, getMaxKWForModel, getMaxIPsForModel, estimateTokensPerUser, niosGridConstants } from "@/lib/tokenData";
import { ADDITIONAL_SERVICES } from "./platformConfig";

// Re-export for convenience
export { getMaxKWForModel, getMaxIPsForModel, estimateTokensPerUser };

// Get utilization % label for display (e.g. "60%" or "80%")
export function getUtilizationLabel(platform: string | null | undefined): string {
  if (!platform) return '60%';
  const p = (platform || '').toUpperCase();
  if (p === 'NXVS' || p === 'NX-P' || p === 'NXAAS' || p.includes('UDDI')) {
    return `${niosGridConstants.uddiUtilPercent}%`;
  }
  return `${niosGridConstants.niosUtilPercent}%`;
}

export interface PartnerSku {
  sku: string;
  description: string;
}

// Calculate total service impact percentage
export function getServiceImpact(services: string[] = []): number {
  return services.reduce((total, svc) => {
    const service = ADDITIONAL_SERVICES.find(s => s.value === svc);
    return total + (service?.impact || 0);
  }, 0);
}

// Get token count for a model — platform-aware for UDDI (NXVS vs NXaaS have different token costs)
export function getTokensForModel(model: string, platform: string | null = null): number {
  const niosServer = niosServerGuardrails.find(s => s.model === model);
  if (niosServer) return niosServer.tokens;
  
  // For UDDI: match by server type + size
  if (platform === 'NXaaS') {
    const nxaas = uddiServerTokens.find(s => s.serverType === 'NXaaS' && s.serverSize === model);
    if (nxaas) return nxaas.tokens;
  }
  // Default to NXVS for UDDI
  const nxvs = uddiServerTokens.find(s => s.serverType === 'NXVS' && s.serverSize === model);
  if (nxvs) return nxvs.tokens;
  
  // Fallback: try key match (e.g., 'NXVS-S')
  const byKey = uddiServerTokens.find(s => s.key === model);
  if (byKey) return byKey.tokens;
  
  const tokenModel = tokenModels.find(t => t.appSize.toString() === model?.replace('TE-', ''));
  if (tokenModel) return tokenModel.tokens;
  return 0;
}

// Calculate partner SKU from total tokens
export function getPartnerSkuFromTokens(totalTokens: number): PartnerSku {
  if (totalTokens <= 5000) return { sku: 'IB-TOKENS-5K', description: '5,000 Token Pack' };
  if (totalTokens <= 10000) return { sku: 'IB-TOKENS-10K', description: '10,000 Token Pack' };
  if (totalTokens <= 17000) return { sku: 'IB-TOKENS-17K', description: '17,000 Token Pack' };
  if (totalTokens <= 25000) return { sku: 'IB-TOKENS-25K', description: '25,000 Token Pack' };
  if (totalTokens <= 50000) return { sku: 'IB-TOKENS-50K', description: '50,000 Token Pack' };
  return { sku: 'IB-TOKENS-100K+', description: '100,000+ Token Pack' };
}

// Get SKU description
export function getSkuDescription(sku: string): string {
  const descriptions: Record<string, string> = {
    // TE hardware chassis
    'TE-906-HW-AC':       'TE-926 (AC)',
    // TE-906-HW-DC does not exist — 906 chassis is AC only
    'TE-906-HW-2AC':      'TE-926 (Dual AC)',
    'TE-1506-HW-AC':      'TE-1516 (AC)',
    'TE-1506-HW-DC':      'TE-1516 (DC)',
    'TE-1506-10GE-HW-AC': 'TE-1516 10GE (AC)',
    'TE-1506-10GE-HW-DC': 'TE-1516 10GE (DC)',
    'TE-1606-HW-AC':      'TE-1526 (AC)',
    'TE-1606-HW-DC':      'TE-1526 (DC)',
    'TE-1606-10GE-HW-AC': 'TE-1526 10GE (AC)',
    'TE-1606-10GE-HW-DC': 'TE-1526 10GE (DC)',
    'TE-2306-HW-AC':      'TE-2326 (AC)',
    'TE-2306-HW-DC':      'TE-2326 (DC)',
    'TE-2306-10GE-HW-AC': 'TE-2326 10GE (AC)',
    'TE-4106-HW-AC':      'TE-4126 (AC)',
    'TE-4106-HW-DC':      'TE-4126 (DC)',
    'TE-4106-10GE-HW-AC': 'TE-4126 10GE (AC)',
    // NIOS ND hardware chassis
    'ND-906-HW-AC':       'Network Discovery ND-906 (AC)',
    'ND-906-HW-DC':       'Network Discovery ND-906 (DC)',
    'ND-1606-HW-AC':      'Network Discovery ND-1606 (AC)',
    'ND-1606-HW-DC':      'Network Discovery ND-1606 (DC)',
    'ND-2306-HW-AC':      'Network Discovery ND-2306 (AC)',
    'ND-2306-HW-DC':      'Network Discovery ND-2306 (DC)',
    'ND-4106-HW-AC':      'Network Discovery ND-4106 (AC)',
    'ND-4106-HW-DC':      'Network Discovery ND-4106 (DC)',
    // NX-P
    'B1-105-HW-AC':       'NIOS-X B1-105 Appliance (AC)',
    'B1-212-HW-AC':       'NIOS-X B1-212 Appliance (AC)',
  };
  return descriptions[sku] || sku;
}

// Get recommended platform based on site count and customer needs
export function getRecommendedPlatformMode(dcCount: number, siteCount: number): string {
  if (siteCount > 50) return 'UDDI'; // Large distributed = UDDI
  if (dcCount >= 2 && siteCount > 10) return 'Hybrid';
  return 'NIOS'; // Traditional
}
