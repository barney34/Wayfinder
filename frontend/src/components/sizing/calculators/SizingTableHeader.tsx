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
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1 cursor-help">
            {children} <Info className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs z-50">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableHead>
  );
}

export function SizingTableHeader({ showHardware, showKW, showServices, showDescription = true, platformMode, exportView }) {
  const showTokens = false; // Tokens column removed — handled by Token Calculator section
  
  // Export view - show all columns matching Lucidchart export format
  // Drawing # is shown in header above table, so we skip it here
  // Columns: Unit Group, Solution, Model Info, SW Instances, Description, SW Base SKU, SW Package, SW Add-ons, HW License SKU, HW Add-ons, HW Count, Add to Report, Add to BOM
  if (exportView) {
    return (
      <TableHeader className="sticky top-0 z-20">
        <TableRow className="bg-muted text-xs">
          <TableHead className="w-14 p-1.5">Unit Grp</TableHead>
          <TableHead className="w-14 p-1.5 text-center">#/Range</TableHead>
          <TableHead className="w-16 p-1.5">Solution</TableHead>
          <TableHead className="w-20 p-1.5">Model Info</TableHead>
          <TableHead className="w-12 p-1.5 text-center">SW#</TableHead>
          <TableHead className="w-44 p-1.5">Description</TableHead>
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
        {/* Drag handle column */}
        <TableHead className="w-6 p-0" />

        {/* Unit Group */}
        <HeaderWithTooltip className="w-14" tooltip="Unit Group: A=GM/GMC, B=DNS, C=DHCP, D=Edge, E=ExtDNS, F=Cache, G=Guest, M=MSSync, N=NI, RPT, LIC, CDC. Click + to add custom.">
          Unit
        </HeaderWithTooltip>
        
        {/* Unit #/Range */}
        <TableHead className="w-12 text-xs lg:text-sm text-center">#/Range</TableHead>
        
        {/* Location — GUI-only, not in export */}
        <TableHead className="w-24 text-xs lg:text-sm">Location</TableHead>

        {/* KW (conditional) — before IPs */}
        {showKW && (
          <HeaderWithTooltip className="w-16" tooltip="Knowledge Workers. Syncs with TopBar.">
            KW
          </HeaderWithTooltip>
        )}
        
        {/* # IPs */}
        <TableHead className="w-20 text-xs lg:text-sm"># IPs</TableHead>
        
        {/* Role → maps to Description in export */}
        <TableHead className="w-24 text-xs lg:text-sm">Role</TableHead>
        
        {/* Description — conditionally shown */}
        {showDescription && (
          <TableHead className="w-32 text-xs lg:text-sm">Description</TableHead>
        )}
        
        {/* Services (conditional, hidden by default) */}
        {showServices && (
          <HeaderWithTooltip className="w-20" tooltip="Co-located services. Each adds performance overhead.">
            Services
          </HeaderWithTooltip>
        )}
        
        {/* DHCP Partner */}
        <HeaderWithTooltip className="w-20" tooltip="NIOS: ISC DHCP Failover Association (FOA) between peers. UDDI/NIOS-X: Kea HA Group. 1 FOA = {name}; 2+ FOAs = Hub(N).">
          FO / HA
        </HeaderWithTooltip>
        
        {/* Server Count */}
        <HeaderWithTooltip className="w-24 text-center" tooltip="Number of Servers at location. Increasing creates a unit range (e.g. B1–B3).">
          Member Count
        </HeaderWithTooltip>
        
        {/* HA */}
        <TableHead className="w-10 text-xs lg:text-sm text-center">HA</TableHead>
        
        {/* Solution (was Platform) — maps to export Solution */}
        <TableHead className="w-24 text-xs lg:text-sm">Solution</TableHead>
        
        {/* Model Info — show just number in GUI */}
        <HeaderWithTooltip className="w-16" tooltip="Recommended model. TE- prefix omitted for brevity — full SKU used in export.">
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
          <div className="flex flex-col leading-tight items-center">
            <span className="text-[9px] text-muted-foreground font-normal">Instances</span>
            <span>SW</span>
          </div>
        </HeaderWithTooltip>
        
        {/* HW Count */}
        <HeaderWithTooltip className="w-16 text-center" tooltip="Hardware unit count. Uncheck for VM (0 HW).">
          <div className="flex flex-col leading-tight items-center">
            <span className="text-[9px] text-muted-foreground font-normal">Count</span>
            <span>HW</span>
          </div>
        </HeaderWithTooltip>

        {/* SW Add-ons */}
        <HeaderWithTooltip className="w-24" tooltip="SW Add-ons: CNA, ADNS, DCA, SECECO, FIPS, TA">
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] text-muted-foreground font-normal">Add-ons</span>
            <span>SW</span>
          </div>
        </HeaderWithTooltip>

        {/* HW Add-ons */}
        <HeaderWithTooltip className="w-20" tooltip="HW Add-ons: PSU (1506 only), SFP modules (10GE models only)">
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] text-muted-foreground font-normal">Add-ons</span>
            <span>HW</span>
          </div>
        </HeaderWithTooltip>
        
        {/* Tokens (conditional) */}
        {showTokens && (
          <HeaderWithTooltip className="w-20 text-right" tooltip="Token packs (500K each).">
            Tokens
          </HeaderWithTooltip>
        )}
        
        {/* Add to Report + BOM — grouped */}
        <TableHead colSpan={2} className="text-xs text-center p-1">
          <div className="flex flex-col items-center leading-tight gap-0.5">
            <span className="text-[9px] text-muted-foreground font-normal">Add to</span>
            <div className="flex items-center gap-3">
              <span>RPT</span>
              <span>BOM</span>
            </div>
          </div>
        </TableHead>
        
        {/* Actions */}
        <TableHead className="w-10 text-xs"></TableHead>
      </TableRow>
    </TableHeader>
  );
}
