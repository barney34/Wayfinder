/**
 * SizingTableHeader - Column headers for the sizing table with tooltips
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

export function SizingTableHeader({ showHardware, platformMode }) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-32 lg:w-40 text-xs lg:text-sm">Location</TableHead>
        <TableHead className="w-20 lg:w-24 text-xs lg:text-sm"># IPs</TableHead>
        <HeaderWithTooltip className="w-16 lg:w-20" tooltip="Knowledge Workers. Editable here and syncs with DCs/Sites in the TopBar.">
          KW
        </HeaderWithTooltip>
        <TableHead className="w-28 lg:w-32 text-xs lg:text-sm">Role</TableHead>
        <HeaderWithTooltip className="w-20 lg:w-24" tooltip="Co-located services that can run on the same host. Each service adds performance overhead.">
          Services
        </HeaderWithTooltip>
        <HeaderWithTooltip className="w-24 lg:w-28" tooltip="Select a Hub site for DHCP failover. Spokes forward DHCP to their Hub (50% LPS penalty).">
          DHCP Partner
        </HeaderWithTooltip>
        <HeaderWithTooltip className="w-14 lg:w-16" tooltip="Number of identical servers at this location. Tokens multiply by server count.">
          Srv#
        </HeaderWithTooltip>
        <TableHead className="text-xs lg:text-sm">Platform</TableHead>
        <HeaderWithTooltip className="w-16 lg:w-20" tooltip={<><p>Recommended server model based on workload.</p><p className="mt-1 text-muted-foreground">Hover on model for sizing details.</p></>}>
          Model
        </HeaderWithTooltip>
        {showHardware && <TableHead className="text-xs lg:text-sm">Hardware SKU</TableHead>}
        {showTokens && (
          <HeaderWithTooltip className="w-20 lg:w-24 text-right" tooltip="Token packs required. Each pack = 500K tokens.">
            Token Packs
          </HeaderWithTooltip>
        )}
        <HeaderWithTooltip className="w-12 text-center" tooltip="Include in exported report/drawing">
          Rpt
        </HeaderWithTooltip>
        <HeaderWithTooltip className="w-12 text-center" tooltip="Include in Bill of Materials">
          BOM
        </HeaderWithTooltip>
        <TableHead className="w-10 lg:w-12 text-xs lg:text-sm"></TableHead>
      </TableRow>
    </TableHeader>
  );
}
