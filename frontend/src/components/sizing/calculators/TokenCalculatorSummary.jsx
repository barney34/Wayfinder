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
  getSwBaseSku,
  getSwPackage,
  getHwSkuInfo,
  getUnitGroup,
} from "@/lib/tokenData";

// Import extracted constants and utilities
import {
  PLATFORM_MODES,
  PLATFORM_OPTIONS_BY_MODE,
  ROLE_OPTIONS_BY_MODE,
  ADDITIONAL_SERVICES,
} from "./platformConfig";
import {
  getServiceImpact,
  getTokensForModel,
  getPartnerSkuFromTokens,
  getSkuDescription,
  getRecommendedPlatformMode,
} from "./tokenUtils";

// Re-export constants for backward compatibility
export { PLATFORM_MODES, PLATFORM_OPTIONS_BY_MODE, ROLE_OPTIONS_BY_MODE, ADDITIONAL_SERVICES };
export { getServiceImpact, getTokensForModel, getPartnerSkuFromTokens, getSkuDescription, getRecommendedPlatformMode };

/**
 * TokenCalculatorSummary Component
 * EDITABLE site sizing, token calculations, and export
 */
export function TokenCalculatorSummary() {
  const { 
    dataCenters = [], sites: contextSites = [], answers = {}, setAnswer, platformMode, setPlatformMode, setSizingSummary 
  } = useDiscovery();
  
  // Site overrides and manual sites state
  const [siteOverrides, setSiteOverrides] = useState({});
  const [manualSites, setManualSites] = useState([]);
  const lastSavedRef = useRef(null);
  
  // Drawing # for export
  const [drawingNumber, setDrawingNumber] = useState('');
  
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
      
      // In UDDI mode, force non-GM/GMC roles for any site
      let role = override.role || defaultRole;
      const isGmRole = role === 'GM' || role === 'GMC';
      const isDisabledInUddi = platformMode === 'UDDI' && isGmRole;
      
      // If UDDI mode and GM/GMC, keep the role but mark as disabled
      // When switching back, the role is preserved
      
      const services = override.services || [];
      
      // Default platform based on mode - auto-swap models
      let defaultPlatform = 'NIOS';
      if (platformMode === 'UDDI') defaultPlatform = 'NXVS';
      else if (platformMode === 'Hybrid' && type !== 'dataCenter') defaultPlatform = 'NXVS';
      
      // For non-GM/GMC sites in UDDI mode, use UDDI platform
      let platform = override.platform || defaultPlatform;
      if (platformMode === 'UDDI' && !isGmRole) {
        // Force UDDI platform options
        if (platform === 'NIOS' || platform === 'NIOS-V' || platform === 'NIOS-HA') {
          platform = 'NXVS';
        }
      }
      
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
        addToReport: override.addToReport !== undefined ? override.addToReport : true,
        addToBom: override.addToBom !== undefined ? override.addToBom : true,
        isDisabledInUddi, // New flag to gray out GM/GMC in UDDI mode
        originalRole: role, // Preserve for switching back
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
  
  // Export Drawing (matches target spreadsheet format)
  const exportDrawing = useCallback((sites, drawingNum) => {
    // Build rows in the target format
    const rows = [];
    let unitCounter = {};
    
    // Sort sites: GM first, then GMC, then by type
    const sortedSites = [...sites].sort((a, b) => {
      const roleOrder = { 'GM': 0, 'GMC': 1, 'DNS/DHCP': 2, 'DNS': 3, 'DHCP': 4 };
      return (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5);
    });
    
    sortedSites.forEach((site, idx) => {
      if (!site.addToReport) return; // Skip if not checked for report
      
      const unitGroup = getUnitGroup(site.role, site.sourceType);
      unitCounter[unitGroup] = (unitCounter[unitGroup] || 0) + 1;
      
      // Determine solution type
      let solution = 'NIOS';
      if (site.platform?.includes('NXVS') || site.platform?.includes('NXaaS')) {
        solution = 'UDDI';
      }
      if (site.role === 'GM' || site.role === 'GMC') {
        solution = 'NIOS';
      }
      
      // Get model info
      const model = site.recommendedModel || site.platform || 'TBD';
      
      // Get SKU info
      const swBaseSku = getSwBaseSku(model);
      const swPackage = getSwPackage(site.role, (site.services || []).includes('Discovery'));
      const hwInfo = getHwSkuInfo(model);
      
      // Build description from role and services
      let description = site.role || 'DNS/DHCP';
      if (site.services && site.services.length > 0) {
        description += ` + ${site.services.join(', ')}`;
      }
      if (site.name) {
        description = `${site.name} - ${description}`;
      }
      
      // SW Add-ons based on services
      const swAddons = [];
      if ((site.services || []).includes('DFP')) swAddons.push('ADP');
      if ((site.services || []).includes('NTP')) swAddons.push('NTP');
      
      rows.push({
        'Drawing #': drawingNum || '',
        'Unit Group': unitGroup,
        'Unit #/Range': site.serverCount > 1 ? `1-${site.serverCount}` : unitCounter[unitGroup].toString(),
        'Solution': solution,
        'Model Info': model,
        'SW Instances': site.serverCount || 1,
        'Description': description,
        'SW Base SKU': swBaseSku,
        'SW Package': swPackage,
        'SW Add-ons': swAddons.join(', ') || '',
        'HW License SKU': hwInfo.hwSku,
        'HW Add-ons': '',
        'HW Count': hwInfo.hwSku === 'VM' || hwInfo.hwSku === 'Cloud' ? 0 : site.serverCount || 1,
        'Add to Report': site.addToReport ? 'Yes' : 'No',
        'Add to BOM': site.addToBom ? 'Yes' : 'No',
      });
    });
    
    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Drawing #
      { wch: 10 }, // Unit Group
      { wch: 12 }, // Unit #/Range
      { wch: 10 }, // Solution
      { wch: 15 }, // Model Info
      { wch: 12 }, // SW Instances
      { wch: 35 }, // Description
      { wch: 18 }, // SW Base SKU
      { wch: 12 }, // SW Package
      { wch: 15 }, // SW Add-ons
      { wch: 18 }, // HW License SKU
      { wch: 12 }, // HW Add-ons
      { wch: 10 }, // HW Count
      { wch: 12 }, // Add to Report
      { wch: 12 }, // Add to BOM
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Drawing');
    XLSX.writeFile(wb, `${drawingNum || 'sizing'}-drawing-export.xlsx`);
  }, []);
  
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

      {/* "Why this model?" Dialog */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSiteForDialog && (() => {
            const site = selectedSiteForDialog;
            const workload = getSiteWorkloadDetails(
              site.numIPs, site.role, platformMode, dhcpPercent,
              site.platform, { isSpoke: site.isSpoke, hubLPS: site.hubLPS || 0 }
            );
            
            // Get server specs for comparison
            const isUDDI = site.platform === 'NXVS' || site.platform === 'NXaaS';
            const servers = isUDDI ? nxvsServers : niosServerGuardrails;
            const selectedServer = servers.find(s => 
              isUDDI ? s.serverSize === site.recommendedModel : s.model === site.recommendedModel
            );
            
            const utilization = niosGridConstants.maxDbUtilizationPercent / 100;
            const serverQPS = isUDDI ? selectedServer?.qps : selectedServer?.maxQPS;
            const serverLPS = isUDDI ? selectedServer?.lps : selectedServer?.maxLPS;
            const serverObj = isUDDI ? selectedServer?.objects : selectedServer?.maxDbObj;
            
            const qpsUtil = serverQPS ? Math.round((workload.adjustedQPS / (serverQPS * utilization)) * 100) : 0;
            const lpsUtil = serverLPS ? Math.round((workload.adjustedLPS / (serverLPS * utilization)) * 100) : 0;
            const objUtil = serverObj ? Math.round((workload.objects / (serverObj * utilization)) * 100) : 0;
            
            const driverLabels = {
              qps: 'Query Performance (QPS)',
              lps: 'Lease Performance (LPS)',
              objects: 'Database Capacity (Objects)',
            };
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-500" />
                    Why {site.recommendedModel} for {site.name}?
                  </DialogTitle>
                  <DialogDescription>
                    Detailed sizing breakdown and model selection rationale
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Site Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Site</div>
                      <div className="font-medium">{site.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Role</div>
                      <div className="font-medium">{site.role}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">IP Addresses</div>
                      <div className="font-medium">{formatNumber(site.numIPs)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">DHCP Clients ({dhcpPercent}%)</div>
                      <div className="font-medium">{formatNumber(workload.dhcpClients)}</div>
                    </div>
                  </div>
                  
                  {/* Driver Explanation */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-blue-500 fill-blue-500" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Model selected based on: {driverLabels[workload.driver]}
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {workload.driver === 'qps' && `This site requires ${formatNumber(workload.adjustedQPS)} QPS capacity, which is the limiting factor.`}
                      {workload.driver === 'lps' && `This site requires ${formatNumber(workload.adjustedLPS)} LPS capacity for DHCP operations, which is the limiting factor.`}
                      {workload.driver === 'objects' && `This site requires ${formatNumber(workload.objects)} database objects, which is the limiting factor.`}
                    </p>
                  </div>
                  
                  {/* Workload Requirements */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Workload Requirements
                    </h4>
                    <div className="space-y-3">
                      {/* QPS */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={workload.driver === 'qps' ? 'font-bold text-blue-600' : ''}>
                            QPS (Queries/sec) {workload.driver === 'qps' && '★'}
                          </span>
                          <span>{formatNumber(workload.adjustedQPS)} / {formatNumber(Math.round((serverQPS || 0) * utilization))} ({qpsUtil}%)</span>
                        </div>
                        <Progress value={Math.min(qpsUtil, 100)} className={`h-2 ${qpsUtil > 60 ? '[&>div]:bg-amber-500' : ''} ${qpsUtil > 80 ? '[&>div]:bg-red-500' : ''}`} />
                      </div>
                      
                      {/* LPS */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={workload.driver === 'lps' ? 'font-bold text-blue-600' : ''}>
                            LPS (Leases/sec) {workload.driver === 'lps' && '★'}
                          </span>
                          <span>{formatNumber(workload.adjustedLPS)} / {formatNumber(Math.round((serverLPS || 0) * utilization))} ({lpsUtil}%)</span>
                        </div>
                        <Progress value={Math.min(lpsUtil, 100)} className={`h-2 ${lpsUtil > 60 ? '[&>div]:bg-amber-500' : ''} ${lpsUtil > 80 ? '[&>div]:bg-red-500' : ''}`} />
                      </div>
                      
                      {/* Objects */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className={workload.driver === 'objects' ? 'font-bold text-blue-600' : ''}>
                            DB Objects {workload.driver === 'objects' && '★'}
                          </span>
                          <span>{formatNumber(workload.objects)} / {formatNumber(Math.round((serverObj || 0) * utilization))} ({objUtil}%)</span>
                        </div>
                        <Progress value={Math.min(objUtil, 100)} className={`h-2 ${objUtil > 60 ? '[&>div]:bg-amber-500' : ''} ${objUtil > 80 ? '[&>div]:bg-red-500' : ''}`} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Capacity shown at 60% target utilization (recommended headroom for growth)
                    </p>
                  </div>
                  
                  {/* Penalties Applied */}
                  {workload.penalties.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Penalties Applied
                      </h4>
                      <div className="space-y-2">
                        {workload.penalties.map((penalty, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>{penalty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Object Breakdown */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Archive className="h-4 w-4" /> Object Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-muted/30 rounded">
                        <div className="text-muted-foreground">DNS Objects</div>
                        <div className="font-medium">{formatNumber(workload.dnsObjects)}</div>
                        <div className="text-xs text-muted-foreground">DHCP×3 + Static×2</div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded">
                        <div className="text-muted-foreground">DHCP Lease Objects</div>
                        <div className="font-medium">{formatNumber(workload.dhcpObjects)}</div>
                        <div className="text-xs text-muted-foreground">Clients × 2</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Server Specs */}
                  {selectedServer && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Server className="h-4 w-4" /> {site.recommendedModel} Specifications
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">Max QPS</div>
                          <div className="font-medium">{formatNumber(serverQPS || 0)}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">Max LPS</div>
                          <div className="font-medium">{formatNumber(serverLPS || 0)}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded text-center">
                          <div className="text-muted-foreground">Max Objects</div>
                          <div className="font-medium">{formatNumber(serverObj || 0)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tokens */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-900 dark:text-green-100">Token Cost</div>
                        <div className="text-sm text-green-800 dark:text-green-200">
                          {site.serverCount > 1 ? `${site.serverCount} servers × ${formatNumber(site.tokensPerServer || 0)} tokens` : 'Per server'}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatNumber(site.tokens || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Site Sizing Table - Responsive with auto-fit columns */}
      <Card>
        <CardContent className="pt-4 lg:pt-6">
          {/* Table Controls */}
          <div className="flex items-center justify-between mb-3 gap-4">
            {/* Drawing Number Input */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Drawing #:</label>
              <Input
                value={drawingNumber}
                onChange={e => setDrawingNumber(e.target.value)}
                placeholder="Enter drawing number..."
                className="h-8 w-48 text-sm"
                data-testid="drawing-number-input"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox 
                  checked={showHardware} 
                  onCheckedChange={setShowHardware}
                  data-testid="show-hardware-toggle"
                />
                <span className="text-muted-foreground">Show Hardware SKU</span>
              </label>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportDrawing(sites, drawingNumber)}
                className="text-xs"
                data-testid="export-drawing-button"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Export Drawing
              </Button>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table className="table-auto w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-20 lg:w-24 text-xs lg:text-sm">Location</TableHead>
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
                  <TableHead className="w-12 text-center text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-center gap-1">
                          Rpt <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Include in exported report/drawing
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs lg:text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-center gap-1">
                          BOM <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Include in Bill of Materials
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-10 lg:w-12 text-xs lg:text-sm"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow 
                    key={site.id} 
                    data-testid={`site-row-${site.id}`} 
                    className={`
                      ${site.isDisabledInUddi ? 'opacity-40 bg-gray-100 dark:bg-gray-800/50' : ''}
                      ${!site.isDisabledInUddi && site.isHub ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} 
                      ${!site.isDisabledInUddi && site.isSpoke ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                    `}
                  >
                    <TableCell className="p-2 lg:p-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={site.name}
                          onChange={e => updateSite(site.id, 'name', e.target.value)}
                          className="h-8 lg:h-10 text-sm lg:text-base"
                          disabled={site.isDisabledInUddi}
                          data-testid={`site-name-${site.id}`}
                        />
                        {site.isDisabledInUddi && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[10px] px-1 bg-gray-200 dark:bg-gray-700">
                                  N/A
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                GM/GMC not available in UDDI mode. Switch to NIOS or Hybrid to edit.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={site.numIPs}
                          onChange={e => updateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
                          className="h-8 lg:h-10 text-sm lg:text-base w-20 lg:w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={site.isDisabledInUddi}
                          data-testid={`site-ips-${site.id}`}
                        />
                        {site.numIPsAuto > 0 && site.numIPs !== site.numIPsAuto && !site.isDisabledInUddi && (
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
                      <Select 
                        value={site.role} 
                        onValueChange={v => updateSite(site.id, 'role', v)}
                        disabled={site.isDisabledInUddi}
                      >
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 lg:h-10 text-xs lg:text-sm w-full justify-between" 
                            disabled={site.isDisabledInUddi}
                            data-testid={`site-services-${site.id}`}
                          >
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
                      {(site.role === 'DHCP' || site.role === 'DNS/DHCP') && !site.isDisabledInUddi ? (
                        <Select 
                          value={site.dhcpPartner || '__none__'} 
                          onValueChange={v => updateSite(site.id, 'dhcpPartner', v === '__none__' ? null : v)}
                          disabled={site.isDisabledInUddi}
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
                        disabled={site.isDisabledInUddi}
                        data-testid={`site-server-count-${site.id}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <Select 
                        value={site.platform} 
                        onValueChange={v => updateSite(site.id, 'platform', v)}
                        disabled={site.isDisabledInUddi}
                      >
                        <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-platform-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {platformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 lg:p-4">
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                <Badge variant={site.isDisabledInUddi ? "secondary" : "outline"} className="font-mono text-xs lg:text-sm" data-testid={`site-model-${site.id}`}>
                                  {site.isDisabledInUddi ? '—' : site.recommendedModel}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              {site.isDisabledInUddi ? (
                                <div className="text-xs">GM/GMC not available in UDDI mode</div>
                              ) : (() => {
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
                                      <span className="text-blue-500">★</span> = driver metric
                                    </div>
                                  </div>
                                );
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => openModelDialog(site)}
                          data-testid={`why-model-${site.id}`}
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-blue-500" />
                        </Button>
                      </div>
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
                    {/* Add to Report checkbox */}
                    <TableCell className="p-2 lg:p-4 text-center">
                      <Checkbox
                        checked={site.addToReport}
                        onCheckedChange={v => updateSite(site.id, 'addToReport', v)}
                        data-testid={`site-report-${site.id}`}
                      />
                    </TableCell>
                    {/* Add to BOM checkbox */}
                    <TableCell className="p-2 lg:p-4 text-center">
                      <Checkbox
                        checked={site.addToBom}
                        onCheckedChange={v => updateSite(site.id, 'addToBom', v)}
                        data-testid={`site-bom-${site.id}`}
                      />
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
    </div>
  );
}

export default TokenCalculatorSummary;
