import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, MapPin, Server, Package, DollarSign, Cpu, HardDrive, Shield, BarChart3,
  Plus, Trash2, Download, FileText, Info, AlertTriangle, Star, Settings2, FileSpreadsheet,
  Database, HelpCircle, Zap, Activity, Archive
} from "lucide-react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatNumber } from "@/lib/utils";
import { 
  getSiteRecommendedModel,
  getDefaultHardwareSku,
  getHardwareSkuOptions,
  isHardwareSkuLocked,
  calculateSiteLPS,
  calculateSiteObjects,
  getSiteWorkloadDetails,
} from "../calculations";
import { 
  niosServerGuardrails, 
  uddiServerTokens,
  tokenModels,
  niosGridConstants,
  gmServiceRestrictions,
  calculateGMObjects,
  findMinimumGMModel,
  nxvsServers,
} from "@/lib/tokenData";

// Global platform modes
const PLATFORM_MODES = [
  { value: 'NIOS', label: 'NIOS', description: 'Traditional on-prem (Physical/Virtual)' },
  { value: 'UDDI', label: 'UDDI', description: 'Cloud-native NIOS-X' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Mix of NIOS + UDDI' },
];

// Platform options per mode
const PLATFORM_OPTIONS_BY_MODE = {
  NIOS: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
    { value: 'NIOS-HA', label: 'NIOS HA Pair' },
  ],
  UDDI: [
    { value: 'NXVS', label: 'NIOS-X Virtual Server' },
    { value: 'NXaaS', label: 'NIOS-X as a Service' },
  ],
  Hybrid: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
    { value: 'NIOS-HA', label: 'NIOS HA Pair' },
    { value: 'NXVS', label: 'NIOS-X VS' },
    { value: 'NXaaS', label: 'NXaaS' },
  ],
};

// Role options by platform mode (UDDI doesn't have GM/GMC)
const ROLE_OPTIONS_BY_MODE = {
  NIOS: [
    { value: 'GM', label: 'GM', description: 'Grid Master' },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate' },
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
  UDDI: [
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
  Hybrid: [
    { value: 'GM', label: 'GM', description: 'Grid Master (NIOS only)' },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate (NIOS only)' },
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
};

// Additional services (multi-select) - can be co-located on same host
const ADDITIONAL_SERVICES = [
  { value: 'NTP', label: 'NTP', description: 'Network Time Protocol', impact: 0 },
  { value: 'DFP', label: 'DFP', description: 'DNS Firewall Policy', impact: 5 },
  { value: 'TFTP', label: 'TFTP', description: 'Trivial File Transfer', impact: 2 },
  { value: 'FTP', label: 'FTP', description: 'File Transfer Protocol', impact: 2 },
  { value: 'HTTP', label: 'HTTP', description: 'HTTP File Distribution', impact: 3 },
];

// Calculate total service impact percentage
function getServiceImpact(services = []) {
  return services.reduce((total, svc) => {
    const service = ADDITIONAL_SERVICES.find(s => s.value === svc);
    return total + (service?.impact || 0);
  }, 0);
}

// Get token count for a model
function getTokensForModel(model) {
  const niosServer = niosServerGuardrails.find(s => s.model === model);
  if (niosServer) return niosServer.tokens;
  const uddiServer = uddiServerTokens.find(s => s.serverSize === model || s.key === model);
  if (uddiServer) return uddiServer.tokens;
  const tokenModel = tokenModels.find(t => t.appSize.toString() === model?.replace('TE-', ''));
  if (tokenModel) return tokenModel.tokens;
  return 0;
}

// Calculate partner SKU from total tokens
function getPartnerSkuFromTokens(totalTokens) {
  if (totalTokens <= 5000) return { sku: 'IB-TOKENS-5K', description: '5,000 Token Pack' };
  if (totalTokens <= 10000) return { sku: 'IB-TOKENS-10K', description: '10,000 Token Pack' };
  if (totalTokens <= 17000) return { sku: 'IB-TOKENS-17K', description: '17,000 Token Pack' };
  if (totalTokens <= 25000) return { sku: 'IB-TOKENS-25K', description: '25,000 Token Pack' };
  if (totalTokens <= 50000) return { sku: 'IB-TOKENS-50K', description: '50,000 Token Pack' };
  return { sku: 'IB-TOKENS-100K+', description: '100,000+ Token Pack' };
}

// Get SKU description
function getSkuDescription(sku) {
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
function getRecommendedPlatformMode(dcCount, siteCount) {
  if (siteCount > 50) return 'UDDI'; // Large distributed = UDDI
  if (dcCount >= 2 && siteCount > 10) return 'Hybrid';
  return 'NIOS'; // Traditional
}

/**
 * TokenCalculatorSummary Component
 * EDITABLE site sizing, token calculations, BOM, and export
 */
export function TokenCalculatorSummary() {
  const { 
    dataCenters = [], sites: contextSites = [], answers = {}, setAnswer, platformMode, setPlatformMode, setSizingSummary 
  } = useDiscovery();
  
  // Site overrides and manual sites state
  const [siteOverrides, setSiteOverrides] = useState({});
  const [manualSites, setManualSites] = useState([]);
  const lastSavedRef = useRef(null);
  
  // Alert dialog state for platform change confirmation
  const [showPlatformAlert, setShowPlatformAlert] = useState(false);
  const [pendingPlatformChange, setPendingPlatformChange] = useState(null);
  
  // UI toggle for Hardware SKU column
  const [showHardware, setShowHardware] = useState(false);
  
  // "Why this model?" dialog state
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [selectedSiteForDialog, setSelectedSiteForDialog] = useState(null);
  
  // Open "Why this model?" dialog for a site
  const openModelDialog = useCallback((site) => {
    setSelectedSiteForDialog(site);
    setShowModelDialog(true);
  }, []);
  
  // Recommended platform based on DC/Site counts
  const recommendedMode = useMemo(() => 
    getRecommendedPlatformMode(dataCenters.length, contextSites.length), 
    [dataCenters.length, contextSites.length]
  );
  
  // Handle platform mode change with confirmation for non-recommended
  const handlePlatformModeChange = useCallback((newMode) => {
    if (!newMode) return;
    
    // If switching to non-recommended platform, show confirmation
    if (newMode !== recommendedMode && platformMode === recommendedMode) {
      setPendingPlatformChange(newMode);
      setShowPlatformAlert(true);
    } else {
      setPlatformMode(newMode);
    }
  }, [recommendedMode, platformMode, setPlatformMode]);
  
  // Confirm platform change
  const confirmPlatformChange = useCallback(() => {
    if (pendingPlatformChange) {
      setPlatformMode(pendingPlatformChange);
      setPendingPlatformChange(null);
    }
    setShowPlatformAlert(false);
  }, [pendingPlatformChange, setPlatformMode]);
  
  // Cancel platform change
  const cancelPlatformChange = useCallback(() => {
    setPendingPlatformChange(null);
    setShowPlatformAlert(false);
  }, []);
  
  // Global settings
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;
  const securityEnabled = answers['feature-security'] === 'Yes';
  const uddiEnabled = answers['feature-uddi'] === 'Yes';
  
  // Get the IP Calculator value - this should be used for DC IPs
  const manualOverride = answers['ipam-1-override'] === 'true';
  const kwNum = parseInt(answers['ud-1']) || 0;
  const calculatedIPs = Math.round(kwNum * ipMultiplier);
  const manualIPs = parseInt(answers['ipam-1']) || 0;
  const ipCalcValue = manualOverride ? manualIPs : calculatedIPs;
  
  // Get role options based on platform mode
  const roleOptions = ROLE_OPTIONS_BY_MODE[platformMode] || ROLE_OPTIONS_BY_MODE.NIOS;
  const platformOptions = PLATFORM_OPTIONS_BY_MODE[platformMode] || PLATFORM_OPTIONS_BY_MODE.NIOS;
  
  // Create stable IDs for memoization
  const dataCenterIds = useMemo(() => dataCenters.map(dc => dc.id).join(','), [dataCenters]);
  const contextSiteIds = useMemo(() => contextSites.map(s => s.id).join(','), [contextSites]);
  
  // Build sites from Quick Capture + manual
  // DC sites use the IP Calculator value, branch sites use their own KW
  const sites = useMemo(() => {
    // First pass: Build basic site data without Hub/Spoke calculations
    const buildBasicSite = (source, index, type) => {
      const key = type === 'dataCenter' ? `dc-${source.id}` : `site-${source.id}`;
      const override = siteOverrides[key] || {};
      const kw = source.knowledgeWorkers || 0;
      
      // Determine default role based on platform mode and type
      let defaultRole = 'DNS/DHCP';
      if (type === 'dataCenter' && platformMode !== 'UDDI') {
        defaultRole = index === 0 ? 'GM' : 'GMC';
      }
      
      const role = override.role || defaultRole;
      const services = override.services || [];
      
      // Default platform based on mode
      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      const platform = override.platform || defaultPlatform;
      
      // Calculate IPs
      let numIPs;
      if (type === 'dataCenter') {
        numIPs = override.numIPs !== undefined ? override.numIPs : ipCalcValue;
        // Add service IPs to GM sizing
        const serviceCount = services.length;
        const serviceIPs = (role === 'GM' || role === 'GMC') ? serviceCount * 100 : 0;
        numIPs += serviceIPs;
      } else {
        const baseIPs = Math.round(kw * ipMultiplier);
        numIPs = override.numIPs !== undefined ? override.numIPs : baseIPs;
      }
      
      const dhcp = override.dhcpPercent ?? dhcpPercent;
      const dhcpPartner = override.dhcpPartner || null; // ID of the Hub site
      const serverCount = override.serverCount || 1;
      
      return {
        id: key,
        sourceId: source.id,
        sourceType: type,
        name: override.name || source.name || `${type === 'dataCenter' ? 'DC' : 'Site'} ${index + 1}`,
        numIPs,
        numIPsAuto: type === 'dataCenter' ? ipCalcValue : Math.round(kw * ipMultiplier),
        knowledgeWorkers: kw,
        role,
        services,
        platform,
        dhcpPercent: dhcp,
        dhcpPartner,
        serverCount,
      };
    };
    
    // Build all basic sites
    const dcSites = dataCenters.map((dc, i) => buildBasicSite(dc, i, 'dataCenter'));
    const branchSites = contextSites.map((site, i) => buildBasicSite(site, i, 'site'));
    const allBasicSites = [...dcSites, ...branchSites, ...manualSites.map((s, i) => ({
      ...s,
      dhcpPartner: siteOverrides[s.id]?.dhcpPartner || s.dhcpPartner || null,
      serverCount: siteOverrides[s.id]?.serverCount || s.serverCount || 1,
    }))];
    
    // Calculate Hub LPS for each potential Hub (sites with spokes pointing to them)
    const hubLPSMap = {};
    allBasicSites.forEach(site => {
      if (site.dhcpPartner) {
        // This site is a Spoke - add its LPS to the Hub
        const spokeLPS = calculateSiteLPS(site.numIPs, site.dhcpPercent, site.role);
        hubLPSMap[site.dhcpPartner] = (hubLPSMap[site.dhcpPartner] || 0) + spokeLPS;
      }
    });
    
    // Second pass: Calculate model/tokens with Hub/Spoke awareness
    return allBasicSites.map(site => {
      const isSpoke = !!site.dhcpPartner;
      const hubLPS = hubLPSMap[site.id] || 0;
      const isHub = hubLPS > 0;
      
      // Calculate recommended model with Hub/Spoke options
      const recommendedModel = getSiteRecommendedModel(
        site.numIPs, 
        site.role, 
        platformMode, 
        site.dhcpPercent, 
        leaseTimeSeconds, 
        site.platform,
        { isSpoke, hubLPS }
      );
      
      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);
      
      // Calculate tokens with service impact and server count
      const baseTokens = getTokensForModel(recommendedModel);
      const serviceImpact = getServiceImpact(site.services);
      const singleServerTokens = Math.ceil(baseTokens * (1 + serviceImpact / 100));
      const adjustedTokens = singleServerTokens * site.serverCount;
      
      return {
        ...site,
        recommendedModel,
        hardwareSku: siteOverrides[site.id]?.hardwareSku || defaultHardware,
        hardwareOptions,
        tokens: adjustedTokens,
        tokensPerServer: singleServerTokens,
        serviceImpact,
        isHub,
        isSpoke,
        hubLPS,
      };
    });
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, manualSites, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds, ipCalcValue]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalIPs = sites.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sites.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const infraTokens = sites.reduce((sum, s) => sum + (s.tokens || 0), 0);
    
    // Security tokens from answers
    const tdTokens = parseInt(answers['td-cloud-tokens']) || 0;
    const dossierTokens = parseInt(answers['dossier-tokens']) || 0;
    const lookalikeTokens = parseInt(answers['lookalike-tokens']) || 0;
    const socTokens = parseInt(answers['soc-insights-tokens']) || 0;
    const domainTokens = parseInt(answers['domain-takedown-tokens']) || 0;
    const reportingTokens = parseInt(answers['reporting-tokens']) || 0;
    const securityTokens = securityEnabled ? (tdTokens + dossierTokens + lookalikeTokens + socTokens + domainTokens + reportingTokens) : 0;
    const uddiTokens = uddiEnabled ? (parseInt(answers['uddi-tokens']) || 0) : 0;
    
    return {
      totalIPs, totalKW, infraTokens, securityTokens, uddiTokens,
      totalTokens: infraTokens + securityTokens + uddiTokens,
      gmCount: sites.filter(s => s.role === 'GM').length,
      gmcCount: sites.filter(s => s.role === 'GMC').length,
      memberCount: sites.filter(s => !['GM', 'GMC'].includes(s.role)).length,
    };
  }, [sites, answers, securityEnabled, uddiEnabled]);
  
  // Calculate GM Object Requirements (for NIOS platform)
  const gmSizing = useMemo(() => {
    if (platformMode === 'UDDI') return null; // UDDI doesn't have GM
    
    const discoveryEnabled = answers['feature-discovery'] === 'Yes';
    const gmObjects = calculateGMObjects(sites, dhcpPercent, discoveryEnabled);
    const recommendedGM = findMinimumGMModel(gmObjects.totalObjects);
    
    // Check for service warnings on GM sites
    const gmSites = sites.filter(s => s.role === 'GM' || s.role === 'GMC');
    const serviceWarnings = gmSites
      .filter(s => {
        const restriction = gmServiceRestrictions[s.recommendedModel];
        return restriction && !restriction.canRunServices;
      })
      .map(s => ({
        site: s.name,
        model: s.recommendedModel,
        warning: gmServiceRestrictions[s.recommendedModel]?.note,
      }));
    
    return {
      ...gmObjects,
      recommendedGM,
      serviceWarnings,
      memberCount: totals.memberCount,
    };
  }, [sites, dhcpPercent, platformMode, answers, totals.memberCount]);
  
  // Build BOM
  const bom = useMemo(() => {
    const bomItems = {};
    sites.forEach(site => {
      const sku = site.hardwareSku || 'N/A';
      if (sku !== 'N/A') {
        if (!bomItems[sku]) {
          bomItems[sku] = { sku, description: getSkuDescription(sku), quantity: 0, sites: [] };
        }
        bomItems[sku].quantity += 1;
        bomItems[sku].sites.push(site.name);
      }
    });
    return Object.values(bomItems);
  }, [sites]);
  
  const partnerSku = useMemo(() => getPartnerSkuFromTokens(totals.totalTokens), [totals.totalTokens]);
  
  // Update context with sizing summary for Quick Capture display
  useEffect(() => {
    setSizingSummary({
      totalTokens: totals.totalTokens,
      totalIPs: totals.totalIPs,
      partnerSku: partnerSku.sku,
      siteCount: sites.length,
      infraTokens: totals.infraTokens,
      securityTokens: totals.securityTokens,
    });
  }, [totals, partnerSku.sku, sites.length, setSizingSummary]);
  
  // Update site field
  const updateSite = useCallback((siteId, field, value) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    // Build the update object
    let updates = { [field]: value };
    
    // If role changes to non-DHCP, clear dhcpPartner
    if (field === 'role' && value !== 'DHCP' && value !== 'DNS/DHCP') {
      updates.dhcpPartner = null;
    }
    
    if (site.sourceType) {
      // Synced site - use overrides
      setSiteOverrides(prev => ({
        ...prev,
        [siteId]: { ...prev[siteId], ...updates }
      }));
    } else {
      // Manual site
      setManualSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s));
    }
  }, [sites]);
  
  // Add manual site
  const addManualSite = useCallback(() => {
    const newSite = {
      id: `manual-${Date.now()}`,
      name: `Site ${sites.length + 1}`,
      numIPs: 1000,
      numIPsAuto: 0,
      knowledgeWorkers: 0,
      role: 'DNS/DHCP',
      services: [],
      platform: platformMode === 'UDDI' ? 'NXVS' : 'NIOS',
      dhcpPercent,
      recommendedModel: 'TE-926',
      hardwareSku: 'TE-906-HW-2AC',
      hardwareOptions: ['TE-906-HW-2AC', 'TE-906-HW-AC'],
      tokens: 880,
      serviceImpact: 0,
    };
    setManualSites(prev => [...prev, newSite]);
  }, [sites.length, dhcpPercent, platformMode]);
  
  // Delete site
  const deleteSite = useCallback((siteId) => {
    setManualSites(prev => prev.filter(s => s.id !== siteId));
    setSiteOverrides(prev => {
      const next = { ...prev };
      delete next[siteId];
      return next;
    });
  }, []);
  
  // Toggle service for a site
  const toggleService = useCallback((siteId, serviceValue) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    const currentServices = site.services || [];
    const newServices = currentServices.includes(serviceValue)
      ? currentServices.filter(s => s !== serviceValue)
      : [...currentServices, serviceValue];
    
    updateSite(siteId, 'services', newServices);
  }, [sites, updateSite]);
  
  // Export to CSV
  const exportCSV = useCallback(() => {
    const headers = ['Location', 'Type', 'IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'];
    const rows = sites.map(s => [
      s.name, s.sourceType || 'Manual', s.numIPs, s.knowledgeWorkers, s.role, 
      (s.services || []).join(';') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens
    ]);
    rows.push(['TOTAL', '', totals.totalIPs, totals.totalKW, '', '', '', '', '', totals.infraTokens]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-sizing-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sites, totals]);
  
  // Export to YAML
  const exportYAML = useCallback(() => {
    const data = {
      summary: {
        totalSites: sites.length,
        totalIPs: totals.totalIPs,
        totalKW: totals.totalKW,
        totalTokens: totals.totalTokens,
        partnerSku: partnerSku.sku,
      },
      sites: sites.map(s => ({
        name: s.name,
        type: s.sourceType || 'manual',
        ips: s.numIPs,
        knowledgeWorkers: s.knowledgeWorkers,
        role: s.role,
        services: s.services || [],
        platform: s.platform,
        model: s.recommendedModel,
        hardwareSku: s.hardwareSku,
        tokens: s.tokens,
      })),
      bom: bom.map(b => ({ sku: b.sku, quantity: b.quantity, sites: b.sites })),
    };
    
    // Simple YAML formatting
    const yaml = `# Site Sizing Export\n# Generated: ${new Date().toISOString()}\n\nsummary:\n  totalSites: ${data.summary.totalSites}\n  totalIPs: ${data.summary.totalIPs}\n  totalKW: ${data.summary.totalKW}\n  totalTokens: ${data.summary.totalTokens}\n  partnerSku: ${data.summary.partnerSku}\n\nsites:\n${data.sites.map(s => `  - name: "${s.name}"\n    type: ${s.type}\n    ips: ${s.ips}\n    knowledgeWorkers: ${s.knowledgeWorkers}\n    role: ${s.role}\n    services: [${s.services.join(', ')}]\n    platform: ${s.platform}\n    model: ${s.model}\n    hardwareSku: ${s.hardwareSku}\n    tokens: ${s.tokens}`).join('\n')}\n\nbom:\n${data.bom.map(b => `  - sku: ${b.sku}\n    quantity: ${b.quantity}\n    sites: [${b.sites.map(s => `"${s}"`).join(', ')}]`).join('\n')}`;
    
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-sizing-export.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }, [sites, totals, partnerSku, bom]);
  
  // Export to Excel
  const exportExcel = useCallback(() => {
    // Site Sizing sheet
    const siteData = [
      ['Location', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'],
      ...sites.map(s => [
        s.name, s.sourceType || 'Manual', s.numIPs, s.knowledgeWorkers, s.role,
        (s.services || []).join(', ') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens
      ]),
      ['TOTAL', '', totals.totalIPs, totals.totalKW, '', '', '', '', '', totals.infraTokens]
    ];
    
    // BOM sheet
    const bomData = [
      ['Hardware SKU', 'Description', 'Quantity', 'Sites'],
      ...bom.map(b => [b.sku, b.description, b.quantity, b.sites.join(', ')])
    ];
    
    // Summary sheet
    const summaryData = [
      ['Summary', ''],
      ['Total Sites', sites.length],
      ['Total IPs', totals.totalIPs],
      ['Total Knowledge Workers', totals.totalKW],
      ['Infrastructure Tokens', totals.infraTokens],
      ['Security Tokens', totals.securityTokens],
      ['UDDI Tokens', totals.uddiTokens],
      ['Total Tokens', totals.totalTokens],
      ['Partner SKU', partnerSku.sku],
      ['Partner SKU Description', partnerSku.description],
      ['Platform Mode', platformMode],
      ['Generated', new Date().toISOString()]
    ];
    
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet(siteData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Site Sizing');
    
    const ws2 = XLSX.utils.aoa_to_sheet(bomData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Bill of Materials');
    
    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    
    XLSX.writeFile(wb, 'site-sizing-export.xlsx');
  }, [sites, totals, bom, partnerSku, platformMode]);
  
  // Export to PDF
  const exportPDF = useCallback(() => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Site Sizing Report', pageWidth / 2, 15, { align: 'center' });
    
    // Summary section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
    doc.text(`Platform Mode: ${platformMode} | Partner SKU: ${partnerSku.sku}`, pageWidth / 2, 28, { align: 'center' });
    
    // Summary boxes
    doc.setFontSize(9);
    const summaryY = 35;
    const boxWidth = 45;
    const boxGap = 5;
    const startX = (pageWidth - (4 * boxWidth + 3 * boxGap)) / 2;
    
    const summaryBoxes = [
      { label: 'Total Sites', value: sites.length.toString() },
      { label: 'Total IPs', value: totals.totalIPs.toLocaleString() },
      { label: 'Total Tokens', value: totals.totalTokens.toLocaleString() },
      { label: 'Partner SKU', value: partnerSku.sku },
    ];
    
    summaryBoxes.forEach((box, i) => {
      const x = startX + i * (boxWidth + boxGap);
      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, summaryY, boxWidth, 15, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(box.value, x + boxWidth / 2, summaryY + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(box.label, x + boxWidth / 2, summaryY + 12, { align: 'center' });
      doc.setFontSize(9);
    });
    
    // Site Sizing Table
    autoTable(doc, {
      startY: 55,
      head: [['Location', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'SKU', 'Tokens']],
      body: [
        ...sites.map(s => [
          s.name, s.sourceType || 'Manual', s.numIPs.toLocaleString(), s.knowledgeWorkers.toLocaleString(),
          s.role, (s.services || []).join(', ') || '-', s.platform, s.recommendedModel, s.hardwareSku, s.tokens.toLocaleString()
        ]),
        ['TOTAL', '', totals.totalIPs.toLocaleString(), totals.totalKW.toLocaleString(), '', '', '', '', '', totals.infraTokens.toLocaleString()]
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
        7: { cellWidth: 20 },
        8: { cellWidth: 30 },
        9: { cellWidth: 20, halign: 'right' },
      },
    });
    
    // BOM Table on new page if needed
    if (bom.length > 0) {
      const finalY = doc.lastAutoTable?.finalY || 55;
      if (finalY > 150) {
        doc.addPage();
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill of Materials', 14, finalY > 150 ? 15 : finalY + 15);
      
      autoTable(doc, {
        startY: finalY > 150 ? 22 : finalY + 22,
        head: [['Hardware SKU', 'Description', 'Qty', 'Sites']],
        body: bom.map(b => [b.sku, b.description, b.quantity.toString(), b.sites.slice(0, 5).join(', ') + (b.sites.length > 5 ? '...' : '')]),
        theme: 'striped',
        headStyles: { fillColor: [107, 114, 128], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 80 },
        },
      });
    }
    
    // Token Summary on new page
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Token Summary', 14, 15);
    
    autoTable(doc, {
      startY: 22,
      head: [['Category', 'Tokens', 'Status']],
      body: [
        ['Infrastructure', totals.infraTokens.toLocaleString(), 'Active'],
        ['Security', totals.securityTokens.toLocaleString(), securityEnabled ? 'Active' : 'Disabled'],
        ['UDDI', totals.uddiTokens.toLocaleString(), uddiEnabled ? 'Active' : 'Disabled'],
        ['TOTAL', totals.totalTokens.toLocaleString(), ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 30 },
      },
    });
    
    doc.save('site-sizing-export.pdf');
  }, [sites, totals, bom, partnerSku, platformMode, securityEnabled, uddiEnabled]);
  
  if (sites.length === 0 && dataCenters.length === 0 && contextSites.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Sites Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add Data Centers and Sites in the Quick Capture bar above, or add sites manually.
          </p>
          <Button onClick={addManualSite} data-testid="add-first-site">
            <Plus className="h-4 w-4 mr-2" /> Add Site
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="token-calculator-summary">
      {/* Platform Change Confirmation Alert */}
      <AlertDialog open={showPlatformAlert} onOpenChange={setShowPlatformAlert}>
        <AlertDialogContent data-testid="platform-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Non-Recommended Platform Selected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You are switching from <strong>{recommendedMode}</strong> (recommended) to <strong>{pendingPlatformChange}</strong>.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Why is {recommendedMode} recommended?</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Based on your configuration of <strong>{dataCenters.length} Data Centers</strong> and <strong>{contextSites.length} Sites</strong>:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-amber-700 dark:text-amber-300 space-y-1">
                    {recommendedMode === 'NIOS' && (
                      <>
                        <li>NIOS is ideal for smaller deployments (&lt;50 sites)</li>
                        <li>Provides traditional Grid Master/GMC architecture</li>
                        <li>Best for on-premises infrastructure</li>
                      </>
                    )}
                    {recommendedMode === 'UDDI' && (
                      <>
                        <li>UDDI is optimized for large distributed deployments (&gt;50 sites)</li>
                        <li>Cloud-native architecture with NIOS-X</li>
                        <li>Simplified management without Grid Master</li>
                      </>
                    )}
                    {recommendedMode === 'Hybrid' && (
                      <>
                        <li>Hybrid is recommended for multi-DC environments with 10+ sites</li>
                        <li>Combines on-premises Grid with cloud scalability</li>
                        <li>Flexible deployment options per site</li>
                      </>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Switching platforms will reset role assignments and may affect your sizing calculations.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPlatformChange} data-testid="platform-alert-cancel">
              Keep {recommendedMode}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPlatformChange} 
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="platform-alert-confirm"
            >
              Switch to {pendingPlatformChange}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Site Sizing Table - Responsive with auto-fit columns */}
      <Card>
        <CardContent className="pt-4 lg:pt-6">
          {/* Table Controls */}
          <div className="flex items-center justify-end mb-3 gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox 
                checked={showHardware} 
                onCheckedChange={setShowHardware}
                data-testid="show-hardware-toggle"
              />
              <span className="text-muted-foreground">Show Hardware SKU</span>
            </label>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-auto w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8 lg:w-10 text-xs lg:text-sm"></TableHead>
                  <TableHead className="text-xs lg:text-sm">Location</TableHead>
                  <TableHead className="w-20 lg:w-24 text-xs lg:text-sm"># IPs</TableHead>
                  <TableHead className="w-16 lg:w-20 text-xs lg:text-sm">KW</TableHead>
                  <TableHead className="w-24 lg:w-28 text-xs lg:text-sm">Role</TableHead>
                  <TableHead className="w-20 lg:w-24 text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Services <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Co-located services that can run on the same host. Each service adds performance overhead.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-24 lg:w-28 text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          DHCP Partner <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Select a Hub site for DHCP failover. Spokes forward DHCP to their Hub (50% LPS penalty).
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-14 lg:w-16 text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Srv# <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Number of identical servers at this location. Tokens multiply by server count.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-xs lg:text-sm">Platform</TableHead>
                  <TableHead className="w-16 lg:w-20 text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          Model <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          <p>Recommended server model based on workload.</p>
                          <p className="mt-1 text-muted-foreground">Hover on model for sizing details.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  {showHardware && <TableHead className="text-xs lg:text-sm">Hardware SKU</TableHead>}
                  <TableHead className="w-16 lg:w-20 text-right text-xs lg:text-sm">Tokens</TableHead>
                  <TableHead className="w-10 lg:w-12 text-xs lg:text-sm"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow key={site.id} data-testid={`site-row-${site.id}`} className={site.isHub ? 'bg-blue-50/50 dark:bg-blue-900/10' : site.isSpoke ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                    <TableCell className="p-2 lg:p-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="relative">
                              {site.sourceType === 'dataCenter' ? (
                                <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                              ) : site.sourceType === 'site' ? (
                                <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                              ) : (
                                <Server className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                              )}
                              {/* Hub/Spoke indicator badge */}
                              {site.isHub && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title="Hub" />
                              )}
                              {site.isSpoke && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" title="Spoke" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div>{site.sourceType === 'dataCenter' ? 'Data Center' : site.sourceType === 'site' ? 'Branch Site' : 'Manual Site'}</div>
                              {site.isHub && <div className="text-blue-500 font-medium">Hub - receives traffic from {sites.filter(s => s.dhcpPartner === site.id).length} spoke(s)</div>}
                              {site.isSpoke && <div className="text-amber-500 font-medium">Spoke - forwards to {sites.find(s => s.id === site.dhcpPartner)?.name}</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <Input
                        value={site.name}
                        onChange={e => updateSite(site.id, 'name', e.target.value)}
                        className="h-8 lg:h-10 text-sm lg:text-base"
                        data-testid={`site-name-${site.id}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={site.numIPs}
                          onChange={e => updateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
                          className="h-8 lg:h-10 text-sm lg:text-base w-20 lg:w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-testid={`site-ips-${site.id}`}
                        />
                        {site.numIPsAuto > 0 && site.numIPs !== site.numIPsAuto && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>Auto: {formatNumber(site.numIPsAuto)}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4 text-sm lg:text-base text-muted-foreground tabular-nums">
                      {formatNumber(site.knowledgeWorkers || 0)}
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <Select value={site.role} onValueChange={v => updateSite(site.id, 'role', v)}>
                        <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-role-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(o => (
                            <SelectItem key={o.value} value={o.value} title={o.description}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 lg:h-10 text-xs lg:text-sm w-full justify-between" data-testid={`site-services-${site.id}`}>
                            {(site.services?.length || 0) > 0 ? (
                              <span className="truncate">{site.services.length}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            <Settings2 className="h-3 w-3 lg:h-4 lg:w-4 ml-1 flex-shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="start">
                          <div className="space-y-3">
                            <div className="font-medium text-sm">Co-located Services</div>
                            <p className="text-xs text-muted-foreground">Select additional services running on this host. Each adds performance overhead.</p>
                            <div className="space-y-2">
                              {ADDITIONAL_SERVICES.map(svc => (
                                <div key={svc.value} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${site.id}-${svc.value}`}
                                    checked={(site.services || []).includes(svc.value)}
                                    onCheckedChange={() => toggleService(site.id, svc.value)}
                                    data-testid={`checkbox-${site.id}-${svc.value}`}
                                  />
                                  <label htmlFor={`${site.id}-${svc.value}`} className="flex-1 text-sm cursor-pointer">
                                    {svc.label}
                                    {svc.impact > 0 && (
                                      <span className="text-xs text-amber-600 ml-1">+{svc.impact}%</span>
                                    )}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {(site.serviceImpact || 0) > 0 && (
                              <div className="pt-2 border-t text-xs">
                                <span className="text-muted-foreground">Total overhead: </span>
                                <span className="font-medium text-amber-600">+{site.serviceImpact}%</span>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      {/* DHCP Partner - only for DHCP or DNS/DHCP roles */}
                      {(site.role === 'DHCP' || site.role === 'DNS/DHCP') ? (
                        <Select 
                          value={site.dhcpPartner || '__none__'} 
                          onValueChange={v => updateSite(site.id, 'dhcpPartner', v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-dhcp-partner-${site.id}`}>
                            <SelectValue>
                              {site.isHub ? (
                                <span className="text-blue-600 font-medium flex items-center gap-1">
                                  <Server className="h-3 w-3" /> Hub
                                </span>
                              ) : site.dhcpPartner ? (
                                <span className="text-amber-600">{sites.find(s => s.id === site.dhcpPartner)?.name || 'Spoke'}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None (Standalone)</SelectItem>
                            {/* Only show DHCP-capable sites as potential Hubs, exclude self and existing spokes */}
                            {sites.filter(s => 
                              s.id !== site.id && 
                              !s.isSpoke && 
                              (s.role === 'DHCP' || s.role === 'DNS/DHCP')
                            ).map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} {s.isHub && '(Hub)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      {/* Server Count */}
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={site.serverCount || 1}
                        onChange={e => updateSite(site.id, 'serverCount', Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 lg:h-10 text-sm w-14 lg:w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        data-testid={`site-server-count-${site.id}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <Select value={site.platform} onValueChange={v => updateSite(site.id, 'platform', v)}>
                        <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-platform-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {platformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <Badge variant="outline" className="font-mono text-xs lg:text-sm" data-testid={`site-model-${site.id}`}>
                              {site.recommendedModel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            {(() => {
                              const workload = getSiteWorkloadDetails(
                                site.numIPs, site.role, platformMode, dhcpPercent, 
                                site.platform, { isSpoke: site.isSpoke, hubLPS: site.hubLPS || 0 }
                              );
                              return (
                                <div className="space-y-2 text-xs">
                                  <div className="font-medium border-b pb-1">Sizing Details for {site.name}</div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div className={workload.driver === 'qps' ? 'font-bold text-blue-500' : ''}>
                                      QPS: {formatNumber(workload.adjustedQPS)}
                                      {workload.driver === 'qps' && <span className="ml-1">★</span>}
                                    </div>
                                    <div className={workload.driver === 'lps' ? 'font-bold text-blue-500' : ''}>
                                      LPS: {formatNumber(workload.adjustedLPS)}
                                      {workload.driver === 'lps' && <span className="ml-1">★</span>}
                                    </div>
                                    <div className={workload.driver === 'objects' ? 'font-bold text-blue-500' : ''}>
                                      Objects: {formatNumber(workload.objects)}
                                      {workload.driver === 'objects' && <span className="ml-1">★</span>}
                                    </div>
                                    <div className="text-muted-foreground">
                                      DHCP: {formatNumber(workload.dhcpClients)}
                                    </div>
                                  </div>
                                  {workload.penalties.length > 0 && (
                                    <div className="border-t pt-1 text-amber-600">
                                      <div className="font-medium">Penalties Applied:</div>
                                      {workload.penalties.map((p, i) => <div key={i}>• {p}</div>)}
                                    </div>
                                  )}
                                  <div className="border-t pt-1 text-muted-foreground">
                                    <span className="text-blue-500">★</span> = driver metric (why this model)
                                  </div>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    {showHardware && (
                      <TableCell className="p-2 lg:p-4">
                        <Select value={site.hardwareSku} onValueChange={v => updateSite(site.id, 'hardwareSku', v)}>
                          <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-sku-${site.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(site.hardwareOptions || [site.hardwareSku]).map(o => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell className="p-2 lg:p-4 text-right tabular-nums font-medium text-sm lg:text-base">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <div className="flex flex-col items-end">
                              <span>{formatNumber(site.tokens || 0)}</span>
                              {site.serverCount > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {site.serverCount} × {formatNumber(site.tokensPerServer || 0)}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              <div><strong>Base tokens:</strong> {formatNumber(site.tokensPerServer || 0)}</div>
                              {site.serverCount > 1 && (
                                <div><strong>Servers:</strong> ×{site.serverCount}</div>
                              )}
                              {(site.serviceImpact || 0) > 0 && (
                                <div><strong>Service overhead:</strong> +{site.serviceImpact}%</div>
                              )}
                              {site.isSpoke && (
                                <div className="text-amber-600"><strong>Spoke penalty:</strong> 50% LPS (sized up)</div>
                              )}
                              {site.isHub && (
                                <div className="text-blue-600"><strong>Hub load:</strong> +{site.hubLPS} LPS from spokes</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      {!site.sourceType && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={() => deleteSite(site.id)}>
                          <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="p-2 lg:p-4" colSpan={2}>Total</TableCell>
                  <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalIPs)}</TableCell>
                  <TableCell className="p-2 lg:p-4 tabular-nums text-sm lg:text-base">{formatNumber(totals.totalKW)}</TableCell>
                  <TableCell className="p-2 lg:p-4" colSpan={showHardware ? 6 : 5}></TableCell>
                  <TableCell className="p-2 lg:p-4 text-right tabular-nums text-sm lg:text-base">{formatNumber(totals.infraTokens)}</TableCell>
                  <TableCell className="p-2 lg:p-4"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Add Site Button */}
          <div className="flex items-center justify-between mt-4 lg:mt-6">
            <Button variant="outline" size="sm" className="text-xs lg:text-sm" onClick={addManualSite} data-testid="add-site-button">
              <Plus className="h-4 w-4 mr-1" /> Add Site
            </Button>
            <p className="text-xs lg:text-sm text-muted-foreground">
              <Info className="h-3 w-3 lg:h-4 lg:w-4 inline mr-1" />
              Sites auto-sync from Quick Capture. All fields are editable.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* BOM */}
      {bom.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 lg:h-5 lg:w-5" />
              Bill of Materials (BOM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table className="table-auto">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs lg:text-sm">Hardware SKU</TableHead>
                    <TableHead className="text-xs lg:text-sm">Description</TableHead>
                    <TableHead className="w-16 lg:w-20 text-center text-xs lg:text-sm">Qty</TableHead>
                    <TableHead className="text-xs lg:text-sm">Sites</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.map(item => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{item.quantity}</Badge></TableCell>
                      <TableCell className="text-sm">{item.sites.slice(0, 3).join(', ')}{item.sites.length > 3 && ` +${item.sites.length - 3}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* GM Object Sizing (NIOS only) */}
      {gmSizing && platformMode !== 'UDDI' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <Database className="h-4 w-4 lg:h-5 lg:w-5" />
              Grid Master Sizing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Service Warnings */}
              {gmSizing.serviceWarnings?.length > 0 && (
                <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <div className="font-medium mb-1">GM Service Restriction Warning</div>
                    {gmSizing.serviceWarnings.map((w, i) => (
                      <div key={i} className="text-sm">
                        <strong>{w.site}</strong> ({w.model}): {w.warning}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Object Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(gmSizing.totalObjects)}</div>
                  <div className="text-xs text-muted-foreground">Total Grid Objects</div>
                  <div className="text-[10px] text-muted-foreground mt-1">(with 10% buffer)</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{formatNumber(gmSizing.dhcpLeaseObjects)}</div>
                  <div className="text-xs text-muted-foreground">DHCP Lease Objects</div>
                  <div className="text-[10px] text-muted-foreground mt-1">clients × 2</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{formatNumber(gmSizing.dnsObjects)}</div>
                  <div className="text-xs text-muted-foreground">DNS Objects</div>
                  <div className="text-[10px] text-muted-foreground mt-1">DHCP×3 + Static×2</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{formatNumber(gmSizing.discoveryObjects)}</div>
                  <div className="text-xs text-muted-foreground">Discovery Objects</div>
                  <div className="text-[10px] text-muted-foreground mt-1">1 per active IP</div>
                </div>
              </div>
              
              {/* Recommended GM Model */}
              <div className={`rounded-lg p-4 ${gmSizing.recommendedGM.isOverCapacity ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' : 'bg-green-50 dark:bg-green-900/20 border border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      Minimum GM Model Required
                      {gmSizing.recommendedGM.isOverCapacity && (
                        <Badge variant="destructive" className="text-xs">Over Capacity</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(gmSizing.recommendedGM.effectiveCapacity)} effective capacity (60% of {formatNumber(gmSizing.recommendedGM.maxDbObj)})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current utilization: <span className={gmSizing.recommendedGM.utilization > 60 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{gmSizing.recommendedGM.utilization}%</span>
                      {' '}• Target: ≤60% at rollout
                    </p>
                  </div>
                  <Badge className={`text-lg px-4 py-1 ${gmSizing.recommendedGM.isOverCapacity ? 'bg-red-600' : ''}`}>
                    {gmSizing.recommendedGM.model}
                  </Badge>
                </div>
                {gmSizing.recommendedGM.warning && (
                  <p className="text-sm text-red-600 mt-2">{gmSizing.recommendedGM.warning}</p>
                )}
              </div>
              
              {/* GM Service Restriction Table */}
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-2">GM Service Restrictions (Running DNS/DHCP on GM):</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded px-2 py-1">
                    <div className="font-medium">TE-926</div>
                    <div className="text-green-700 dark:text-green-400">✓ OK</div>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded px-2 py-1">
                    <div className="font-medium">TE-1516</div>
                    <div className="text-yellow-700 dark:text-yellow-400">≤8 mbrs</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                    <div className="font-medium">TE-1526</div>
                    <div className="text-red-700 dark:text-red-400">✗ No</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                    <div className="font-medium">TE-2326</div>
                    <div className="text-red-700 dark:text-red-400">✗ No</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                    <div className="font-medium">TE-4126</div>
                    <div className="text-red-700 dark:text-red-400">✗ No</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Token Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Token Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="flex items-center gap-2"><Server className="h-4 w-4 text-blue-500" />Infrastructure</span>
              <span className="font-mono">{totals.infraTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" />Security {!securityEnabled && <Badge variant="outline" className="text-xs">Off</Badge>}</span>
              <span className="font-mono">{totals.securityTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-purple-500" />UDDI {!uddiEnabled && <Badge variant="outline" className="text-xs">Off</Badge>}</span>
              <span className="font-mono">{totals.uddiTokens.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Total Required</span>
              <span className="font-mono font-bold text-lg text-primary">{totals.totalTokens.toLocaleString()}</span>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 mt-2">
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

export default TokenCalculatorSummary;
