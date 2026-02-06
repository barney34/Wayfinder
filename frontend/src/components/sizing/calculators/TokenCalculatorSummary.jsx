import { useMemo } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Server, Package, DollarSign, Cpu, HardDrive, Shield, BarChart3 } from "lucide-react";
import { 
  calculateWorkloadRequirements, 
  getPartnerSku, 
  getSiteRecommendedModel,
  getDefaultHardwareSku,
} from "../calculations";
import { 
  niosServerGuardrails, 
  uddiServerTokens,
  tokenModels,
} from "@/lib/tokenData";
import { hardwareSkuMapping } from "../constants";

// Get token count for a model
function getTokensForModel(model) {
  // Check NIOS servers
  const niosServer = niosServerGuardrails.find(s => s.model === model);
  if (niosServer) return niosServer.tokens;
  
  // Check UDDI servers
  const uddiServer = uddiServerTokens.find(s => s.serverSize === model || s.key === model);
  if (uddiServer) return uddiServer.tokens;
  
  // Check token models
  const tokenModel = tokenModels.find(t => t.appSize.toString() === model?.replace('TE-', ''));
  if (tokenModel) return tokenModel.tokens;
  
  return 0;
}

// Calculate partner SKU from total tokens
function getPartnerSkuFromTokens(totalTokens) {
  if (totalTokens <= 5000) return { sku: 'IB-TOKENS-SECURITY-5K', description: '5,000 Token Pack' };
  if (totalTokens <= 10000) return { sku: 'IB-TOKENS-SECURITY-10K', description: '10,000 Token Pack' };
  if (totalTokens <= 17000) return { sku: 'IB-TOKENS-SECURITY-17K', description: '17,000 Token Pack' };
  if (totalTokens <= 25000) return { sku: 'IB-TOKENS-SECURITY-25K', description: '25,000 Token Pack' };
  if (totalTokens <= 50000) return { sku: 'IB-TOKENS-SECURITY-50K', description: '50,000 Token Pack' };
  return { sku: 'IB-TOKENS-SECURITY-100K+', description: '100,000+ Token Pack (Custom)' };
}

/**
 * TokenCalculatorSummary Component
 * Provides a comprehensive view of site sizing, token calculations, and BOM
 */
export function TokenCalculatorSummary() {
  const { dataCenters = [], sites: contextSites = [], answers = {} } = useDiscovery();
  
  // Global settings
  const globalPlatform = answers['ud-platform'] || 'NIOS (Physical/Virtual)';
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;
  const securityEnabled = answers['feature-security'] === 'Yes';
  const uddiEnabled = answers['feature-uddi'] === 'Yes';
  const assetInsightsEnabled = answers['feature-asset insights'] === 'Yes';
  
  // Parse site configuration from answers if available
  const siteConfigValue = answers['sizing-1'];
  const siteConfig = useMemo(() => {
    try {
      return siteConfigValue ? JSON.parse(siteConfigValue) : { sites: [] };
    } catch {
      return { sites: [] };
    }
  }, [siteConfigValue]);
  
  // Build sites from Quick Capture data or site configuration
  const sites = useMemo(() => {
    // If we have site config with sites, use those
    if (siteConfig.sites && siteConfig.sites.length > 0) {
      return siteConfig.sites;
    }
    
    // Otherwise build from Quick Capture data
    const dcSites = dataCenters.map((dc, index) => {
      const kw = dc.knowledgeWorkers || 0;
      const numIPs = Math.round(kw * ipMultiplier);
      const recommendedModel = getSiteRecommendedModel(
        numIPs, 
        index === 0 ? 'GM' : 'GMC', 
        globalPlatform, 
        dhcpPercent, 
        leaseTimeSeconds, 
        'NIOS'
      );
      
      return {
        id: `dc-${dc.id}`,
        name: dc.name || `Data Center ${index + 1}`,
        sourceType: 'dataCenter',
        numIPs,
        knowledgeWorkers: kw,
        role: index === 0 ? 'GM' : 'GMC',
        platform: 'NIOS',
        recommendedModel,
        hardwareSku: getDefaultHardwareSku(recommendedModel),
        tokens: getTokensForModel(recommendedModel),
      };
    });
    
    const branchSites = contextSites.map((site, index) => {
      const kw = site.knowledgeWorkers || 0;
      const numIPs = Math.round(kw * ipMultiplier);
      const recommendedModel = getSiteRecommendedModel(
        numIPs, 
        'DNS/DHCP', 
        globalPlatform, 
        dhcpPercent, 
        leaseTimeSeconds, 
        globalPlatform.includes('UDDI') ? 'NX' : 'NIOS'
      );
      
      return {
        id: `site-${site.id}`,
        name: site.name || `Site ${index + 1}`,
        sourceType: 'site',
        numIPs,
        knowledgeWorkers: kw,
        role: 'DNS/DHCP',
        platform: globalPlatform.includes('UDDI') ? 'NX' : 'NIOS',
        recommendedModel,
        hardwareSku: getDefaultHardwareSku(recommendedModel),
        tokens: getTokensForModel(recommendedModel),
      };
    });
    
    return [...dcSites, ...branchSites];
  }, [dataCenters, contextSites, siteConfig, ipMultiplier, globalPlatform, dhcpPercent, leaseTimeSeconds]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalIPs = sites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const infraTokens = sites.reduce((sum, s) => sum + (s.tokens || 0), 0);
    
    // Get security tokens from answers
    const tdCloudTokens = parseInt(answers['td-cloud-tokens']) || 0;
    const dossierTokens = parseInt(answers['dossier-tokens']) || 0;
    const lookalikeTokens = parseInt(answers['lookalike-tokens']) || 0;
    const socInsightsTokens = parseInt(answers['soc-insights-tokens']) || 0;
    const domainTakedownTokens = parseInt(answers['domain-takedown-tokens']) || 0;
    const reportingTokens = parseInt(answers['reporting-tokens']) || 0;
    
    const securityTokens = securityEnabled ? (tdCloudTokens + dossierTokens + lookalikeTokens + socInsightsTokens + domainTakedownTokens + reportingTokens) : 0;
    
    // UDDI tokens
    const uddiTokens = uddiEnabled ? (parseInt(answers['uddi-tokens']) || 0) : 0;
    
    const totalTokens = infraTokens + securityTokens + uddiTokens;
    
    return {
      totalIPs,
      totalKW,
      infraTokens,
      securityTokens,
      uddiTokens,
      totalTokens,
      gmCount: sites.filter(s => s.role === 'GM').length,
      gmcCount: sites.filter(s => s.role === 'GMC').length,
      memberCount: sites.filter(s => !['GM', 'GMC'].includes(s.role)).length,
    };
  }, [sites, answers, securityEnabled, uddiEnabled]);
  
  // Build BOM (Bill of Materials)
  const bom = useMemo(() => {
    const bomItems = {};
    
    // Aggregate hardware by SKU
    sites.forEach(site => {
      const sku = site.hardwareSku || 'N/A';
      if (sku !== 'N/A') {
        if (!bomItems[sku]) {
          bomItems[sku] = {
            sku,
            description: getSkuDescription(sku),
            quantity: 0,
            sites: [],
          };
        }
        bomItems[sku].quantity += 1;
        bomItems[sku].sites.push(site.name);
      }
    });
    
    return Object.values(bomItems);
  }, [sites]);
  
  // Get partner SKU recommendation
  const partnerSku = useMemo(() => {
    return getPartnerSkuFromTokens(totals.totalTokens);
  }, [totals.totalTokens]);
  
  if (sites.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Sites Configured</h3>
          <p className="text-sm text-muted-foreground">
            Add Data Centers and Sites in the Quick Capture bar, or configure sites in the Sizing tab to see the summary.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="token-calculator-summary">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Sites</span>
            </div>
            <p className="text-2xl font-bold">{sites.length}</p>
            <div className="flex gap-2 mt-1">
              {totals.gmCount > 0 && <Badge variant="secondary" className="text-xs">{totals.gmCount} GM</Badge>}
              {totals.gmcCount > 0 && <Badge variant="secondary" className="text-xs">{totals.gmcCount} GMC</Badge>}
              {totals.memberCount > 0 && <Badge variant="outline" className="text-xs">{totals.memberCount} Members</Badge>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Total IPs</span>
            </div>
            <p className="text-2xl font-bold">{totals.totalIPs.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{totals.totalKW.toLocaleString()} Knowledge Workers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold">{totals.totalTokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Infra: {totals.infraTokens.toLocaleString()} | Security: {totals.securityTokens.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Partner SKU</span>
            </div>
            <p className="text-lg font-bold text-primary">{partnerSku.sku}</p>
            <p className="text-xs text-muted-foreground mt-1">{partnerSku.description}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Site Sizing Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Site Sizing Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">Type</TableHead>
                  <TableHead>Site Name</TableHead>
                  <TableHead className="w-[80px]">IPs</TableHead>
                  <TableHead className="w-[80px]">KW</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="w-[80px]">Platform</TableHead>
                  <TableHead className="w-[100px]">Model</TableHead>
                  <TableHead className="w-[140px]">Hardware SKU</TableHead>
                  <TableHead className="w-[80px] text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow key={site.id} data-testid={`summary-site-${site.id}`}>
                    <TableCell>
                      {site.sourceType === 'dataCenter' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MapPin className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="tabular-nums">{(site.numIPs || 0).toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{(site.knowledgeWorkers || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={site.role === 'GM' ? 'default' : site.role === 'GMC' ? 'secondary' : 'outline'} className="text-xs">
                        {site.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{site.platform}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{site.recommendedModel}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{site.hardwareSku}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{(site.tokens || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="tabular-nums">{totals.totalIPs.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{totals.totalKW.toLocaleString()}</TableCell>
                  <TableCell colSpan={4}></TableCell>
                  <TableCell className="text-right tabular-nums">{totals.infraTokens.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Bill of Materials */}
      {bom.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Bill of Materials (BOM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Hardware SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px] text-center">Qty</TableHead>
                    <TableHead>Assigned Sites</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.map(item => (
                    <TableRow key={item.sku} data-testid={`bom-item-${item.sku}`}>
                      <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.sites.slice(0, 3).join(', ')}
                        {item.sites.length > 3 && ` +${item.sites.length - 3} more`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Token Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Token Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Infrastructure Tokens */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                <span>Infrastructure Tokens</span>
              </div>
              <span className="font-mono font-medium">{totals.infraTokens.toLocaleString()}</span>
            </div>
            
            {/* Security Tokens */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Security Tokens</span>
                {!securityEnabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
              </div>
              <span className="font-mono font-medium">{totals.securityTokens.toLocaleString()}</span>
            </div>
            
            {/* UDDI Tokens */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-500" />
                <span>UDDI Tokens</span>
                {!uddiEnabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
              </div>
              <span className="font-mono font-medium">{totals.uddiTokens.toLocaleString()}</span>
            </div>
            
            <Separator />
            
            {/* Total */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-semibold">Total Tokens Required</span>
              </div>
              <span className="font-mono font-bold text-lg text-primary">{totals.totalTokens.toLocaleString()}</span>
            </div>
            
            {/* Partner SKU Recommendation */}
            <div className="bg-primary/5 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Recommended Partner SKU</p>
                  <p className="text-sm text-muted-foreground">{partnerSku.description}</p>
                </div>
                <Badge className="text-lg px-4 py-1">{partnerSku.sku}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get SKU description
function getSkuDescription(sku) {
  const descriptions = {
    'TE-906-HW-2AC': 'NIOS TE-926 Hardware (Dual AC)',
    'TE-906-HW-AC': 'NIOS TE-926 Hardware (Single AC)',
    'TE-1506-HW-AC': 'NIOS TE-1516 Hardware',
    'TE-1506-HW-DC': 'NIOS TE-1516 Hardware (DC)',
    'TE-1506-10GE-HW-AC': 'NIOS TE-1516 Hardware (10GE)',
    'TE-1506-10GE-HW-DC': 'NIOS TE-1516 Hardware (10GE DC)',
    'TE-1606-HW-AC': 'NIOS TE-1526 Hardware',
    'TE-1606-HW-DC': 'NIOS TE-1526 Hardware (DC)',
    'TE-1606-10GE-HW-AC': 'NIOS TE-1526 Hardware (10GE)',
    'TE-1606-10GE-HW-DC': 'NIOS TE-1526 Hardware (10GE DC)',
    'TE-2306-HW-AC': 'NIOS TE-2326 Hardware',
    'TE-2306-HW-DC': 'NIOS TE-2326 Hardware (DC)',
    'TE-2306-10GE-HW-AC': 'NIOS TE-2326 Hardware (10GE)',
    'TE-2306-10GE-HW-DC': 'NIOS TE-2326 Hardware (10GE DC)',
    'TE-4106-HW-AC': 'NIOS TE-4126 Hardware',
    'TE-4106-HW-DC': 'NIOS TE-4126 Hardware (DC)',
    'TE-4106-10GE-HW-AC': 'NIOS TE-4126 Hardware (10GE)',
    'TE-4106-10GE-HW-DC': 'NIOS TE-4126 Hardware (10GE DC)',
    'B1-105-HW-AC': 'BloxOne DDI Appliance (Small)',
    'B1-212-HW-AC': 'BloxOne DDI Appliance (Medium)',
  };
  return descriptions[sku] || sku;
}

export default TokenCalculatorSummary;
