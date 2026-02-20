/**
 * SiteTableRow - Individual site row in the sizing table
 */
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2, Info, Settings2, HelpCircle, Server } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ADDITIONAL_SERVICES } from "./platformConfig";
import { getSiteWorkloadDetails } from "../calculations";

// Calculate token packs (500K per pack, rounded up)
const TOKENS_PER_PACK = 500000;
function calculateTokenPacks(tokens) {
  if (!tokens || tokens <= 0) return 0;
  return Math.ceil(tokens / TOKENS_PER_PACK);
}

export function SiteTableRow({
  site, sites, platformMode, dhcpPercent,
  roleOptions, platformOptions, showHardware,
  onUpdateSite, onToggleService, onDeleteSite, onOpenModelDialog,
}) {
  const showTokens = platformMode !== 'NIOS'; // Hide tokens for NIOS-only mode
  
  return (
    <TableRow
      data-testid={`site-row-${site.id}`}
      className={`
        ${site.isDisabledInUddi ? 'opacity-40 bg-gray-100 dark:bg-gray-800/50' : ''}
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
                  <Badge variant="outline" className="text-[10px] px-1 bg-gray-200 dark:bg-gray-700">N/A</Badge>
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

      {/* KW */}
      <TableCell className="p-2 lg:p-4 text-sm lg:text-base text-muted-foreground tabular-nums">
        {formatNumber(site.knowledgeWorkers || 0)}
      </TableCell>

      {/* Role */}
      <TableCell className="p-2 lg:p-4">
        <Select value={site.role} onValueChange={v => onUpdateSite(site.id, 'role', v)} disabled={site.isDisabledInUddi}>
          <SelectTrigger className="h-8 lg:h-10 text-xs lg:text-sm" data-testid={`site-role-${site.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(o => (
              <SelectItem key={o.value} value={o.value} title={o.description}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Services */}
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

      {/* DHCP Partner */}
      <TableCell className="p-2 lg:p-4">
        {(site.role === 'DHCP' || site.role === 'DNS/DHCP') && !site.isDisabledInUddi ? (
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
              {sites.filter(s =>
                s.id !== site.id && !s.isSpoke && (s.role === 'DHCP' || s.role === 'DNS/DHCP')
              ).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.isHub && '(Hub)'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-xs">N/A</span>
        )}
      </TableCell>

      {/* Server Count */}
      <TableCell className="p-2 lg:p-4">
        <Input
          type="number" min="1" max="10"
          value={site.serverCount || 1}
          onChange={e => onUpdateSite(site.id, 'serverCount', Math.max(1, parseInt(e.target.value) || 1))}
          className="h-8 lg:h-10 text-sm w-14 lg:w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          disabled={site.isDisabledInUddi}
          data-testid={`site-server-count-${site.id}`}
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

      {/* Token Packs - only show for non-NIOS modes */}
      {showTokens && (
        <TableCell className="p-2 lg:p-4 text-right tabular-nums font-medium text-sm lg:text-base">
          {site.isDisabledInUddi ? (
            <span className="text-muted-foreground">&mdash;</span>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <div className="flex flex-col items-end">
                    <span className="font-bold">{calculateTokenPacks(site.tokens)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(site.tokens || 0)} tkns
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div><strong>Token packs:</strong> {calculateTokenPacks(site.tokens)} (500K per pack)</div>
                    <div><strong>Raw tokens:</strong> {formatNumber(site.tokens || 0)}</div>
                    <div><strong>Base tokens:</strong> {formatNumber(site.tokensPerServer || 0)}</div>
                    {site.serverCount > 1 && <div><strong>Servers:</strong> x{site.serverCount}</div>}
                    {(site.serviceImpact || 0) > 0 && <div><strong>Service overhead:</strong> +{site.serviceImpact}%</div>}
                    {site.isSpoke && <div className="text-amber-600"><strong>Spoke penalty:</strong> 50% LPS (sized up)</div>}
                    {site.isHub && <div className="text-blue-600"><strong>Hub load:</strong> +{site.hubLPS} LPS from spokes</div>}
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

      {/* Delete (manual sites only) */}
      <TableCell className="p-2 lg:p-4">
        {!site.sourceType && (
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={() => onDeleteSite(site.id)}>
            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
          </Button>
        )}
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
