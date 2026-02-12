/**
 * Token Calculation Utility Functions
 * Extracted from TokenCalculatorSummary.jsx for better organization
 */

import { niosServerGuardrails, uddiServerTokens, tokenModels } from "@/lib/tokenData";
import { ADDITIONAL_SERVICES } from "./platformConfig";

// Calculate total service impact percentage
export function getServiceImpact(services = []) {
  return services.reduce((total, svc) => {
    const service = ADDITIONAL_SERVICES.find(s => s.value === svc);
    return total + (service?.impact || 0);
  }, 0);
}

// Get token count for a model
export function getTokensForModel(model) {
  const niosServer = niosServerGuardrails.find(s => s.model === model);
  if (niosServer) return niosServer.tokens;
  const uddiServer = uddiServerTokens.find(s => s.serverSize === model || s.key === model);
  if (uddiServer) return uddiServer.tokens;
  const tokenModel = tokenModels.find(t => t.appSize.toString() === model?.replace('TE-', ''));
  if (tokenModel) return tokenModel.tokens;
  return 0;
}

// Calculate partner SKU from total tokens
export function getPartnerSkuFromTokens(totalTokens) {
  if (totalTokens <= 5000) return { sku: 'IB-TOKENS-5K', description: '5,000 Token Pack' };
  if (totalTokens <= 10000) return { sku: 'IB-TOKENS-10K', description: '10,000 Token Pack' };
  if (totalTokens <= 17000) return { sku: 'IB-TOKENS-17K', description: '17,000 Token Pack' };
  if (totalTokens <= 25000) return { sku: 'IB-TOKENS-25K', description: '25,000 Token Pack' };
  if (totalTokens <= 50000) return { sku: 'IB-TOKENS-50K', description: '50,000 Token Pack' };
  return { sku: 'IB-TOKENS-100K+', description: '100,000+ Token Pack' };
}

// Get SKU description
export function getSkuDescription(sku) {
  const descriptions = {
    'TE-906-HW-2AC': 'NIOS TE-926 (Dual AC)',
    'TE-906-HW-AC': 'NIOS TE-926 (AC)',
    'TE-1506-HW-AC': 'NIOS TE-1516',
    'TE-1606-HW-AC': 'NIOS TE-1526',
    'TE-2306-HW-AC': 'NIOS TE-2326',
    'TE-4106-HW-AC': 'NIOS TE-4126',
  };
  return descriptions[sku] || sku;
}

// Get recommended platform based on site count and customer needs
export function getRecommendedPlatformMode(dcCount, siteCount) {
  if (siteCount > 50) return 'UDDI'; // Large distributed = UDDI
  if (dcCount >= 2 && siteCount > 10) return 'Hybrid';
  return 'NIOS'; // Traditional
}
