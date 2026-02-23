/**
 * SiteTableRow - Individual site row in the sizing table
 * Column order matches export: Location, IPs, KW?, Role, Services?, DHCP Partner, Srv#, HA, Platform, Model, HW SKU?, SW#, HW#, Tokens?, Rpt, BOM, Actions
 */
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Info, Settings2, HelpCircle, Server, Copy, Plus } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ADDITIONAL_SERVICES, SW_ADDONS, HW_ADDONS, RPT_QUANTITIES, getAvailableSwAddons, getAvailableHwAddons } from "./platformConfig";
import { getSiteWorkloadDetails } from "../calculations";
import { CopySiteToDrawingMenu } from "./DrawingManager";

// Calculate token packs (500K per pack, rounded up)
const TOKENS_PER_PACK = 500000;
function calculateTokenPacks(tokens) {
  if (!tokens || tokens <= 0) return 0;
  return Math.ceil(tokens / TOKENS_PER_PACK);
}

export function SiteTableRow({
  site, sites, drawings, activeDrawingId, platformMode, dhcpPercent,
  roleOptions, platformOptions, showHardware, showKW, showServices, exportView,
  onUpdateSite, onToggleService, onDeleteSite, onOpenModelDialog, onCopySiteToDrawing,
}) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  // Unit Group mapping based on alphabet chart
  // A = GM/GMC, B = Internal DNS, C = DHCP, D = Edge/Remote, E = External DNS, F = Cache/DMZ, G = Guest, M = MSFT Sync, N = Network Insight
  const getUnitGroup = (role, services = []) => {
    if (role === 'GM') return 'A';
    if (role === 'GMC') return 'A';
    if (role === 'DNS' || role === 'DNS/DHCP' || role?.includes('DNS')) return 'B';
    if (role === 'DHCP') return 'C';
    if (role?.toLowerCase()?.includes('edge') || role?.toLowerCase()?.includes('remote')) return 'D';
    if (role?.toLowerCase()?.includes('external') || role?.toLowerCase()?.includes('auth')) return 'E';
    if (role?.toLowerCase()?.includes('cache') || role?.toLowerCase()?.includes('forward')) return 'F';
    if (role?.toLowerCase()?.includes('guest')) return 'G';
    if (services?.includes('NI') || services?.includes('Network Insight')) return 'N';
    if (services?.includes('Reporting')) return 'RPT';
    return 'B'; // Default to Internal DNS
  };
  
  // Helper to get solution from platform
  const getSolution = (platform) => {
    if (platform?.includes('NXVS') || platform?.includes('NXaaS')) return 'UDDI';
    return 'NIOS';
  };

  // Helper to get SW Base SKU from model
  const getSwBaseSku = (model) => {
    if (!model) return '';
    return `${model}-SWSUB`;
  };

  // Helper to get SW Package from role
  const getSwPackage = (role, hasDiscovery) => {
    if (role === 'GM' || role === 'GMC') return 'GM';
    if (hasDiscovery) return 'DD/GD'; // DNS/DHCP with Discovery
    if (role === 'DNS/DHCP') return 'DD/GD';
    if (role === 'DNS') return 'DNS';
    if (role === 'DHCP') return 'DHCP';
    return 'DD/GD';
  };

  // Helper to get HW License SKU
  const getHwLicenseSku = (model, platform) => {
    if (platform?.includes('NXVS') || platform?.includes('NXaaS') || platform === 'NIOS-V') return 'VM';
    if (!model) return '';
    // Map model to HW SKU (TE-XXXX -> TE-XXXX-HW-AC)
    return `${model.replace('-SWSUB', '')}-HW-AC`;
  };

  // Build description from name, role, and services
  const getDescription = () => {
    let desc = site.role || 'DNS/DHCP';
    if (site.services && site.services.length > 0) {
      desc += ` + ${site.services.join(', ')}`;
    }
    return desc;
  };

  // SW Add-ons from site.swAddons array (selected by user)
  const getSwAddonsDisplay = () => {
    const addons = site.swAddons || [];
    // Also include legacy services as add-ons
    if ((site.services || []).includes('DFP') && !addons.includes('ADP')) addons.push('ADP');
    // Add RPT with quantity if Reporting role
    if (site.role === 'Reporting' && site.rptQuantity) {
      addons.push(`RPT-${site.rptQuantity}`);
    }
    return addons.join(', ');
  };

  // HW Add-ons from site.hwAddons array
  const getHwAddonsDisplay = () => {
    return (site.hwAddons || []).join(', ');
  };

  // Get available SW Add-ons for this row
  const availableSwAddons = getAvailableSwAddons(site.role, site.platform);
  const availableHwAddons = getAvailableHwAddons(site.recommendedModel, site.platform);
  const isReportingRole = site.role === 'Reporting';

  // Export view - full export columns matching Lucidchart format
  if (exportView) {
    const unitGroup = getUnitGroup(site.role, site.services);
    const solution = getSolution(site.platform);
    const swBaseSku = getSwBaseSku(site.recommendedModel);
    const swPackage = getSwPackage(site.role, (site.services || []).includes('Discovery'));
    const hwLicenseSku = getHwLicenseSku(site.recommendedModel, site.platform);
    const swAddons = getSwAddonsDisplay();
    const hwAddons = getHwAddonsDisplay();
    const description = getDescription();
    const swInstances = site.swInstances || 1;
    const hwCount = site.hwCount ?? 0;

    return (
      <TableRow data-testid={`site-row-${site.id}`} className="hover:bg-muted/30 text-xs">
        {/* Unit Group */}
        <TableCell className="p-1.5 text-center font-medium">{unitGroup}</TableCell>
        
        {/* Solution */}
        <TableCell className="p-1.5">{solution}</TableCell>
        
        {/* Model Info */}
        <TableCell className="p-1.5 font-mono">{site.recommendedModel}</TableCell>
        
        {/* SW Instances */}
        <TableCell className="p-1.5 text-center font-medium">{swInstances}</TableCell>
        
        {/* Description */}
        <TableCell className="p-1.5 max-w-[150px] truncate" title={`${site.name} - ${description}`}>
          {site.name}
        </TableCell>
        
        {/* SW Base SKU */}
        <TableCell className="p-1.5 font-mono text-[11px]">{swBaseSku}</TableCell>
        
        {/* SW Package */}
        <TableCell className="p-1.5">{swPackage}</TableCell>
        
        {/* SW Add-ons */}
        <TableCell className="p-1.5 text-muted-foreground">{swAddons || '—'}</TableCell>
        
        {/* HW License SKU */}
        <TableCell className="p-1.5 font-mono text-[11px]">{hwLicenseSku}</TableCell>
        
        {/* HW Add-ons */}
        <TableCell className="p-1.5 text-muted-foreground">{hwAddons || '—'}</TableCell>
        
        {/* HW Count */}
        <TableCell className="p-1.5 text-center">{hwCount}</TableCell>
        
        {/* Add to Report */}
        <TableCell className="p-1.5 text-center">
          <Checkbox 
            checked={site.addToReport !== false} 
            onCheckedChange={v => onUpdateSite(site.id, 'addToReport', v)} 
            className="h-4 w-4"
          />
        </TableCell>
        
        {/* Add to BOM */}
        <TableCell className="p-1.5 text-center">
          <Checkbox 
            checked={site.addToBom !== false} 
            onCheckedChange={v => onUpdateSite(site.id, 'addToBom', v)} 
            className="h-4 w-4"
          />
        </TableCell>
        
        {/* Delete */}
        <TableCell className="p-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteSite(site.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
  
  return (
    <TableRow
      data-testid={`site-row-${site.id}`}
      className={`
        ${site.isDisabledInUddi ? 'opacity-40 bg-muted/50' : ''}
        ${!site.isDisabledInUddi && site.isHub ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        ${!site.isDisabledInUddi && site.isSpoke ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
      `}
    >
      {/* Location Name */}
      <TableCell className="p-2 lg:p-4">
        <div className="flex items-center gap-2">
          <Input
            value={site.name}
            onChange={e => onUpdateSite(site.id, 'name', e.target.value)}
            className="h-8 lg:h-10 text-sm lg:text-base min-w-[120px]"
            disabled={site.isDisabledInUddi}
            data-testid={`site-name-${site.id}`}
          />
          {site.isDisabledInUddi && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] px-1 bg-muted">N/A</Badge>
                </TooltipTrigger>
                <TooltipContent>GM/GMC not available in UDDI mode. Switch to NIOS or Hybrid to edit.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* # IPs */}
      <TableCell className="p-2 lg:p-4">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={site.numIPs}
            onChange={e => onUpdateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
            className="h-8 lg:h-10 text-sm lg:text-base w-20 lg:w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={site.isDisabledInUddi}
            data-testid={`site-ips-${site.id}`}
          />
          {site.numIPsAuto > 0 && site.numIPs !== site.numIPsAuto && !site.isDisabledInUddi && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3 text-amber-500" /></TooltipTrigger>
                <TooltipContent>Auto: {formatNumber(site.numIPsAuto)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* KW - Editable and synced with TopBar (hidden by default) */}
      {showKW && (
        <TableCell className="p-2 lg:p-4">
          <Input
            type="number"
            min="0"
            value={site.knowledgeWorkers || ''}
            onChange={e => onUpdateSite(site.id, 'knowledgeWorkers', parseInt(e.target.value) || 0)}
            className="h-8 lg:h-10 text-sm w-16 lg:w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={site.isDisabledInUddi}
            data-testid={`site-kw-${site.id}`}
            placeholder="0"
          />
        </TableCell>
      )}

      {/* Role */}
      <TableCell className="p-2 lg:p-4">
        <Select value={site.role} onValueChange={v => onUpdateSite(site.id, 'role', v)} disabled={site.isDisabledInUddi}>
          <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-role-${site.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(o => (
              <SelectItem 
                key={o.value} 
                value={o.value} 
                title={o.description}
                className={o.notRecommended ? 'text-amber-600 dark:text-amber-400' : ''}
              >
                {o.label}
                {o.notRecommended && <span className="ml-1 text-[10px]">⚠️</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Services (conditional) */}
      {showServices && (
        <TableCell className="p-2 lg:p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-8 lg:h-10 text-xs lg:text-sm w-full justify-between"
                disabled={site.isDisabledInUddi}
                data-testid={`site-services-${site.id}`}
              >
                {(site.services?.length || 0) > 0 ? (
                  <span className="truncate">{site.services.length}</span>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
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
                        onCheckedChange={() => onToggleService(site.id, svc.value)}
                        data-testid={`checkbox-${site.id}-${svc.value}`}
                      />
                      <label htmlFor={`${site.id}-${svc.value}`} className="flex-1 text-sm cursor-pointer">
                        {svc.label}
                        {svc.impact > 0 && <span className="text-xs text-amber-600 ml-1">+{svc.impact}%</span>}
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
      )}

      {/* DHCP Partner */}
      <TableCell className="p-2 lg:p-4">
        {(site.role === 'DHCP' || site.role === 'DNS/DHCP' || site.role.includes('+DHCP') || site.role.includes('+DNS/DHCP')) && !site.isDisabledInUddi ? (
          <Select
            value={site.dhcpPartner || '__none__'}
            onValueChange={v => onUpdateSite(site.id, 'dhcpPartner', v === '__none__' ? null : v)}
            disabled={site.isDisabledInUddi}
          >
            <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-dhcp-partner-${site.id}`}>
              <SelectValue>
                {site.isHub ? (
                  <span className="text-blue-600 font-medium flex items-center gap-1"><Server className="h-3 w-3" /> Hub</span>
                ) : site.dhcpPartner ? (
                  <span className="text-amber-600">{sites.find(s => s.id === site.dhcpPartner)?.name || 'Spoke'}</span>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None (Standalone)</SelectItem>
              {sites.filter(s => {
                // Can be a DHCP partner if: different site, not a spoke, and has DHCP capability
                const hasDHCP = s.role === 'DHCP' || s.role === 'DNS/DHCP' || 
                                s.role.includes('+DHCP') || s.role.includes('+DNS/DHCP');
                return s.id !== site.id && !s.isSpoke && hasDHCP;
              }).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.isHub && '(Hub)'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-xs">N/A</span>
        )}
      </TableCell>

      {/* Server Count (Srv#) - minimum 1, can't be empty */}
      <TableCell className="p-2 lg:p-4">
        <Input
          type="number" min="1" max="99"
          value={site.serverCount ?? 1}
          onChange={e => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 1) {
              onUpdateSite(site.id, 'serverCount', val);
            }
          }}
          onBlur={e => {
            // Reset to 1 if empty or invalid on blur
            const val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) {
              onUpdateSite(site.id, 'serverCount', 1);
            }
          }}
          className="h-8 lg:h-10 text-sm w-14 lg:w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          disabled={site.isDisabledInUddi}
          data-testid={`site-server-count-${site.id}`}
        />
      </TableCell>

      {/* HA Checkbox */}
      <TableCell className="p-2 lg:p-4 text-center">
        <Checkbox
          checked={site.haEnabled || false}
          onCheckedChange={v => onUpdateSite(site.id, 'haEnabled', v)}
          disabled={site.isDisabledInUddi}
          data-testid={`site-ha-${site.id}`}
        />
      </TableCell>

      {/* Platform */}
      <TableCell className="p-2 lg:p-4">
        <Select value={site.platform} onValueChange={v => onUpdateSite(site.id, 'platform', v)} disabled={site.isDisabledInUddi}>
          <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-platform-${site.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Model */}
      <TableCell className="p-2 lg:p-4">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Badge variant={site.isDisabledInUddi ? "secondary" : "outline"} className="font-mono text-xs lg:text-sm" data-testid={`site-model-${site.id}`}>
                    {site.isDisabledInUddi ? '\u2014' : site.recommendedModel}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {site.isDisabledInUddi ? (
                  <div className="text-xs">GM/GMC not available in UDDI mode</div>
                ) : (
                  <ModelTooltipContent site={site} platformMode={platformMode} dhcpPercent={dhcpPercent} />
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 shrink-0"
            onClick={() => onOpenModelDialog(site)}
            disabled={site.isDisabledInUddi}
            data-testid={`why-model-${site.id}`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-blue-500" />
          </Button>
        </div>
      </TableCell>

      {/* Hardware SKU (conditional) */}
      {showHardware && (
        <TableCell className="p-2 lg:p-4">
          <Select value={site.hardwareSku} onValueChange={v => onUpdateSite(site.id, 'hardwareSku', v)} disabled={site.isDisabledInUddi}>
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

      {/* SW Instances (auto-calculated: serverCount * (HA ? 2 : 1)) */}
      <TableCell className="p-2 lg:p-4 text-center tabular-nums font-medium text-sm lg:text-base">
        {site.isDisabledInUddi ? (
          <span className="text-muted-foreground">&mdash;</span>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-help">
                <span>{site.swInstances || site.serverCount || 1}</span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <div>Srv# ({site.serverCount || 1}) × {site.haEnabled ? '2 (HA)' : '1'} = {site.swInstances || site.serverCount || 1}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>

      {/* HW Count (editable) */}
      <TableCell className="p-2 lg:p-4 text-center">
        <Input
          type="number" min="0" max="999"
          value={site.hwCount ?? 0}
          onChange={e => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 0) {
              onUpdateSite(site.id, 'hwCount', val);
            }
          }}
          className="h-8 lg:h-10 text-sm w-14 lg:w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          disabled={site.isDisabledInUddi}
          data-testid={`site-hw-count-${site.id}`}
        />
      </TableCell>

      {/* SW Add-ons (NIOS only) */}
      {platformMode === 'NIOS' && !exportView && (
        <TableCell className="p-2 lg:p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-8 lg:h-10 text-xs lg:text-sm w-full justify-between"
                disabled={site.isDisabledInUddi}
                data-testid={`site-sw-addons-${site.id}`}
              >
                {(site.swAddons?.length || 0) > 0 || isReportingRole ? (
                  <span className="truncate text-xs">
                    {isReportingRole && site.rptQuantity ? `RPT-${site.rptQuantity}` : ''}
                    {(site.swAddons?.length || 0) > 0 ? (isReportingRole && site.rptQuantity ? ', ' : '') + site.swAddons.join(', ') : ''}
                    {!isReportingRole && !(site.swAddons?.length) ? '—' : ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <Plus className="h-3 w-3 ml-1 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">SW Add-ons</div>
                <p className="text-xs text-muted-foreground">Select software add-ons for this member.</p>
                
                {/* RPT Quantity for Reporting role */}
                {isReportingRole && (
                  <div className="pb-2 border-b">
                    <div className="text-xs font-medium mb-1">Reporting Storage</div>
                    <Select 
                      value={site.rptQuantity || ''} 
                      onValueChange={v => onUpdateSite(site.id, 'rptQuantity', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select GB" />
                      </SelectTrigger>
                      <SelectContent>
                        {RPT_QUANTITIES.map(q => (
                          <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Available SW Add-ons */}
                <div className="space-y-2">
                  {availableSwAddons.length > 0 ? (
                    availableSwAddons.map(addon => (
                      <div key={addon.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${site.id}-sw-${addon.value}`}
                          checked={(site.swAddons || []).includes(addon.value)}
                          onCheckedChange={(checked) => {
                            const current = site.swAddons || [];
                            const updated = checked 
                              ? [...current, addon.value]
                              : current.filter(a => a !== addon.value);
                            onUpdateSite(site.id, 'swAddons', updated);
                          }}
                        />
                        <label htmlFor={`${site.id}-sw-${addon.value}`} className="flex-1 text-sm cursor-pointer">
                          <span className="font-medium">{addon.label}</span>
                          <span className="text-xs text-muted-foreground block">{addon.description}</span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No add-ons available for this role/platform</p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
      )}

      {/* HW Add-ons (Physical only) */}
      {platformMode === 'NIOS' && !exportView && site.platform === 'NIOS' && (
        <TableCell className="p-2 lg:p-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-8 lg:h-10 text-xs lg:text-sm w-full justify-between"
                disabled={site.isDisabledInUddi || availableHwAddons.length === 0}
                data-testid={`site-hw-addons-${site.id}`}
              >
                {(site.hwAddons?.length || 0) > 0 ? (
                  <span className="truncate text-xs">{site.hwAddons.join(', ')}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <Plus className="h-3 w-3 ml-1 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">HW Add-ons</div>
                <p className="text-xs text-muted-foreground">Select hardware add-ons for this appliance.</p>
                <div className="space-y-2">
                  {availableHwAddons.length > 0 ? (
                    availableHwAddons.map(addon => (
                      <div key={addon.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${site.id}-hw-${addon.value}`}
                          checked={(site.hwAddons || []).includes(addon.value)}
                          onCheckedChange={(checked) => {
                            const current = site.hwAddons || [];
                            const updated = checked 
                              ? [...current, addon.value]
                              : current.filter(a => a !== addon.value);
                            onUpdateSite(site.id, 'hwAddons', updated);
                          }}
                        />
                        <label htmlFor={`${site.id}-hw-${addon.value}`} className="flex-1 text-sm cursor-pointer">
                          <span className="font-medium">{addon.label}</span>
                          <span className="text-xs text-muted-foreground block">{addon.description}</span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No HW add-ons for this model</p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
      )}

      {/* Token Packs - only show for non-NIOS modes */}
      {showTokens && (
        <TableCell className="p-2 lg:p-4 text-right tabular-nums font-medium text-sm lg:text-base">
          {site.isDisabledInUddi ? (
            <span className="text-muted-foreground">&mdash;</span>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-bold">{calculateTokenPacks(site.tokens)}</span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div><strong>Tokens:</strong> {formatNumber(site.tokens || 0)}</div>
                    <div><strong>Token packs:</strong> {calculateTokenPacks(site.tokens)} (500K per pack)</div>
                    {site.serverCount > 1 && <div><strong>Servers:</strong> x{site.serverCount}</div>}
                    {site.haEnabled && <div className="text-green-600"><strong>HA:</strong> Enabled (×2 SW instances)</div>}
                    {(site.serviceImpact || 0) > 0 && <div><strong>Service overhead:</strong> +{site.serviceImpact}%</div>}
                    {site.isSpoke && <div className="text-amber-600"><strong>Spoke penalty:</strong> 50% LPS</div>}
                    {site.isHub && <div className="text-blue-600"><strong>Hub failover:</strong> +{site.hubLPS} LPS (50% of spokes)</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TableCell>
      )}

      {/* Add to Report */}
      <TableCell className="p-2 lg:p-4 text-center">
        <Checkbox checked={site.addToReport} onCheckedChange={v => onUpdateSite(site.id, 'addToReport', v)} data-testid={`site-report-${site.id}`} />
      </TableCell>

      {/* Add to BOM */}
      <TableCell className="p-2 lg:p-4 text-center">
        <Checkbox checked={site.addToBom} onCheckedChange={v => onUpdateSite(site.id, 'addToBom', v)} data-testid={`site-bom-${site.id}`} />
      </TableCell>

      {/* Actions: Copy to Drawing + Delete */}
      <TableCell className="p-2 lg:p-4">
        <div className="flex items-center gap-1">
          {/* Copy to another drawing */}
          {drawings && drawings.length > 1 && onCopySiteToDrawing && (
            <CopySiteToDrawingMenu
              site={site}
              drawings={drawings}
              activeDrawingId={activeDrawingId}
              onCopy={onCopySiteToDrawing}
            />
          )}
          
          {/* Delete - available for all rows */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 lg:h-8 lg:w-8" 
            onClick={() => onDeleteSite(site.id)}
            title="Delete row"
            data-testid={`delete-site-${site.id}`}
          >
            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ModelTooltipContent({ site, platformMode, dhcpPercent }) {
  const workload = getSiteWorkloadDetails(
    site.numIPs, site.role, platformMode, dhcpPercent,
    site.platform, { isSpoke: site.isSpoke, hubLPS: site.hubLPS || 0 }
  );
  return (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">Sizing Details for {site.name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className={workload.driver === 'qps' ? 'font-bold text-blue-500' : ''}>
          QPS: {formatNumber(workload.adjustedQPS)} {workload.driver === 'qps' && '\u2605'}
        </div>
        <div className={workload.driver === 'lps' ? 'font-bold text-blue-500' : ''}>
          LPS: {formatNumber(workload.adjustedLPS)} {workload.driver === 'lps' && '\u2605'}
        </div>
        <div className={workload.driver === 'objects' ? 'font-bold text-blue-500' : ''}>
          Objects: {formatNumber(workload.objects)} {workload.driver === 'objects' && '\u2605'}
        </div>
        <div className="text-muted-foreground">DHCP: {formatNumber(workload.dhcpClients)}</div>
      </div>
      {workload.penalties.length > 0 && (
        <div className="border-t pt-1 text-amber-600">
          <div className="font-medium">Penalties Applied:</div>
          {workload.penalties.map((p, i) => <div key={i}>&#8226; {p}</div>)}
        </div>
      )}
      <div className="border-t pt-1 text-muted-foreground">
        <span className="text-blue-500">{'\u2605'}</span> = driver metric
      </div>
    </div>
  );
}
