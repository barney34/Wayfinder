/**
 * SizingTableHeader - Column headers for the sizing table with tooltips
 * Column order matches export format: Location, IPs, KW?, Role, Services?, DHCP Partner, Srv#, HA, Platform, Model, HW SKU?, SW#, HW#, Tokens?, Rpt, BOM, Actions
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

export function SizingTableHeader({ showHardware, showKW, showServices, platformMode }) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        {/* Location */}
        <TableHead className="w-32 lg:w-40 text-xs lg:text-sm">Location</TableHead>
        
        {/* # IPs */}
        <TableHead className="w-20 lg:w-24 text-xs lg:text-sm"># IPs</TableHead>
        
        {/* KW (conditional) */}
        {showKW && (
          <HeaderWithTooltip className="w-16 lg:w-20" tooltip="Knowledge Workers. Editable here and syncs with DCs/Sites in the TopBar.">
            KW
          </HeaderWithTooltip>
        )}
        
        {/* Role */}
        <TableHead className="w-28 lg:w-32 text-xs lg:text-sm">Role</TableHead>
        
        {/* Services (conditional) */}
        {showServices && (
          <HeaderWithTooltip className="w-20 lg:w-24" tooltip="Co-located services that can run on the same host. Each service adds performance overhead.">
            Services
          </HeaderWithTooltip>
        )}
        
        {/* DHCP Partner */}
        <HeaderWithTooltip className="w-24 lg:w-28" tooltip="Select a Hub site for DHCP failover. Hub receives 50% of combined spoke LPS for failover capacity.">
          DHCP Partner
        </HeaderWithTooltip>
        
        {/* Server Count */}
        <HeaderWithTooltip className="w-14 lg:w-16" tooltip="Number of server instances per site. For multiple servers, enter the count here.">
          Srv#
        </HeaderWithTooltip>
        
        {/* HA Checkbox */}
        <HeaderWithTooltip className="w-12 text-center" tooltip="High Availability. When enabled, doubles SW instances for the site. HW count is user-editable.">
          HA
        </HeaderWithTooltip>
        
        {/* Platform */}
        <TableHead className="w-24 lg:w-28 text-xs lg:text-sm">Platform</TableHead>
        
        {/* Model */}
        <HeaderWithTooltip className="w-20 lg:w-24" tooltip={<><p>Recommended server model based on workload.</p><p className="mt-1 text-muted-foreground">Hover on model for sizing details.</p></>}>
          Model
        </HeaderWithTooltip>
        
        {/* Hardware SKU (conditional) */}
        {showHardware && <TableHead className="w-28 text-xs lg:text-sm">HW SKU</TableHead>}
        
        {/* SW Instances */}
        <HeaderWithTooltip className="w-14 lg:w-16 text-center" tooltip="Software instance count. Auto-calculated: Srv# × (HA ? 2 : 1)">
          SW#
        </HeaderWithTooltip>
        
        {/* HW Count */}
        <HeaderWithTooltip className="w-20 lg:w-24 text-center" tooltip="Hardware unit count for export. Check box to include HW, uncheck for VM (0 HW).">
          HW#
        </HeaderWithTooltip>
        
        {/* Tokens (conditional) */}
        {showTokens && (
          <HeaderWithTooltip className="w-20 lg:w-24 text-right" tooltip="Token packs required. Each pack = 500K tokens.">
            Tokens
          </HeaderWithTooltip>
        )}
        
        {/* Add to Report */}
        <HeaderWithTooltip className="w-12 text-center" tooltip="Include in exported report/drawing">
          Rpt
        </HeaderWithTooltip>
        
        {/* Add to BOM */}
        <HeaderWithTooltip className="w-12 text-center" tooltip="Include in Bill of Materials">
          BOM
        </HeaderWithTooltip>
        
        {/* Actions column */}
        <TableHead className="w-12 lg:w-16 text-xs lg:text-sm"></TableHead>
      </TableRow>
    </TableHeader>
  );
}
