/**
 * SizingTableHeader - Column headers for the sizing table with tooltips
 * Export columns: Drawing #, Unit Group, Unit #/Range, Solution, Model Info, SW Instances, Description, SW Base SKU, SW Package, SW Add-ons, HW License SKU, HW Add-ons, HW Count, Add to Report, Add to BOM
 * Normal columns: Location, IPs, KW?, Role, Services?, DHCP Partner, Srv#, HA, Platform, Model, HW SKU?, SW#, HW#, Tokens?, Rpt, BOM, Actions
 */
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

function HeaderWithTooltip({ children, tooltip, className = "" }) {
  return (
    <TableHead className={`text-xs lg:text-sm ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1">
            {children} <Info className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableHead>
  );
}

export function SizingTableHeader({ showHardware, showKW, showServices, platformMode, exportView }) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  // Export view - show all columns matching Lucidchart export format
  // Drawing # is shown in header above table, so we skip it here
  // Columns: Unit Group, Solution, Model Info, SW Instances, Description, SW Base SKU, SW Package, SW Add-ons, HW License SKU, HW Add-ons, HW Count, Add to Report, Add to BOM
  if (exportView) {
    return (
      <TableHeader className="sticky top-0 z-20">
        <TableRow className="bg-muted text-xs">
          <TableHead className="w-14 p-1.5">Unit Grp</TableHead>
          <TableHead className="w-16 p-1.5">Solution</TableHead>
          <TableHead className="w-20 p-1.5">Model Info</TableHead>
          <TableHead className="w-12 p-1.5 text-center">SW#</TableHead>
          <TableHead className="w-32 p-1.5">Description</TableHead>
          <TableHead className="w-28 p-1.5">SW Base SKU</TableHead>
          <TableHead className="w-16 p-1.5">SW Pkg</TableHead>
          <TableHead className="w-20 p-1.5">SW Add-ons</TableHead>
          <TableHead className="w-28 p-1.5">HW License SKU</TableHead>
          <TableHead className="w-20 p-1.5">HW Add-ons</TableHead>
          <TableHead className="w-12 p-1.5 text-center">HW#</TableHead>
          <TableHead className="w-10 p-1.5 text-center">Rpt</TableHead>
          <TableHead className="w-10 p-1.5 text-center">BOM</TableHead>
          <TableHead className="w-10 p-1.5"></TableHead>
        </TableRow>
      </TableHeader>
    );
  }
  
  return (
    <TableHeader className="sticky top-0 z-20 bg-card">
      <TableRow className="bg-muted">
        {/* Unit Group */}
        <HeaderWithTooltip className="w-14" tooltip="Unit Group: A=GM/GMC, B=DNS, C=DHCP, D=Edge, E=ExtDNS, F=Cache, G=Guest, M=MSSync, N=NI, RPT, LIC, CDC. Click + to add custom.">
          Unit
        </HeaderWithTooltip>
        
        {/* Unit #/Range */}
        <TableHead className="w-12 text-xs lg:text-sm text-center">#/Range</TableHead>
        
        {/* Location — GUI-only, not in export */}
        <TableHead className="w-24 text-xs lg:text-sm">Location</TableHead>
        
        {/* # IPs — GUI-only */}
        <TableHead className="w-20 text-xs lg:text-sm"># IPs</TableHead>
        
        {/* KW (conditional, hidden by default) */}
        {showKW && (
          <HeaderWithTooltip className="w-16" tooltip="Knowledge Workers. Syncs with TopBar.">
            KW
          </HeaderWithTooltip>
        )}
        
        {/* Role → maps to Description in export */}
        <TableHead className="w-24 text-xs lg:text-sm">Role</TableHead>
        
        {/* Description — free text, maps to export Description */}
        <TableHead className="w-32 text-xs lg:text-sm">Description</TableHead>
        
        {/* Services (conditional, hidden by default) */}
        {showServices && (
          <HeaderWithTooltip className="w-20" tooltip="Co-located services. Each adds performance overhead.">
            Services
          </HeaderWithTooltip>
        )}
        
        {/* DHCP Partner */}
        <HeaderWithTooltip className="w-20" tooltip="Hub site for DHCP failover.">
          DHCP Ptnr
        </HeaderWithTooltip>
        
        {/* Server Count */}
        <TableHead className="w-16 text-xs lg:text-sm text-center">Srv#</TableHead>
        
        {/* HA */}
        <TableHead className="w-10 text-xs lg:text-sm text-center">HA</TableHead>
        
        {/* Solution (was Platform) — maps to export Solution */}
        <TableHead className="w-24 text-xs lg:text-sm">Solution</TableHead>
        
        {/* Model Info — show just number in GUI */}
        <HeaderWithTooltip className="w-16" tooltip="Recommended model. Shows number only — full SKU in export.">
          Model
        </HeaderWithTooltip>
        
        {/* HW License SKU (conditional) */}
        {showHardware && (
          <HeaderWithTooltip className="w-28" tooltip="Hardware License SKU for export.">
            HW SKU
          </HeaderWithTooltip>
        )}
        
        {/* SW Instances */}
        <HeaderWithTooltip className="w-12 text-center" tooltip="SW Instances: Srv# × (HA ? 2 : 1)">
          SW#
        </HeaderWithTooltip>
        
        {/* HW Count */}
        <HeaderWithTooltip className="w-16 text-center" tooltip="Hardware unit count. Uncheck for VM (0 HW).">
          HW#
        </HeaderWithTooltip>

        {/* SW Add-ons */}
        <HeaderWithTooltip className="w-24" tooltip="SW Add-ons: CNA, ADNS, DCA, SECECO, FIPS, TA">
          SW Add-ons
        </HeaderWithTooltip>

        {/* HW Add-ons */}
        <HeaderWithTooltip className="w-20" tooltip="HW Add-ons: PSU, SFP modules with quantity">
          HW Add-ons
        </HeaderWithTooltip>
        
        {/* Tokens (conditional) */}
        {showTokens && (
          <HeaderWithTooltip className="w-20 text-right" tooltip="Token packs (500K each).">
            Tokens
          </HeaderWithTooltip>
        )}
        
        {/* Add to Report */}
        <TableHead className="w-10 text-xs text-center">Rpt</TableHead>
        
        {/* Add to BOM */}
        <TableHead className="w-10 text-xs text-center">BOM</TableHead>
        
        {/* Actions */}
        <TableHead className="w-10 text-xs"></TableHead>
      </TableRow>
    </TableHeader>
  );
}
