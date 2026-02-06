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
  Building2, MapPin, Server, Package, DollarSign, Cpu, HardDrive, Shield, BarChart3,
  Plus, Trash2, Download, FileText, Info, AlertTriangle, Star, Settings2, FileSpreadsheet
} from "lucide-react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { 
  getSiteRecommendedModel,
  getDefaultHardwareSku,
  getHardwareSkuOptions,
  isHardwareSkuLocked,
} from "../calculations";
import { 
  niosServerGuardrails, 
  uddiServerTokens,
  tokenModels,
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
    dataCenters = [], sites: contextSites = [], answers = {}, setAnswer 
  } = useDiscovery();
  
  // Platform mode state (NIOS/UDDI/Hybrid)
  const [platformMode, setPlatformMode] = useState('NIOS');
  const [siteOverrides, setSiteOverrides] = useState({});
  const [manualSites, setManualSites] = useState([]);
  const lastSavedRef = useRef(null);
  
  // Alert dialog state for platform change confirmation
  const [showPlatformAlert, setShowPlatformAlert] = useState(false);
  const [pendingPlatformChange, setPendingPlatformChange] = useState(null);
  
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
  }, [recommendedMode, platformMode]);
  
  // Confirm platform change
  const confirmPlatformChange = useCallback(() => {
    if (pendingPlatformChange) {
      setPlatformMode(pendingPlatformChange);
      setPendingPlatformChange(null);
    }
    setShowPlatformAlert(false);
  }, [pendingPlatformChange]);
  
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
  
  // Get role options based on platform mode
  const roleOptions = ROLE_OPTIONS_BY_MODE[platformMode] || ROLE_OPTIONS_BY_MODE.NIOS;
  const platformOptions = PLATFORM_OPTIONS_BY_MODE[platformMode] || PLATFORM_OPTIONS_BY_MODE.NIOS;
  
  // Create stable IDs for memoization
  const dataCenterIds = useMemo(() => dataCenters.map(dc => dc.id).join(','), [dataCenters]);
  const contextSiteIds = useMemo(() => contextSites.map(s => s.id).join(','), [contextSites]);
  
  // Build sites from Quick Capture + manual
  // Note: For NIOS/Hybrid, GM and GMC use KW directly (not IPs)
  const sites = useMemo(() => {
    const dcSites = dataCenters.map((dc, index) => {
      const key = `dc-${dc.id}`;
      const override = siteOverrides[key] || {};
      const kw = dc.knowledgeWorkers || 0;
      const baseIPs = Math.round(kw * ipMultiplier);
      
      // Determine default role based on platform mode
      let defaultRole = 'DNS/DHCP';
      if (platformMode !== 'UDDI') {
        defaultRole = index === 0 ? 'GM' : 'GMC';
      }
      
      const role = override.role || defaultRole;
      const services = override.services || [];
      
      // Default platform based on mode
      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      const platform = override.platform || defaultPlatform;
      
      // For GM/GMC in NIOS/Hybrid, IPs = KW (grid objects)
      const isGridRole = role === 'GM' || role === 'GMC';
      const numIPs = override.numIPs !== undefined 
        ? override.numIPs 
        : (isGridRole && platformMode !== 'UDDI' ? kw : baseIPs);
      
      const dhcp = override.dhcpPercent ?? dhcpPercent;
      
      const recommendedModel = getSiteRecommendedModel(numIPs, role, platformMode, dhcp, leaseTimeSeconds, platform);
      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);
      
      // Calculate tokens with service impact
      const baseTokens = getTokensForModel(recommendedModel);
      const serviceImpact = getServiceImpact(services);
      const adjustedTokens = Math.ceil(baseTokens * (1 + serviceImpact / 100));
      
      return {
        id: key,
        sourceId: dc.id,
        sourceType: 'dataCenter',
        name: override.name || dc.name || `DC ${index + 1}`,
        numIPs,
        numIPsAuto: baseIPs,
        knowledgeWorkers: kw,
        role,
        services,
        platform,
        dhcpPercent: dhcp,
        recommendedModel,
        hardwareSku: override.hardwareSku || defaultHardware,
        hardwareOptions,
        tokens: adjustedTokens,
        serviceImpact,
      };
    });
    
    const branchSites = contextSites.map((site, index) => {
      const key = `site-${site.id}`;
      const override = siteOverrides[key] || {};
      const kw = site.knowledgeWorkers || 0;
      const baseIPs = Math.round(kw * ipMultiplier);
      const numIPs = override.numIPs !== undefined ? override.numIPs : baseIPs;
      const role = override.role || 'DNS/DHCP';
      const services = override.services || [];
      
      // Default platform based on mode
      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      const platform = override.platform || defaultPlatform;
      const dhcp = override.dhcpPercent ?? dhcpPercent;
      
      const recommendedModel = getSiteRecommendedModel(numIPs, role, platformMode, dhcp, leaseTimeSeconds, platform);
      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);
      
      // Calculate tokens with service impact
      const baseTokens = getTokensForModel(recommendedModel);
      const serviceImpact = getServiceImpact(services);
      const adjustedTokens = Math.ceil(baseTokens * (1 + serviceImpact / 100));
      
      return {
        id: key,
        sourceId: site.id,
        sourceType: 'site',
        name: override.name || site.name || `Site ${index + 1}`,
        numIPs,
        numIPsAuto: baseIPs,
        knowledgeWorkers: kw,
        role,
        services,
        platform,
        dhcpPercent: dhcp,
        recommendedModel,
        hardwareSku: override.hardwareSku || defaultHardware,
        hardwareOptions,
        tokens: adjustedTokens,
        serviceImpact,
      };
    });
    
    return [...dcSites, ...branchSites, ...manualSites];
  }, [dataCenterIds, contextSiteIds, dataCenters, contextSites, siteOverrides, manualSites, ipMultiplier, dhcpPercent, platformMode, leaseTimeSeconds]);
  
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
  
  // Update site field
  const updateSite = useCallback((siteId, field, value) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;
    
    if (site.sourceType) {
      // Synced site - use overrides
      setSiteOverrides(prev => ({
        ...prev,
        [siteId]: { ...prev[siteId], [field]: value }
      }));
    } else {
      // Manual site
      setManualSites(prev => prev.map(s => s.id === siteId ? { ...s, [field]: value } : s));
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
    const headers = ['Site Name', 'Type', 'IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'];
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
      ['Site Name', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'Hardware SKU', 'Tokens'],
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
    doc.autoTable({
      startY: 55,
      head: [['Site Name', 'Type', '# IPs', 'KW', 'Role', 'Services', 'Platform', 'Model', 'SKU', 'Tokens']],
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
      
      doc.autoTable({
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
    
    doc.autoTable({
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

      {/* Platform Mode Toggle */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Platform Mode:</span>
              <ToggleGroup type="single" value={platformMode} onValueChange={handlePlatformModeChange} className="bg-muted rounded-lg p-1">
                {PLATFORM_MODES.map(mode => (
                  <ToggleGroupItem 
                    key={mode.value} 
                    value={mode.value} 
                    className="px-4 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    data-testid={`platform-mode-${mode.value.toLowerCase()}`}
                  >
                    {mode.value === recommendedMode && <Star className="h-3 w-3 mr-1 inline" />}
                    {mode.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {platformMode !== recommendedMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-amber-600 border-amber-500 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Not Recommended
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Based on {dataCenters.length} DCs and {contextSites.length} sites, we recommend <strong>{recommendedMode}</strong>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {PLATFORM_MODES.find(m => m.value === platformMode)?.description}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Sites</span>
            </div>
            <p className="text-2xl font-bold">{sites.length}</p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {totals.gmCount > 0 && <Badge variant="default" className="text-xs">{totals.gmCount} GM</Badge>}
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
            <p className="text-xs text-muted-foreground mt-1">{totals.totalKW.toLocaleString()} KW</p>
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
              Infra: {totals.infraTokens.toLocaleString()}
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
      
      {/* EDITABLE Site Sizing Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Site Sizing Recommendations
            </CardTitle>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="export-dropdown">
                    <Download className="h-3 w-3 mr-1" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCSV} data-testid="export-csv">
                    <FileText className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportExcel} data-testid="export-excel">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportPDF} data-testid="export-pdf">
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportYAML} data-testid="export-yaml">
                    <FileText className="h-4 w-4 mr-2" />
                    Export as YAML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead className="min-w-[120px]">Site Name</TableHead>
                  <TableHead className="w-[80px]"># IPs</TableHead>
                  <TableHead className="w-[60px]">KW</TableHead>
                  <TableHead className="w-[90px]">Role</TableHead>
                  <TableHead className="w-[80px]">
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
                  <TableHead className="w-[100px]">Platform</TableHead>
                  <TableHead className="w-[80px]">Model</TableHead>
                  <TableHead className="w-[120px]">Hardware SKU</TableHead>
                  <TableHead className="w-[70px] text-right">Tokens</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow key={site.id} data-testid={`site-row-${site.id}`}>
                    <TableCell>
                      {site.sourceType === 'dataCenter' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : site.sourceType === 'site' ? (
                        <MapPin className="h-4 w-4 text-green-500" />
                      ) : (
                        <Server className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={site.name}
                        onChange={e => updateSite(site.id, 'name', e.target.value)}
                        className="h-7 text-sm"
                        data-testid={`site-name-${site.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={site.numIPs}
                          onChange={e => updateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
                          className="h-7 text-sm w-[70px]"
                          data-testid={`site-ips-${site.id}`}
                        />
                        {site.numIPsAuto > 0 && site.numIPs !== site.numIPsAuto && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>Auto: {site.numIPsAuto.toLocaleString()}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {(site.knowledgeWorkers || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select value={site.role} onValueChange={v => updateSite(site.id, 'role', v)}>
                        <SelectTrigger className="h-7 text-xs" data-testid={`site-role-${site.id}`}>
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
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-between" data-testid={`site-services-${site.id}`}>
                            {(site.services?.length || 0) > 0 ? (
                              <span className="truncate">{site.services.join(', ')}</span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                            <Settings2 className="h-3 w-3 ml-1 flex-shrink-0" />
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
                    <TableCell>
                      <Select value={site.platform} onValueChange={v => updateSite(site.id, 'platform', v)}>
                        <SelectTrigger className="h-7 text-xs" data-testid={`site-platform-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {platformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{site.recommendedModel}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={site.hardwareSku} onValueChange={v => updateSite(site.id, 'hardwareSku', v)}>
                        <SelectTrigger className="h-7 text-xs" data-testid={`site-sku-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(site.hardwareOptions || [site.hardwareSku]).map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {(site.tokens || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {!site.sourceType && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteSite(site.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="tabular-nums">{totals.totalIPs.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{totals.totalKW.toLocaleString()}</TableCell>
                  <TableCell colSpan={5}></TableCell>
                  <TableCell className="text-right tabular-nums">{totals.infraTokens.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Add Site Button */}
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={addManualSite} data-testid="add-site-button">
              <Plus className="h-4 w-4 mr-1" /> Add Site
            </Button>
            <p className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Sites auto-sync from Quick Capture. All fields are editable.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* BOM */}
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
                    <TableHead className="w-[60px] text-center">Qty</TableHead>
                    <TableHead>Sites</TableHead>
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
