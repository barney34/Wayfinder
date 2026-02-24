/**
 * SiteTableRow - Individual site/server row in the sizing table
 * Column order: Unit, #, Location, IPs, KW?, Role, Services?, DHCP Partner, Srv#, HA, Platform, Model, HW SKU?, SW#, HW#, Tokens?, Rpt, BOM, Actions
 */
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Info, Settings2, HelpCircle, Server, Copy, Plus, Minus, MapPin, Building2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ADDITIONAL_SERVICES, SW_ADDONS, HW_ADDONS, SFP_OPTIONS, RPT_QUANTITIES, getAvailableSwAddons, getAvailableHwAddons } from "./platformConfig";
import { getSiteWorkloadDetails } from "../calculations";
import { CopySiteToDrawingMenu } from "./DrawingManager";

/**
 * LocationHeaderRow — visual separator showing location name + server controls + grouping
 * Rendered when a site has serverCount > 1
 */
export function LocationHeaderRow({ site, onUpdateSite, onDeleteSite, totalColumns }) {
  const serverCount = site.serverCount || 1;
  const isDataCenter = site.sourceType === 'dataCenter';
  const grouping = site.groupingMode || 'individual'; // 'individual' | 'combined' | 'custom'
  const customGroups = site.customGroups || []; // Array of [start, end] ranges
  
  // Build chips for custom grouping
  const chips = [];
  if (serverCount > 1) {
    if (grouping === 'combined') {
      chips.push({ start: 1, end: serverCount, merged: true });
    } else if (grouping === 'custom' && customGroups.length > 0) {
      // Build chips from custom groups, filling gaps with individual
      const grouped = new Set();
      customGroups.forEach(([s, e]) => {
        chips.push({ start: s, end: e, merged: true });
        for (let i = s; i <= e; i++) grouped.add(i);
      });
      for (let i = 1; i <= serverCount; i++) {
        if (!grouped.has(i)) chips.push({ start: i, end: i, merged: false });
      }
      chips.sort((a, b) => a.start - b.start);
    } else {
      // Individual
      for (let i = 1; i <= serverCount; i++) {
        chips.push({ start: i, end: i, merged: false });
      }
    }
  }

  // Handle chip click for custom grouping
  const [rangeStart, setRangeStart] = React.useState(null);
  
  const handleChipClick = (chip) => {
    if (chip.merged) {
      // Split back to individual
      const newGroups = (customGroups || []).filter(([s, e]) => !(s === chip.start && e === chip.end));
      onUpdateSite(site.id, 'customGroups', newGroups);
      if (newGroups.length === 0) onUpdateSite(site.id, 'groupingMode', 'individual');
      setRangeStart(null);
      return;
    }
    
    if (rangeStart === null) {
      setRangeStart(chip.start);
    } else {
      // Create range from rangeStart to this chip
      const start = Math.min(rangeStart, chip.start);
      const end = Math.max(rangeStart, chip.start);
      if (start !== end) {
        const newGroups = [...(customGroups || []).filter(([s, e]) => {
          // Remove any groups that overlap with the new range
          return !(s >= start && e <= end);
        }), [start, end]];
        onUpdateSite(site.id, 'customGroups', newGroups);
        onUpdateSite(site.id, 'groupingMode', 'custom');
      }
      setRangeStart(null);
    }
  };
  
  return (
    <TableRow className="bg-muted/30 border-t-2 border-primary/20">
      <TableCell colSpan={totalColumns} className="p-1">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Icon + Name + ± controls together */}
          <div className="flex items-center gap-2">
            {isDataCenter 
              ? <Building2 className="h-4 w-4 text-primary" />
              : <MapPin className="h-4 w-4 text-foreground" />
            }
            <span className="font-bold text-sm">{site.name}</span>
            <div className="flex items-center h-7 rounded border border-border overflow-hidden">
              <button
                onClick={() => { if (serverCount > 1) onUpdateSite(site.id, 'serverCount', serverCount - 1); }}
                disabled={serverCount <= 1}
                className="h-full w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors border-r border-border"
              ><Minus className="h-3 w-3" /></button>
              <span className="text-xs font-semibold w-6 text-center tabular-nums">{serverCount}</span>
              <button
                onClick={() => onUpdateSite(site.id, 'serverCount', serverCount + 1)}
                className="h-full w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
              ><Plus className="h-3 w-3" /></button>
            </div>
          </div>

          {/* Grouping chips — only show when 2+ servers */}
          {serverCount > 1 && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Export:</span>
              {/* Quick mode buttons */}
              <button
                onClick={() => { onUpdateSite(site.id, 'groupingMode', 'individual'); onUpdateSite(site.id, 'customGroups', []); setRangeStart(null); }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${grouping === 'individual' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >Individual</button>
              <button
                onClick={() => { onUpdateSite(site.id, 'groupingMode', 'combined'); onUpdateSite(site.id, 'customGroups', []); setRangeStart(null); }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${grouping === 'combined' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >Combined</button>
              
              {/* Chips for visual grouping */}
              <div className="flex items-center gap-0.5 ml-1">
                {chips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChipClick(chip)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all tabular-nums ${
                      chip.merged
                        ? 'bg-primary text-primary-foreground'
                        : rangeStart === chip.start
                          ? 'bg-accent text-accent-foreground ring-2 ring-accent/50'
                          : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title={chip.merged ? 'Click to split' : rangeStart !== null ? 'Click to set range end' : 'Click to start range'}
                  >
                    {chip.merged && chip.start !== chip.end ? `${chip.start}━${chip.end}` : chip.start}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Spacer + Delete */}
          <div className="ml-auto">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteSite(site.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

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
  unitAssignment,
}) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  // Detect virtual/cloud platform — no HW needed
  // Physical: NIOS (Physical), NX-P (NIOS-X Physical) → has hardware
  // Virtual: NIOS-V, NIOS-VHA, NXVS (NIOS-X Virtual), NXaaS → no hardware, HW=VM, HW#=0
  const isPhysicalPlatform = site.platform === 'NIOS' || site.platform === 'NX-P';
  const isVirtualPlatform = !isPhysicalPlatform;
  
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

  // Helper to get HW License SKU — VM for virtual, HW-AC for physical
  const getHwLicenseSku = (model, platform) => {
    if (platform !== 'NIOS' && platform !== 'NX-P') return 'VM';
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
  // Use hardwareSku (e.g. 'TE-1506-HW-AC') not recommendedModel (e.g. 'TE-1516') — HW addons match on hardware SKU
  const availableHwAddons = getAvailableHwAddons(site.hardwareSku, site.platform);
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
        ${!site.isDisabledInUddi && site.isHub ? 'bg-accent/5' : ''}
        ${!site.isDisabledInUddi && site.isSpoke ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
      `}
    >
      {/* Unit Group — dropdown with custom option */}
      <TableCell className="p-1 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-14 text-xs font-bold rounded border border-border bg-background hover:bg-muted px-1 text-center"
              disabled={site.isDisabledInUddi}
            >
              {unitAssignment?.unitLetter || getUnitGroup(site.role, site.services)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-2" align="start">
            <div className="grid grid-cols-4 gap-1 mb-2">
              {['A','B','C','D','E','F','G','M','N'].map(letter => (
                <button
                  key={letter}
                  onClick={() => onUpdateSite(site.id, 'unitLetterOverride', letter)}
                  className={`px-1 py-1 text-xs font-bold rounded transition-colors ${
                    (unitAssignment?.unitLetter || getUnitGroup(site.role, site.services)) === letter
                      ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
                  }`}
                >{letter}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {['RPT','LIC','CDC'].map(letter => (
                <button
                  key={letter}
                  onClick={() => onUpdateSite(site.id, 'unitLetterOverride', letter)}
                  className={`px-1 py-1 text-[10px] font-bold rounded transition-colors ${
                    (unitAssignment?.unitLetter || getUnitGroup(site.role, site.services)) === letter
                      ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
                  }`}
                >{letter}</button>
              ))}
            </div>
            <div className="border-t pt-2">
              <Input
                placeholder="Custom..."
                className="h-7 text-xs"
                maxLength={6}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    onUpdateSite(site.id, 'unitLetterOverride', e.target.value.trim().toUpperCase());
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      
      {/* Unit Number — editable, shows range when combined */}
      <TableCell className="p-1 lg:p-2 text-center">
        {site._groupRange ? (
          /* Combined group: show range string like "1-3" */
          <span className="text-sm font-semibold tabular-nums text-primary">{site._groupRange}</span>
        ) : (
          <Input
            type="number" min="1" max="999"
            value={site.unitNumberOverride ?? unitAssignment?.unitNumber ?? 1}
            onChange={e => {
              const raw = e.target.value;
              if (raw === '') { onUpdateSite(site.id, 'unitNumberOverride', ''); return; }
              const val = parseInt(raw);
              if (!isNaN(val) && val >= 0) onUpdateSite(site.id, 'unitNumberOverride', val);
            }}
            onBlur={e => {
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < 1) onUpdateSite(site.id, 'unitNumberOverride', undefined);
            }}
            className="h-8 w-12 text-center text-sm font-semibold px-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={site.isDisabledInUddi}
          />
        )}
      </TableCell>
      
      {/* Location Name */}
      <TableCell className="p-1">
        <div className="flex items-center gap-2">
          {site._isExpanded && (
            <span className="text-xs text-muted-foreground shrink-0">Srv {site._serverIndex + 1}</span>
          )}
          <Input
            value={site.name}
            onChange={e => onUpdateSite(site.id, 'name', e.target.value)}
            className={`h-7 text-sm min-w-[80px] ${site._isExpanded ? 'bg-muted/30' : ''}`}
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
      <TableCell className="p-1">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={site.numIPs}
            onChange={e => onUpdateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
            className="h-7 text-sm w-20 lg:w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        <TableCell className="p-1">
          <Input
            type="number"
            min="0"
            value={site.knowledgeWorkers || ''}
            onChange={e => onUpdateSite(site.id, 'knowledgeWorkers', parseInt(e.target.value) || 0)}
            className="h-7 text-sm w-16 lg:w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={site.isDisabledInUddi}
            data-testid={`site-kw-${site.id}`}
            placeholder="0"
          />
        </TableCell>
      )}

      {/* Role */}
      <TableCell className="p-1 lg:p-2">
        <Select value={site.role} onValueChange={v => onUpdateSite(site.id, 'role', v)} disabled={site.isDisabledInUddi}>
          <SelectTrigger className="h-8 text-xs" data-testid={`site-role-${site.id}`}>
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

      {/* Description — free text for export */}
      <TableCell className="p-1 lg:p-2">
        <Input
          value={site.description || ''}
          onChange={e => onUpdateSite(site.id, 'description', e.target.value)}
          placeholder="Description..."
          className="h-8 text-xs min-w-[70px]"
          disabled={site.isDisabledInUddi}
        />
      </TableCell>

      {/* Services (conditional) */}
      {showServices && (
        <TableCell className="p-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs w-full justify-between"
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
      <TableCell className="p-1">
        {(site.role === 'DHCP' || site.role === 'DNS/DHCP' || site.role.includes('+DHCP') || site.role.includes('+DNS/DHCP')) && !site.isDisabledInUddi ? (
          <Select
            value={site.dhcpPartner || '__none__'}
            onValueChange={v => onUpdateSite(site.id, 'dhcpPartner', v === '__none__' ? null : v)}
            disabled={site.isDisabledInUddi}
          >
            <SelectTrigger className="h-7 text-xs" data-testid={`site-dhcp-partner-${site.id}`}>
              <SelectValue>
                {site.isHub ? (
                  <span className="text-accent font-medium flex items-center gap-1"><Server className="h-3 w-3" /> Hub</span>
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

      {/* Server Count (Srv#) — number + stacked ±  */}
      <TableCell className="p-1">
        {site._isExpanded ? (
          <span className="text-xs font-semibold text-center block">
            {site._groupRange ? site._serverCount : 1}
          </span>
        ) : (
          <div className="flex items-center gap-0 rounded border border-border overflow-hidden h-8 w-12">
            <input
              type="number" min="1" max="99"
              value={site.serverCount ?? 1}
              onChange={e => {
                const raw = e.target.value;
                if (raw === '') { onUpdateSite(site.id, 'serverCount', ''); return; }
                const val = parseInt(raw);
                if (!isNaN(val) && val >= 0) onUpdateSite(site.id, 'serverCount', val);
              }}
              onBlur={e => {
                const val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) onUpdateSite(site.id, 'serverCount', 1);
              }}
              className="h-full w-6 text-center text-xs font-semibold bg-transparent focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={site.isDisabledInUddi}
              data-testid={`site-server-count-${site.id}`}
            />
            <div className="flex flex-col border-l border-border h-full">
              <button
                onClick={() => { const c = parseInt(site.serverCount) || 1; if (c < 99) onUpdateSite(site.id, 'serverCount', c + 1); }}
                disabled={site.isDisabledInUddi || (parseInt(site.serverCount) || 1) >= 99}
                className="flex-1 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 text-[9px] leading-none border-b border-border"
                data-testid={`site-srv-plus-${site.id}`}
              >▲</button>
              <button
                onClick={() => { const c = parseInt(site.serverCount) || 1; if (c > 1) onUpdateSite(site.id, 'serverCount', c - 1); }}
                disabled={site.isDisabledInUddi || (parseInt(site.serverCount) || 1) <= 1}
                className="flex-1 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 text-[9px] leading-none"
                data-testid={`site-srv-minus-${site.id}`}
              >▼</button>
            </div>
          </div>
        )}
      </TableCell>

      {/* HA Checkbox */}
      <TableCell className="p-1 text-center">
        <Checkbox
          checked={site.haEnabled || false}
          onCheckedChange={v => onUpdateSite(site.id, 'haEnabled', v)}
          disabled={site.isDisabledInUddi}
          data-testid={`site-ha-${site.id}`}
        />
      </TableCell>

      {/* Platform */}
      <TableCell className="p-1">
        <Select value={site.platform} onValueChange={v => onUpdateSite(site.id, 'platform', v)} disabled={site.isDisabledInUddi}>
          <SelectTrigger className="h-7 text-xs" data-testid={`site-platform-${site.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Model */}
      <TableCell className="p-1">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Badge variant={site.isDisabledInUddi ? "secondary" : "outline"} className="font-mono text-xs" data-testid={`site-model-${site.id}`}>
                    {site.isDisabledInUddi ? '\u2014' : (site.recommendedModel || '').replace(/^TE-/, '')}
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
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-accent" />
          </Button>
        </div>
      </TableCell>

      {/* Hardware SKU (conditional) */}
      {showHardware && (
        <TableCell className="p-1">
          {isVirtualPlatform ? (
            <span className="text-xs text-muted-foreground">VM</span>
          ) : (
            <Select value={site.hardwareSku} onValueChange={v => onUpdateSite(site.id, 'hardwareSku', v)} disabled={site.isDisabledInUddi}>
              <SelectTrigger className="h-7 text-xs" data-testid={`site-sku-${site.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(site.hardwareOptions || [site.hardwareSku]).map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
      )}

      {/* SW Instances (auto-calculated: serverCount * (HA ? 2 : 1)) */}
      <TableCell className="p-1 text-center tabular-nums font-medium text-sm">
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

      {/* HW Count — auto 0 for virtual, editable for physical */}
      <TableCell className="p-1 text-center">
        {isVirtualPlatform ? (
          <span className="text-xs text-muted-foreground">0</span>
        ) : (
          <Input
            type="number" min="0" max="999"
            value={site.hwCount ?? 0}
            onChange={e => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0) onUpdateSite(site.id, 'hwCount', val);
            }}
            className="h-8 text-sm w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={site.isDisabledInUddi}
            data-testid={`site-hw-count-${site.id}`}
          />
        )}
      </TableCell>

      {/* SW Add-ons (NIOS only) */}
      {!exportView && (
        <TableCell className="p-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs w-full justify-between"
                disabled={site.isDisabledInUddi}
                data-testid={`site-sw-addons-${site.id}`}
              >
                {(site.swAddons?.length || 0) > 0 || (isReportingRole && site.rptQuantity) ? (
                  <span className="truncate text-xs">
                    {isReportingRole && site.rptQuantity ? `RPT-${site.rptQuantity}` : ''}
                    {(site.swAddons?.length || 0) > 0 ? (isReportingRole && site.rptQuantity ? ', ' : '') + site.swAddons.join(', ') : ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-base leading-none">+</span>
                )}
                {((site.swAddons?.length || 0) > 0 || (isReportingRole && site.rptQuantity)) && (
                  <Plus className="h-3 w-3 ml-1 flex-shrink-0" />
                )}
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

      {/* HW Add-ons (Physical only, with SFP quantity) */}
      {!exportView && (
        <TableCell className="p-1">
          {isVirtualPlatform ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className="h-8 text-xs w-full justify-between"
                  disabled={site.isDisabledInUddi}
                  data-testid={`site-hw-addons-${site.id}`}
                >
                  {(site.hwAddons?.length || 0) > 0 || (site.sfpAddons && Object.keys(site.sfpAddons).length > 0) ? (
                    <span className="truncate text-xs">
                      {[
                        ...(site.hwAddons || []),
                        ...Object.entries(site.sfpAddons || {}).filter(([,qty]) => qty > 0).map(([sfp, qty]) => `${qty}×${sfp.replace('IB-','')}`),
                      ].join(', ') || '+'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-base leading-none">+</span>
                  )}
                  {((site.hwAddons?.length || 0) > 0 || (site.sfpAddons && Object.keys(site.sfpAddons).length > 0)) && (
                    <Settings2 className="h-3 w-3 ml-1 flex-shrink-0" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <div className="font-medium text-sm">HW Add-ons</div>
                  
                  {/* Standard HW add-ons (PSU) */}
                  {availableHwAddons.length > 0 && (
                    <div className="space-y-2">
                      {availableHwAddons.map(addon => {
                        // Compute dynamic PSU label based on model AC/DC
                        let displayLabel = addon.label;
                        if (addon.value === 'PSU') {
                          const hwSku = site.hardwareSku || '';
                          if (hwSku.includes('-AC')) displayLabel = 'T-PSU600-AC';
                          else if (hwSku.includes('-DC')) displayLabel = 'T-PSU600-DC';
                          else displayLabel = 'T-PSU600';
                        }
                        return (
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
                            <label htmlFor={`${site.id}-hw-${addon.value}`} className="text-xs cursor-pointer">
                              <span className="font-medium">{displayLabel}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* SFP Interfaces with quantity — any 10GE hardware SKU */}
                  {(site.hardwareSku || '').includes('10GE') && (
                    <div className={availableHwAddons.length > 0 ? 'border-t pt-2' : ''}>
                      <div className="text-xs font-medium text-muted-foreground mb-1">SFP Interfaces</div>
                      {/* Per-server qty explanation */}
                      {(site._serverCount || 1) > 1 && (
                        <p className="text-[10px] text-muted-foreground italic mb-2">
                          Qty = per server × {site._serverCount} servers = total
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {SFP_OPTIONS.map(sfp => {
                          const qty = (site.sfpAddons || {})[sfp.value] || 0;
                          const serverCount = site._serverCount || 1;
                          const total = qty * serverCount;
                          return (
                            <div key={sfp.value} className="flex items-center gap-2">
                              {/* − qty + stepper */}
                              <div className="flex items-center h-6 rounded border border-border overflow-hidden">
                                <button
                                  onClick={() => {
                                    if (qty > 0) {
                                      const updated = { ...(site.sfpAddons || {}), [sfp.value]: qty - 1 };
                                      if (updated[sfp.value] <= 0) delete updated[sfp.value];
                                      onUpdateSite(site.id, 'sfpAddons', updated);
                                    }
                                  }}
                                  disabled={qty <= 0}
                                  className="h-full w-5 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 text-[10px] border-r border-border"
                                >−</button>
                                <span className="text-[10px] font-semibold w-5 text-center tabular-nums">{qty}</span>
                                <button
                                  onClick={() => {
                                    const updated = { ...(site.sfpAddons || {}), [sfp.value]: qty + 1 };
                                    onUpdateSite(site.id, 'sfpAddons', updated);
                                  }}
                                  className="h-full w-5 flex items-center justify-center text-muted-foreground hover:bg-muted text-[10px] border-l border-border"
                                >+</button>
                              </div>
                              {/* SKU label + total */}
                              <div className="flex-1 flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono">{sfp.label}</span>
                                {serverCount > 1 && qty > 0 && (
                                  <span className="text-[10px] text-primary font-semibold tabular-nums">= {total}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* No add-ons available message */}
                  {availableHwAddons.length === 0 && !(site.hardwareSku || '').includes('10GE') && (
                    <p className="text-xs text-muted-foreground italic">No HW add-ons available for this model</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </TableCell>
      )}

      {/* Token Packs - only show for non-NIOS modes */}
      {showTokens && (
        <TableCell className="p-1 text-right tabular-nums font-medium text-sm">
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
                    {site.haEnabled && <div className="text-primary"><strong>HA:</strong> Enabled (×2 SW instances)</div>}
                    {(site.serviceImpact || 0) > 0 && <div><strong>Service overhead:</strong> +{site.serviceImpact}%</div>}
                    {site.isSpoke && <div className="text-amber-600"><strong>Spoke penalty:</strong> 50% LPS</div>}
                    {site.isHub && <div className="text-accent"><strong>Hub failover:</strong> +{site.hubLPS} LPS (50% of spokes)</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TableCell>
      )}

      {/* Add to Report */}
      <TableCell className="p-1 text-center">
        <Checkbox checked={site.addToReport} onCheckedChange={v => onUpdateSite(site.id, 'addToReport', v)} data-testid={`site-report-${site.id}`} />
      </TableCell>

      {/* Add to BOM */}
      <TableCell className="p-1 text-center">
        <Checkbox checked={site.addToBom} onCheckedChange={v => onUpdateSite(site.id, 'addToBom', v)} data-testid={`site-bom-${site.id}`} />
      </TableCell>

      {/* Actions: Copy to Drawing + Delete */}
      <TableCell className="p-1">
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
        <div className={workload.driver === 'qps' ? 'font-bold text-accent' : ''}>
          QPS: {formatNumber(workload.adjustedQPS)} {workload.driver === 'qps' && '\u2605'}
        </div>
        <div className={workload.driver === 'lps' ? 'font-bold text-accent' : ''}>
          LPS: {formatNumber(workload.adjustedLPS)} {workload.driver === 'lps' && '\u2605'}
        </div>
        <div className={workload.driver === 'objects' ? 'font-bold text-accent' : ''}>
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
        <span className="text-accent">{'\u2605'}</span> = driver metric
      </div>
    </div>
  );
}
