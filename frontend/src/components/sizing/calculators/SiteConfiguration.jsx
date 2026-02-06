import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { Plus, X, Info, Building2, MapPin, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import {
  getSiteRecommendedModel,
  getHardwareSkuOptions,
  getDefaultHardwareSku,
  isHardwareSkuLocked,
} from "../calculations";
import { niosGridConstants } from "@/lib/tokenData";

// Platform options for site configuration
const PLATFORM_OPTIONS = [
  { value: 'NIOS', label: 'NIOS (Physical/Virtual)' },
  { value: 'NIOS-HA', label: 'NIOS HA Pair' },
  { value: 'NX', label: 'NIOS-X Virtual Server' },
  { value: 'NXaaS', label: 'NIOS-X as a Service' },
];

// Role options
const ROLE_OPTIONS = [
  { value: 'GM', label: 'Grid Master' },
  { value: 'GMC', label: 'Grid Master Candidate' },
  { value: 'DNS', label: 'DNS Only' },
  { value: 'DHCP', label: 'DHCP Only' },
  { value: 'DNS/DHCP', label: 'DNS + DHCP' },
];

/**
 * SiteConfiguration Component
 * Integrates with Quick Capture bar data to automatically populate and size sites
 */
export function SiteConfiguration({ value, onChange, questionId }) {
  const { dataCenters, sites: contextSites, answers, updateSite } = useDiscovery();
  
  // Parse local site configuration (for manual additions or overrides)
  const [localConfig, setLocalConfig] = useState(() => {
    try {
      return value ? JSON.parse(value) : { sites: [], autoSync: true };
    } catch {
      return { sites: [], autoSync: true };
    }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Global settings
  const globalPlatform = answers['ud-platform'] || 'NIOS (Physical/Virtual)';
  const dhcpPercent = parseInt(answers['dhcp-0-pct']) || 80;
  const leaseTimeSeconds = parseInt(answers['dhcp-3']) || 86400;
  const knowledgeWorkers = parseInt(answers['ud-1']) || 0;
  const ipMultiplier = parseFloat(answers['ipam-multiplier']) || 2.5;
  
  // Merge Quick Capture data with local configuration
  const mergedSites = useMemo(() => {
    if (!localConfig.autoSync) {
      return localConfig.sites;
    }
    
    // Start with Data Centers (they become GM/GMC candidates)
    const dcSites = dataCenters.map((dc, index) => {
      const existing = localConfig.sites.find(s => s.sourceId === dc.id);
      const kw = dc.knowledgeWorkers || 0;
      const numIPs = Math.round(kw * ipMultiplier);
      
      return {
        id: existing?.id || `dc-site-${dc.id}`,
        sourceId: dc.id,
        sourceType: 'dataCenter',
        name: dc.name || `Data Center ${index + 1}`,
        numIPs: existing?.numIPsOverride ? existing.numIPs : numIPs,
        numIPsOverride: existing?.numIPsOverride || false,
        role: existing?.role || (index === 0 ? 'GM' : 'GMC'),
        platform: existing?.platform || 'NIOS',
        dhcpPercent: existing?.dhcpPercent ?? dhcpPercent,
        hardwareSku: existing?.hardwareSku || '',
        knowledgeWorkers: kw,
      };
    });
    
    // Add branch/remote sites from context
    const branchSites = contextSites.map((site, index) => {
      const existing = localConfig.sites.find(s => s.sourceId === site.id);
      const kw = site.knowledgeWorkers || 0;
      const numIPs = Math.round(kw * ipMultiplier);
      
      return {
        id: existing?.id || `branch-site-${site.id}`,
        sourceId: site.id,
        sourceType: 'site',
        name: site.name || `Site ${index + 1}`,
        numIPs: existing?.numIPsOverride ? existing.numIPs : numIPs,
        numIPsOverride: existing?.numIPsOverride || false,
        role: existing?.role || 'DNS/DHCP',
        platform: existing?.platform || (globalPlatform.includes('UDDI') ? 'NX' : 'NIOS'),
        dhcpPercent: existing?.dhcpPercent ?? dhcpPercent,
        hardwareSku: existing?.hardwareSku || '',
        knowledgeWorkers: kw,
      };
    });
    
    // Add any manual sites
    const manualSites = localConfig.sites.filter(s => !s.sourceType);
    
    return [...dcSites, ...branchSites, ...manualSites];
  }, [dataCenters, contextSites, localConfig, ipMultiplier, dhcpPercent, globalPlatform]);

  // Calculate recommended models for each site
  const sitesWithRecommendations = useMemo(() => {
    return mergedSites.map(site => {
      const recommendedModel = getSiteRecommendedModel(
        site.numIPs,
        site.role,
        globalPlatform,
        site.dhcpPercent,
        leaseTimeSeconds,
        site.platform
      );
      
      const hardwareOptions = getHardwareSkuOptions(recommendedModel);
      const defaultHardware = getDefaultHardwareSku(recommendedModel);
      const isLocked = isHardwareSkuLocked(recommendedModel);
      
      return {
        ...site,
        recommendedModel,
        hardwareOptions,
        defaultHardware,
        isSkuLocked: isLocked,
        hardwareSku: site.hardwareSku || defaultHardware,
      };
    });
  }, [mergedSites, globalPlatform, leaseTimeSeconds]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalIPs = sitesWithRecommendations.reduce((sum, s) => sum + (s.numIPs || 0), 0);
    const totalKW = sitesWithRecommendations.reduce((sum, s) => sum + (s.knowledgeWorkers || 0), 0);
    const gmCount = sitesWithRecommendations.filter(s => s.role === 'GM').length;
    const gmcCount = sitesWithRecommendations.filter(s => s.role === 'GMC').length;
    const memberCount = sitesWithRecommendations.filter(s => !['GM', 'GMC'].includes(s.role)).length;
    
    return { totalIPs, totalKW, gmCount, gmcCount, memberCount };
  }, [sitesWithRecommendations]);

  // Persist changes
  useEffect(() => {
    const config = {
      sites: sitesWithRecommendations.map(s => ({
        id: s.id,
        sourceId: s.sourceId,
        sourceType: s.sourceType,
        name: s.name,
        numIPs: s.numIPs,
        numIPsOverride: s.numIPsOverride,
        role: s.role,
        platform: s.platform,
        dhcpPercent: s.dhcpPercent,
        hardwareSku: s.hardwareSku,
        knowledgeWorkers: s.knowledgeWorkers,
        recommendedModel: s.recommendedModel,
      })),
      autoSync: localConfig.autoSync,
    };
    onChange(JSON.stringify(config));
  }, [sitesWithRecommendations, localConfig.autoSync]);

  // Update a site's configuration
  const handleSiteUpdate = (siteId, field, value) => {
    setLocalConfig(prev => {
      const existingIdx = prev.sites.findIndex(s => s.id === siteId);
      let updatedSites;
      
      if (existingIdx >= 0) {
        updatedSites = prev.sites.map(s => 
          s.id === siteId ? { ...s, [field]: value } : s
        );
      } else {
        // Find the site from merged list and add to local config
        const siteToCopy = mergedSites.find(s => s.id === siteId);
        if (siteToCopy) {
          updatedSites = [...prev.sites, { ...siteToCopy, [field]: value }];
        } else {
          return prev;
        }
      }
      
      // Handle IP override toggle
      if (field === 'numIPsOverride' && value === true) {
        const siteIdx = updatedSites.findIndex(s => s.id === siteId);
        if (siteIdx >= 0) {
          updatedSites[siteIdx].numIPsOverride = true;
        }
      }
      
      return { ...prev, sites: updatedSites };
    });
  };

  // Add a manual site
  const handleAddManualSite = () => {
    const newSite = {
      id: `manual-${Date.now()}`,
      name: `Manual Site ${localConfig.sites.filter(s => !s.sourceType).length + 1}`,
      numIPs: 1000,
      numIPsOverride: true,
      role: 'DNS/DHCP',
      platform: globalPlatform.includes('UDDI') ? 'NX' : 'NIOS',
      dhcpPercent: dhcpPercent,
      hardwareSku: '',
      knowledgeWorkers: 0,
    };
    
    setLocalConfig(prev => ({
      ...prev,
      sites: [...prev.sites, newSite],
    }));
  };

  // Remove a manual site
  const handleRemoveSite = (siteId) => {
    setLocalConfig(prev => ({
      ...prev,
      sites: prev.sites.filter(s => s.id !== siteId),
    }));
  };

  // Get icon for source type
  const getSourceIcon = (site) => {
    if (site.sourceType === 'dataCenter') return <Building2 className="h-3.5 w-3.5 text-blue-500" />;
    if (site.sourceType === 'site') return <MapPin className="h-3.5 w-3.5 text-green-500" />;
    return <Settings2 className="h-3.5 w-3.5 text-gray-500" />;
  };

  return (
    <div className="space-y-4" data-testid={`site-configuration-${questionId}`}>
      {/* Summary Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{sitesWithRecommendations.length}</p>
                <p className="text-xs text-muted-foreground">Total Sites</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totals.totalIPs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total IPs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totals.totalKW.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total KW</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" /> {dataCenters.length} DCs
              </Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" /> {contextSites.length} Sites
              </Badge>
              {totals.gmCount > 0 && <Badge variant="secondary">{totals.gmCount} GM</Badge>}
              {totals.gmcCount > 0 && <Badge variant="secondary">{totals.gmcCount} GMC</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sites Table */}
      {sitesWithRecommendations.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Site Name</TableHead>
                <TableHead className="w-[100px]"># IPs</TableHead>
                <TableHead className="w-[100px]">KW</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                <TableHead className="w-[140px]">Platform</TableHead>
                <TableHead className="w-[80px]">DHCP %</TableHead>
                <TableHead className="w-[100px]">Recommended</TableHead>
                <TableHead className="w-[140px]">Hardware SKU</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sitesWithRecommendations.map(site => (
                <TableRow key={site.id} className="hover:bg-muted/30" data-testid={`site-row-${site.id}`}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>{getSourceIcon(site)}</TooltipTrigger>
                        <TooltipContent>
                          {site.sourceType === 'dataCenter' && 'From Quick Capture (Data Center)'}
                          {site.sourceType === 'site' && 'From Quick Capture (Site)'}
                          {!site.sourceType && 'Manually Added'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={site.name} 
                      onChange={e => handleSiteUpdate(site.id, 'name', e.target.value)}
                      className="h-8 text-sm"
                      data-testid={`site-name-${site.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input 
                        type="number"
                        value={site.numIPs}
                        onChange={e => {
                          handleSiteUpdate(site.id, 'numIPs', parseInt(e.target.value) || 0);
                          handleSiteUpdate(site.id, 'numIPsOverride', true);
                        }}
                        className={`h-8 text-sm w-20 ${site.numIPsOverride ? 'border-amber-400' : ''}`}
                        data-testid={`site-ips-${site.id}`}
                      />
                      {site.numIPsOverride && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Manual override (not auto-calculated)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {(site.knowledgeWorkers || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={site.role} 
                      onValueChange={v => handleSiteUpdate(site.id, 'role', v)}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`site-role-${site.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={site.platform} 
                      onValueChange={v => handleSiteUpdate(site.id, 'platform', v)}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`site-platform-${site.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={site.dhcpPercent}
                      onChange={e => handleSiteUpdate(site.id, 'dhcpPercent', parseInt(e.target.value) || 0)}
                      className="h-8 text-sm w-16"
                      data-testid={`site-dhcp-${site.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {site.recommendedModel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {site.isSkuLocked ? (
                      <span className="text-xs text-muted-foreground font-mono">{site.hardwareSku}</span>
                    ) : (
                      <Select 
                        value={site.hardwareSku || site.defaultHardware}
                        onValueChange={v => handleSiteUpdate(site.id, 'hardwareSku', v)}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid={`site-hardware-${site.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {site.hardwareOptions.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {!site.sourceType && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => handleRemoveSite(site.id)}
                        data-testid={`remove-site-${site.id}`}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center bg-muted/20">
          <p className="text-sm text-muted-foreground mb-3">
            No sites configured. Add Data Centers and Sites in the Quick Capture bar above, or add sites manually.
          </p>
        </div>
      )}

      {/* Add Manual Site Button */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddManualSite}
          data-testid="add-manual-site"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Site Manually
        </Button>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>Sites auto-sync from Quick Capture. Edit IPs or role to override.</span>
        </div>
      </div>

      {/* Sizing Info Card */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Sizing Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-xs text-muted-foreground space-y-1">
          <p>• IPs auto-calculated as: Knowledge Workers × {ipMultiplier} (IP Multiplier)</p>
          <p>• GM/GMC are sized for total grid objects ({niosGridConstants.maxDbUtilizationPercent}% utilization target)</p>
          <p>• DNS/DHCP members sized by peak QPS (IPs ÷ {niosGridConstants.peakQpsDivisor}) and LPS</p>
          <p>• DHCP %: {dhcpPercent}% | Lease Time: {Math.round(leaseTimeSeconds / 3600)}h</p>
        </CardContent>
      </Card>
    </div>
  );
}
