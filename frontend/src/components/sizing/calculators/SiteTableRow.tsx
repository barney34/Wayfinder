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
import { Trash2, Info, Settings2, Server, Copy, Plus, Minus, MapPin, Building2, GripVertical, FileText, Package, Layers, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/utils";
import { ADDITIONAL_SERVICES, SW_ADDONS, HW_ADDONS, SFP_OPTIONS, RPT_QUANTITIES, PERFORMANCE_FEATURES, getAvailableSwAddons, getAvailableHwAddons, getAvailablePerfFeatures } from "./platformConfig";
import { getSiteWorkloadDetails, getDefaultHardwareSku, getDefaultHwAddons } from "../calculations";
import { CopySiteToDrawingMenu } from "./DrawingManager";
import { niosServerGuardrails, nxvsServers, nxaasServers, ndxServerGuardrails } from "@/lib/tokenData";
import type { RoleOption, PlatformOption } from "./platformConfig";
import type { UnitAssignment } from "./unitDesignations";

// ── Association Types ───────────────────────────────────────────────────────

export interface AssociationMember {
  rowId: string;
  role: 'peer' | 'active' | 'passive' | 'primary' | 'secondary';
}

export interface Association {
  id: string;
  name: string;
  type: 'nios_failover' | 'uddi_ha';
  mode?: 'advanced_active_passive' | 'active_passive' | 'active_active';
  members: [AssociationMember, AssociationMember];
}

// ── Prop Types ──────────────────────────────────────────────────────────────

interface SiteRow {
  id: string;
  name: string;
  sourceId?: string;
  sourceType?: string;
  numIPs: number;
  numIPsAuto?: number;
  knowledgeWorkers: number;
  role: string;
  services: string[];
  platform: string;
  dhcpPercent: number;
  dhcpPartner?: string | null;
  siteAssociations?: Association[];
  displayLabel?: string;
  serverCount: number;
  haEnabled: boolean;
  hwCount?: number;
  swAddons?: string[];
  hwAddons?: string[];
  sfpAddons?: Record<string, number>;
  perfFeatures?: string[];
  effectivePerfFeatures?: string[];
  rptQuantity?: string | null;
  addToReport?: boolean;
  addToBom?: boolean;
  unitLetterOverride?: string | null;
  unitNumberOverride?: number;
  groupingMode?: string;
  customGroups?: [number, number][];
  description?: string;
  recommendedModel?: string;
  autoRecommendedModel?: string;
  isModelOverridden?: boolean;
  hardwareSku?: string;
  hardwareOptions?: string[];
  tokens?: number;
  tokensPerServer?: number;
  serviceImpact?: number;
  isHub?: boolean;
  isSpoke?: boolean;
  hubLPS?: number;
  foObjects?: number;
  partnerCount?: number;
  foWarning?: string | null;
  swInstances?: number;
  isDisabledInUddi?: boolean;
  _isExpanded?: boolean;
  _serverIndex?: number;
  _parentSiteId?: string;
  _parentName?: string;
  _serverCount?: number;
  _groupMode?: string;
  [key: string]: unknown;
}

interface Drawing {
  id: string;
  name: string;
}

interface LocationHeaderRowProps {
  site: SiteRow;
  onUpdateSite: (siteId: string, field: string | Record<string, unknown>, value?: unknown) => void;
  onDeleteSite: (siteId: string) => void;
  totalColumns: number;
}

interface SiteTableRowProps {
  site: SiteRow;
  sites: SiteRow[];
  drawings: Drawing[];
  activeDrawingId: string;
  platformMode: string;
  dhcpPercent: number;
  roleOptions: RoleOption[];
  platformOptions: PlatformOption[];
  showHardware: boolean;
  showKW: boolean;
  showServices: boolean;
  showDescription?: boolean;
  exportView: boolean;
  onUpdateSite: (siteId: string, field: string | Record<string, unknown>, value?: unknown) => void;
  onToggleService: (siteId: string, serviceValue: string) => void;
  onTogglePerfFeature: (siteId: string, featureValue: string) => void;
  onDeleteSite: (siteId: string) => void;
  onOpenModelDialog: (site: SiteRow) => void;
  onCopySiteToDrawing: (site: SiteRow, drawingId: string) => void;
  unitAssignment?: UnitAssignment;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  dhcpAssociations?: Association[];
  onAddAssociation?: (assoc: Association) => void;
  onRemoveAssociation?: (assocId: string) => void;
  unitAssignments?: Record<string, UnitAssignment>;
}

/**
 * LocationHeaderRow — visual separator showing location name + server controls + grouping
 * Rendered when a site has serverCount > 1
 */
export function LocationHeaderRow({ site, onUpdateSite, onDeleteSite, totalColumns }: LocationHeaderRowProps) {
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

  // Handle chip click for custom grouping — uses ATOMIC single call to avoid race condition
  const [rangeStart, setRangeStart] = React.useState(null);
  const [confirmClearGroupings, setConfirmClearGroupings] = React.useState(false);
  
  const handleChipClick = (chip) => {
    if (chip.merged) {
      // Split back to individual — remove this group
      const newGroups = (customGroups || []).filter(([s, e]) => !(s === chip.start && e === chip.end));
      if (newGroups.length === 0) {
        // Atomic: clear groups + reset mode in one call
        onUpdateSite(site.id, { groupingMode: 'individual', customGroups: [] });
      } else {
        onUpdateSite(site.id, { customGroups: newGroups, groupingMode: 'custom' });
      }
      setRangeStart(null);
      return;
    }
    
    if (rangeStart === null) {
      setRangeStart(chip.start);
    } else {
      const start = Math.min(rangeStart, chip.start);
      const end = Math.max(rangeStart, chip.start);
      if (start !== end) {
        const newGroups = [...(customGroups || []).filter(([s, e]) => {
          return !(s >= start && e <= end);
        }), [start, end]];
        // Atomic: set both customGroups + groupingMode in one call
        onUpdateSite(site.id, { customGroups: newGroups, groupingMode: 'custom' });
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

          {/* Server grouping controls — only show when 2+ servers */}
          {serverCount > 1 && (
            <div className="flex items-center gap-1.5 ml-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Create Groupings:</span>
              {/* Group All / Ungroup All toggle */}
              <button
                onClick={() => {
                  if (grouping === 'combined') {
                    onUpdateSite(site.id, { groupingMode: 'individual', customGroups: [] });
                  } else {
                    onUpdateSite(site.id, { groupingMode: 'combined', customGroups: [] });
                  }
                  setRangeStart(null);
                }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${grouping === 'combined' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                title={grouping === 'combined' ? 'Expand back to individual rows' : `Collapse all ${serverCount} servers into 1 row`}
              >{grouping === 'combined' ? 'Ungroup All' : 'Group All'}</button>

              {/* Grouping info tooltip */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-0.5">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="w-72 p-3 text-xs leading-relaxed bg-popover text-popover-foreground border border-border shadow-lg" sideOffset={6}>
                    <p className="font-semibold mb-2 text-foreground">Custom Number Groupings</p>
                    <p className="mb-2 text-popover-foreground">
                      <strong className="text-foreground">To Group:</strong> Click the first and last numbers of your range
                      (e.g., 1 then 3 creates Unit 1-3).
                    </p>
                    <p className="mb-2 text-popover-foreground">
                      <strong className="text-foreground">To Ungroup:</strong> Click <em>Individual</em> for all groups, or click
                      an existing grouped range to reset those units to individual rows.
                    </p>
                    <p className="text-popover-foreground">
                      <strong className="text-foreground">To Combine All:</strong> Click <em>Group All</em> to create one continuous
                      Unit Range covering all servers.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Custom grouping chips: click 2 numbers to merge a range */}
              {grouping !== 'combined' && (
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
                      title={chip.merged ? `Range ${chip.start}-${chip.end} (click to ungroup)` : rangeStart !== null ? `Click to group ${rangeStart}–${chip.start}` : `Click to start grouping from ${chip.start}`}
                    >
                      {chip.merged && chip.start !== chip.end ? `${chip.start}-${chip.end}` : chip.start}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Spacer + Clear Groupings (with confirmation) + Delete */}
          <div className="ml-auto flex items-center gap-1">
            {confirmClearGroupings ? (
              <>
                <span className="text-[10px] text-muted-foreground">Reset to ×1?</span>
                <button
                  onClick={() => { onUpdateSite(site.id, { serverCount: 1, groupingMode: 'individual', customGroups: [] }); setRangeStart(null); setConfirmClearGroupings(false); }}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >Yes</button>
                <button
                  onClick={() => setConfirmClearGroupings(false)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >No</button>
              </>
            ) : (
              <button
                onClick={() => setConfirmClearGroupings(true)}
                className="px-2 py-0.5 text-[10px] font-semibold rounded transition-colors bg-secondary text-muted-foreground hover:text-destructive"
                title="Reset grouping back to individual rows"
              >Reset to ×1</button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteSite(site.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── FoAssocCell — DHCP Failover Association / HA Group cell ─────────────────

function FoAssocCell({ site, sites, dhcpAssociations, onAddAssociation, onRemoveAssociation, isUddi, displayLabel, myAssociations, unitAssignments = {} }) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newPartnerSiteId, setNewPartnerSiteId] = React.useState('');
  const [newAssocName, setNewAssocName] = React.useState('');
  const [newMyRole, setNewMyRole] = React.useState<'active' | 'passive'>('active');
  const [newPartnerRole, setNewPartnerRole] = React.useState<'active' | 'passive'>('passive');

  const partnerCount = myAssociations.length;

  const eligiblePartners = sites.filter(s => {
    const hasDhcp = s.role === 'DHCP' || s.role === 'DNS/DHCP' ||
      s.role.includes('+DHCP') || s.role.includes('+DNS/DHCP');
    if (!hasDhcp || s.id === site.id) return false;
    const sIsUddi = s.platform === 'NXVS' || s.platform === 'NXaaS';
    if (sIsUddi !== isUddi) return false;
    return !dhcpAssociations.some(a =>
      a.members.some(m => m.rowId === site.id) && a.members.some(m => m.rowId === s.id)
    );
  });

  const handleAdd = () => {
    if (!newPartnerSiteId || !onAddAssociation) return;
    const name = newAssocName.trim() || `foa-${Date.now()}`;
    onAddAssociation({
      id: `assoc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      type: isUddi ? 'uddi_ha' : 'nios_failover',
      mode: isUddi ? 'advanced_active_passive' : undefined,
      members: [
        { rowId: site.id, role: isUddi ? newMyRole : 'peer' },
        { rowId: newPartnerSiteId, role: isUddi ? newPartnerRole : 'peer' },
      ],
    });
    setShowAddForm(false);
    setNewPartnerSiteId('');
    setNewAssocName('');
  };

  const triggerClasses = partnerCount === 0
    ? 'text-muted-foreground'
    : partnerCount === 1
    ? 'text-teal-600 dark:text-teal-400 font-medium'
    : isUddi
    ? 'text-orange-600 dark:text-orange-400 font-semibold'
    : 'text-indigo-600 dark:text-indigo-400 font-semibold';

  const unitLabel = (id: string, fallback: string) => {
    const ua = unitAssignments[id];
    return ua ? `${ua.unitLetter}${ua.unitNumber}` : fallback.slice(0, 6);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <Popover onOpenChange={(open) => { if (!open) { setShowAddForm(false); setNewPartnerSiteId(''); setNewAssocName(''); } }}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={`h-auto min-h-[28px] min-w-[60px] max-w-[96px] text-left text-xs rounded border border-transparent hover:border-border hover:bg-muted px-1.5 py-1 flex items-start gap-1 ${triggerClasses}`}
                data-testid={`site-dhcp-partner-${site.id}`}
              >
                {(() => {
                  const rootLabel = isUddi ? 'HA Group' : 'FOA';
                  if (partnerCount === 0) {
                    return <span className="text-muted-foreground">—</span>;
                  }
                  const myLbl = unitLabel(site.id, site.name);
                  const pairs = myAssociations.map(a => {
                    const pm = a.members.find(m => m.rowId !== site.id);
                    const pName = sites.find(s => s.id === pm?.rowId)?.name || '?';
                    return `${myLbl}–${unitLabel(pm?.rowId || '', pName)}`;
                  });
                  return (
                    <div className="flex flex-col items-start gap-0 leading-tight min-w-0 flex-1">
                      <span className="text-[10px] font-semibold truncate w-full">{rootLabel}</span>
                      {pairs.map((p, i) => (
                        <span key={i} className="text-[10px] font-mono truncate w-full">{p}</span>
                      ))}
                    </div>
                  );
                })()}
                {partnerCount > 0 && <Settings2 className="h-3 w-3 shrink-0 opacity-60 mt-0.5" />}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <div className="font-medium text-sm">
            {partnerCount >= 2
              ? (isUddi ? `Failover Hub (${partnerCount} HA Groups)` : `Failover Mesh (${partnerCount} FOAs)`)
              : partnerCount === 1
              ? (isUddi ? 'HA Group' : 'Failover Association')
              : (isUddi ? 'Kea HA Groups' : 'NIOS Failover Associations')}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {isUddi ? 'Kea DHCP — Advanced Active/Passive' : 'ISC DHCP Failover Protocol'}
          </div>
        </div>

        {/* Association list */}
        {myAssociations.length > 0 && (
          <div className="px-3 py-2 space-y-1.5 max-h-52 overflow-y-auto">
            {myAssociations.map((assoc, i) => {
              const partnerMember = assoc.members.find(m => m.rowId !== site.id);
              const partnerSite = sites.find(s => s.id === partnerMember?.rowId);
              const myMember = assoc.members.find(m => m.rowId === site.id);
              const myLbl = unitLabel(site.id, site.name);
              const partnerLbl = unitLabel(partnerMember?.rowId || '', partnerSite?.name || '?');
              const isAutoName = !assoc.name || /^(foa-\d|assoc-)/.test(assoc.name);
              return (
                <div key={assoc.id} className="flex items-start gap-2 rounded bg-muted/40 px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground font-bold w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold font-mono">{myLbl} ↔ {partnerLbl}</div>
                    {!isAutoName && <div className="text-muted-foreground truncate text-[10px]">{assoc.name}</div>}
                    {isUddi && (
                      <div className="text-muted-foreground capitalize">
                        My role: <span className="text-foreground">{myMember?.role || 'peer'}</span>
                      </div>
                    )}
                  </div>
                  {onRemoveAssociation && (
                    <button
                      onClick={() => onRemoveAssociation(assoc.id)}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded shrink-0 mt-0.5"
                      title="Remove association"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {/* Sibling spokes — other sites also paired with the same hub */}
            {partnerCount === 1 && (() => {
              const assoc = myAssociations[0];
              const hubId = assoc.members.find(m => m.rowId !== site.id)?.rowId;
              const siblings = dhcpAssociations
                .filter(a => a.id !== assoc.id && a.members.some(m => m.rowId === hubId))
                .map(a => {
                  const sibId = a.members.find(m => m.rowId !== hubId)?.rowId;
                  return sites.find(s => s.id === sibId);
                })
                .filter(Boolean);
              if (!siblings.length) return null;
              return (
                <div className="text-[10px] text-muted-foreground pt-1 pl-6">
                  <span className="font-medium">Siblings: </span>
                  {siblings.map(s => s.name).join(', ')}
                </div>
              );
            })()}
          </div>
        )}
        {myAssociations.length === 0 && (
          <div className="px-3 py-3 text-xs text-muted-foreground italic">No associations yet.</div>
        )}

        {/* Add Partner form */}
        <div className="border-t px-3 py-2">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Add Partner
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">New {isUddi ? 'HA Group' : 'FOA'}</div>
              <Select value={newPartnerSiteId} onValueChange={setNewPartnerSiteId}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select partner..." />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePartners.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No eligible partners</div>
                  )}
                  {eligiblePartners.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newAssocName}
                onChange={e => setNewAssocName(e.target.value)}
                placeholder={isUddi ? 'HA group name...' : 'FOA name (e.g. test)'}
                className="h-7 text-xs"
              />
              {isUddi && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">My Role</div>
                    <Select value={newMyRole} onValueChange={(v: 'active' | 'passive') => { setNewMyRole(v); setNewPartnerRole(v === 'active' ? 'passive' : 'active'); }}>
                      <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="passive">Passive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Partner Role</div>
                    <Select value={newPartnerRole} onValueChange={(v: 'active' | 'passive') => { setNewPartnerRole(v); setNewMyRole(v === 'active' ? 'passive' : 'active'); }}>
                      <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="passive">Passive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-6 text-xs flex-1" onClick={handleAdd} disabled={!newPartnerSiteId}>
                  Add
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs"
                  onClick={() => { setShowAddForm(false); setNewPartnerSiteId(''); setNewAssocName(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
        </Popover>
        {myAssociations.length > 0 && (
          <TooltipContent className="text-xs max-w-[200px] p-2" side="top">
            <div className="font-semibold text-[11px] mb-1">{isUddi ? 'HA Groups' : 'Failover Assoc.'}</div>
            <div className="space-y-1">
              {myAssociations.map((assoc) => {
                const pm = assoc.members.find(m => m.rowId !== site.id);
                const myMem = assoc.members.find(m => m.rowId === site.id);
                const myLbl = unitLabel(site.id, site.name);
                const partnerLbl = unitLabel(pm?.rowId || '', sites.find(s => s.id === pm?.rowId)?.name || '?');
                const isAutoName = !assoc.name || /^(foa-\d|assoc-)/.test(assoc.name);
                return (
                  <div key={assoc.id}>
                    <span className="font-mono">{myLbl} ↔ {partnerLbl}</span>
                    {isUddi && <span className="text-muted-foreground"> · {myMem?.role || 'peer'}</span>}
                    {!isAutoName && <div className="text-[10px] text-muted-foreground">{assoc.name}</div>}
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}


export const SiteTableRow = React.memo(function SiteTableRow({
  site, sites, drawings, activeDrawingId, platformMode, dhcpPercent,
  roleOptions, platformOptions, showHardware, showKW, showServices, showDescription = true, exportView,
  onUpdateSite, onToggleService, onTogglePerfFeature, onDeleteSite, onOpenModelDialog, onCopySiteToDrawing,
  unitAssignment, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
  dhcpAssociations = [], onAddAssociation, onRemoveAssociation, unitAssignments = {},
}: SiteTableRowProps) {
  const [confirmClearFoa, setConfirmClearFoa] = React.useState<number | null>(null);
  const [srvPopoverOpen, setSrvPopoverOpen] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState<number>(1);
  
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
    if (role === 'ND') return 'N';
    if (role === 'ND-X') return 'NX';
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
  
  // Helper to get solution from platform/role
  const getSolution = (platform) => {
    if (platform === 'NXVS')  return 'NXVS';
    if (platform === 'NXaaS') return 'NXaaS';
    if (platform === 'NX-P')  return 'NIOS-X';
    return 'NIOS';
  };

  // Helper to get SW Base SKU from model
  // TE → TE-xxx-SWSUB, ND → ND-xxx-SWBSUB, RPT → TR-SWBSUB-5005
  const getSwBaseSku = (model) => {
    if (!model) return '';
    if (model.startsWith('ND-'))    return `${model}-SWBSUB`;
    if (model.startsWith('NDX-'))  return `${model}-SWSUB`;
    if (model === 'TR-5005')        return 'TR-SWBSUB-5005';
    if (model.startsWith('NXVS-') || model.startsWith('NXaaS-')) return `${model}-SWSUB`;
    return `${model}-SWSUB`; // TE-xxx-SWSUB default
  };

  // Helper to get SW Package from role (with ACTIVATION for Reporting)
  const getSwPackage = (role, hasDiscovery) => {
    if (role === 'Reporting') return site.rptQuantity ? `ACTIVATION-${site.rptQuantity}` : 'ACTIVATION';
    if (role === 'ND')   return 'NIGD';
    if (role === 'ND-X') return 'NDX';
    if (role === 'LIC') return 'LIC';
    if (role === 'CDC') return 'CDC';
    if (role === 'GM' || role === 'GMC' || role?.startsWith('GM+') || role?.startsWith('GMC+')) return 'DDI';
    if (hasDiscovery)          return 'DDIGD';
    if (role === 'DNS/DHCP')   return 'DDIDH';
    if (role === 'DNS')        return 'DD';
    if (role === 'DHCP')       return 'DH';
    return 'DDI';
  };

  // Helper to get HW License SKU — use actual hardwareSku when available
  const getHwLicenseSku = (model, platform) => {
    if (platform !== 'NIOS' && platform !== 'NX-P') return 'VM';
    if (site.role === 'Reporting') return 'VM';
    if (site.role === 'LIC')       return '—';
    // Use the actual selected hardware SKU if available
    if (site.hardwareSku && site.hardwareSku !== 'VM' && site.hardwareSku !== 'N/A') return site.hardwareSku;
    if (!model) return '';
    return `${model}-HW-AC`;
  };

  // Build description from platform (Physical/Virtual), unit letter, role, and add-ons
  const getDescription = () => {
    // Return user-entered description if present
    if (site.description?.trim()) return site.description.trim();

    const role = site.role || '';
    const swAddonsArr = site.swAddons || [];

    // Line 1: Physical Member / Virtual Member (based on platform)
    const prefix = isPhysicalPlatform ? 'Physical Member' : 'Virtual Member';

    // Effective unit letter — from assignment (which honours override) or derived from role
    const unitLetter = unitAssignment?.unitLetter || getUnitGroup(role, site.services);

    const lines = [prefix];

    if (role === 'GM' || role.startsWith('GM+')) {
      lines.push('Grid Manager');
      lines.push('Central Management');
      if (role.includes('DNS') || role.includes('DHCP')) {
        lines.push('Int Auth DNS');
        lines.push('DHCP with Failover');
      }
    } else if (role === 'GMC' || role.startsWith('GMC+')) {
      lines.push('Grid Manager Candidate');
      lines.push('Backup Management');
      if (role.includes('DNS') || role.includes('DHCP')) {
        lines.push('Int Auth DNS');
        lines.push('DHCP with Failover');
      }
    } else if (role === 'ND') {
      lines.push('Network Insight');
      lines.push('Automated Discovery');
      lines.push('Authoritative IPAM');
    } else if (role === 'ND-X') {
      lines.push('NIOS-X Network Discovery');
      lines.push('L2/L3 Device Discovery');
      lines.push('Automated Network Insight');
    } else if (role === 'Reporting') {
      lines.push('Reporting Server');
      lines.push('Scheduled Reports');
      lines.push('Automated Data Collection');
      const size = site.rptQuantity || '500MB';
      lines.push(`${size} Daily`);
    } else if (role === 'CDC') {
      lines.push('Cloud Data Connector');
    } else if (role === 'LIC') {
      lines.push(site.name || 'License');
    } else {
      // DNS / DHCP roles — description driven by unit letter
      switch (unitLetter) {
        case 'B': // Internal Auth DNS (with or without DHCP)
          lines.push('Int. Auth. DNS');
          lines.push('Grid Secondary');
          lines.push('DHCP With Failover');
          break;
        case 'C': // DHCP
        case 'D': // Edge / Remote DHCP
          lines.push('DHCP With Failover');
          break;
        case 'E': // External / Authoritative DNS
          lines.push('Ext. Auth. DNS');
          lines.push('Grid Secondary');
          lines.push('Recursion disabled');
          break;
        case 'F': // Cache / Forwarder / DMZ
          lines.push('Cache Forwarder');
          break;
        default:
          lines.push('Int. Auth. DNS');
          lines.push('Grid Secondary');
          lines.push('DHCP With Failover');
      }
    }

    // SW add-ons that append to description
    if (swAddonsArr.includes('DDIMSGD') || swAddonsArr.includes('MS')) lines.push('Microsoft Sync');
    if (swAddonsArr.includes('ADNS')) lines.push('Advanced DNS');
    if (swAddonsArr.includes('SECECO')) lines.push('Security Ecosystem');
    if (swAddonsArr.includes('TA')) lines.push('Threat Analytics');

    return lines.join('\n');
  };

  // SW Add-ons from site.swAddons array (selected by user)
  const getSwAddonsDisplay = () => {
    const addons = [...(site.swAddons || [])];
    // Also include legacy services as add-ons
    if ((site.services || []).includes('DFP') && !addons.includes('ADP')) addons.push('ADP');
    // Add RPT with quantity if Reporting role
    if (site.role === 'Reporting' && site.rptQuantity) {
      addons.push(`RPT-${site.rptQuantity}`);
    }
    return addons.join(', ');
  };

  // HW Add-ons from site.hwAddons array — include SFP totals (per-server qty × serverCount)
  const getHwAddonsDisplay = () => {
    const serverCount = site._serverCount || 1;
    const hwSku = site.hardwareSku || '';
    const hwLabels = (site.hwAddons || []).map(v => {
      if (v === 'PSU') return hwSku.includes('-AC') ? 'T-PSU600-AC' : hwSku.includes('-DC') ? 'T-PSU600-DC' : 'T-PSU600';
      return v;
    });
    const sfpLabels = Object.entries(site.sfpAddons || {})
      .filter(([, qty]) => qty > 0)
      .map(([sfp, qty]) => `${qty * serverCount}×${sfp}`);
    return [...hwLabels, ...sfpLabels].join(', ');
  };

  // Get available SW Add-ons for this row
  const availableSwAddons = getAvailableSwAddons(site.role, site.platform);
  // Use hardwareSku (e.g. 'TE-1506-HW-AC') not recommendedModel (e.g. 'TE-1516') — HW addons match on hardware SKU
  const availableHwAddons = getAvailableHwAddons(site.hardwareSku, site.platform);
  const isReportingRole = site.role === 'Reporting';
  const isDiscoveryRow = site.role === 'ND' || site.role === 'ND-X';

  // Roles/platforms that have no SW add-ons
  const hideSwAddons = site.role === 'Reporting' || site.role === 'ND' || site.role === 'ND-X' || site.role === 'LIC' || site.role === 'CDC'
    || site.platform === 'NXVS' || site.platform === 'NXaaS';
  // Roles/platforms with no HW add-ons popover
  // ND DOES have HW (variant selector AC/DC). NX-P and RPT now have hardware — show popover.
  const hideHwAddons = site.role === 'LIC' || site.role === 'CDC'
    || site.platform === 'NXVS' || site.platform === 'NXaaS';

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
    
    // #/Range: For grouped rows, calculate range from unit number + server count
    // For individual rows, just show the unit number
    const serverCount = site._serverCount || 1;
    const unitNumber = unitAssignment?.unitNumber ?? 1;
    const unitRange = serverCount > 1 
      ? `${unitNumber}-${unitNumber + serverCount - 1}`
      : String(unitNumber);

    return (
      <TableRow data-testid={`site-row-${site.id}`} className="hover:bg-muted/30 text-xs">
        {/* Unit Group */}
        <TableCell className="p-1.5 text-center font-medium">{unitGroup}</TableCell>
        
        {/* #/Range */}
        <TableCell className="p-1.5 text-center font-mono">{unitRange}</TableCell>
        
        {/* Solution */}
        <TableCell className="p-1.5">{solution}</TableCell>
        
        {/* Model Info */}
        <TableCell className="p-1.5 font-mono">{site.recommendedModel}</TableCell>
        
        {/* SW Instances */}
        <TableCell className="p-1.5 text-center font-medium">{swInstances}</TableCell>
        
        {/* Description — multi-line with newlines */}
        <TableCell className="p-1.5 max-w-[200px] whitespace-pre-line text-[11px] leading-tight" title={description}>
          {description}
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
  
  // Calculate unitRange for grouped rows (used in non-export view)
  const serverCount = site._serverCount || 1;
  const unitNumber = unitAssignment?.unitNumber ?? 1;
  const unitRange = serverCount > 1 
    ? `${unitNumber}-${unitNumber + serverCount - 1}`
    : String(unitNumber);
  const description = getDescription();

  return (
    <TableRow
      data-testid={`site-row-${site.id}`}
      draggable={!site._isExpanded && !!onDragStart}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(); }}
      onDrop={e => { e.preventDefault(); onDrop?.(); }}
      onDragEnd={() => onDragEnd?.()}
      className={`
        ${site.isDisabledInUddi ? 'opacity-40 bg-muted/50' : ''}
        ${!site.isDisabledInUddi && site.isHub ? 'bg-accent/5' : ''}
        ${!site.isDisabledInUddi && site.isSpoke ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
        ${isDragging ? 'opacity-30' : ''}
        ${isDragOver ? 'border-t-2 border-primary' : ''}
        transition-opacity
      `}
    >
      {/* Drag handle — far left */}
      <TableCell className="p-0 w-6 text-center">
        {!site._isExpanded && onDragStart && (
          <span
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing w-full flex justify-center select-none"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}
      </TableCell>

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
                  onClick={() => {
                    // N is hard-tied to ND role
                    if (letter === 'N' && site.role !== 'ND') {
                      onUpdateSite(site.id, { unitLetterOverride: letter, role: 'ND' });
                    } else {
                      onUpdateSite(site.id, 'unitLetterOverride', letter);
                    }
                  }}
                  className={`px-1 py-1 text-xs font-bold rounded transition-colors ${
                    (unitAssignment?.unitLetter || getUnitGroup(site.role, site.services)) === letter
                      ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted'
                  }`}
                >{letter}</button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {['NX','RPT','LIC','CDC'].map(letter => (
                <button
                  key={letter}
                  onClick={() => {
                    // Auto-set role when selecting special unit letters
                    if (letter === 'NX' && site.role !== 'ND-X') {
                      onUpdateSite(site.id, { unitLetterOverride: letter, role: 'ND-X', platform: 'NXVS' });
                    } else if (letter === 'RPT' && site.role !== 'Reporting') {
                      // Atomic update for all Reporting fields
                      onUpdateSite(site.id, {
                        unitLetterOverride: letter,
                        role: 'Reporting',
                        platform: 'NIOS-V',
                        hwAddons: [],
                        sfpAddons: {},
                        rptQuantity: '500MB'
                      });
                    } else if (letter === 'LIC' && site.role !== 'LIC') {
                      onUpdateSite(site.id, { unitLetterOverride: letter, role: 'LIC' });
                    } else if (letter === 'CDC' && site.role !== 'CDC') {
                      onUpdateSite(site.id, { unitLetterOverride: letter, role: 'CDC' });
                    } else {
                      onUpdateSite(site.id, 'unitLetterOverride', letter);
                    }
                  }}
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
                  const inp = e.target as HTMLInputElement;
                  if (e.key === 'Enter' && inp.value.trim()) {
                    onUpdateSite(site.id, 'unitLetterOverride', inp.value.trim().toUpperCase());
                    inp.value = '';
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      
      {/* Unit Number — editable, shows range when combined */}
      <TableCell className="p-1 lg:p-2 text-center">
        {(site._serverCount || 1) > 1 ? (
          /* Combined group: show range string like "1-3" based on unit number */
          <span className="text-sm font-semibold tabular-nums text-primary">{unitRange}</span>
        ) : site._isExpanded && site._serverIndex !== undefined ? (
          /* Individual server within a multi-server expansion: show unit number */
          <span className="text-sm font-semibold tabular-nums text-foreground">{unitAssignment?.unitNumber ?? (site._serverIndex + 1)}</span>
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

      {/* KW - before IPs */}
      {showKW && (
        <TableCell className="p-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  type="number"
                  min="0"
                  value={site.knowledgeWorkers || ''}
                  onChange={e => onUpdateSite(site.id, 'knowledgeWorkers', parseInt(e.target.value) || 0)}
                  className={`h-7 text-sm w-16 lg:w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    !site.knowledgeWorkers ? 'ring-1 ring-amber-400 border-amber-400' : ''
                  }`}
                  disabled={site.isDisabledInUddi}
                  data-testid={`site-kw-${site.id}`}
                  placeholder="0"
                />
              </TooltipTrigger>
              {!site.knowledgeWorkers && (
                <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border border-border max-w-[200px]">
                  <div className="font-medium text-amber-500">Knowledge Workers not set</div>
                  <div className="text-muted-foreground mt-0.5">Enter the number of KW users to improve DNS sizing accuracy.</div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      )}

      {/* # IPs — not applicable for Reporting; shows "Devices" for ND/ND-X */}
      <TableCell className="p-1">
        {isReportingRole ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (() => {
          const isDiscoveryRole = site.role === 'ND' || site.role === 'ND-X';
          const isEmpty = !site.numIPs || site.numIPs === 0;
          const autoIPs = site.numIPsAuto || 0;
          const deviates = !isDiscoveryRole && autoIPs > 0 && !isEmpty &&
            Math.abs(site.numIPs - autoIPs) / autoIPs > 0.20;
          const needsHighlight = (isEmpty || deviates) && !site.isDisabledInUddi;
          const ipTooltip = isDiscoveryRole
            ? (isEmpty
              ? { title: 'Device count not entered', body: site.role === 'ND-X' ? 'Enter the number of L2/L3 devices (switches & routers) to calculate sizing.' : 'Enter the number of managed IPs/devices.' }
              : null)
            : isEmpty
            ? { title: 'IP count not entered', body: 'Enter the number of managed IPs to calculate sizing.' }
            : deviates
            ? { title: `Deviates from auto (${autoIPs.toLocaleString()})`, body: `Your value differs by more than 20% from the auto-calculated ${autoIPs.toLocaleString()} IPs. Verify this is intentional.` }
            : null;
          return (
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={site.numIPs || ''}
                      onChange={e => onUpdateSite(site.id, 'numIPs', parseInt(e.target.value) || 0)}
                      placeholder={isDiscoveryRole ? 'Devices' : '0'}
                      className={`h-7 text-sm w-20 lg:w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        needsHighlight ? 'ring-1 ring-amber-400 border-amber-400' : ''
                      }`}
                      disabled={site.isDisabledInUddi}
                      data-testid={`site-ips-${site.id}`}
                    />
                  </TooltipTrigger>
                  {ipTooltip && (
                    <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border border-border max-w-[220px]">
                      <div className="font-medium text-amber-500">{ipTooltip.title}</div>
                      <div className="text-muted-foreground mt-0.5">{ipTooltip.body}</div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })()}
      </TableCell>

      {/* Role — compact dropdown + description first-line subtitle (hover=full, click=edit) */}
      <TableCell className="p-1 lg:p-1.5" colSpan={isDiscoveryRow ? 1 + (showServices ? 1 : 0) + (showDescription ? 1 : 0) : 1}>
        {(() => {
          const isGmRow = site.role?.startsWith('GM') || site.role?.startsWith('GMC');
          const allDescLines = description.split('\n');
          const firstLine = allDescLines[0]; // "Physical Member" / "Virtual Member"
          const fullDesc = description;

          // Discovery rows: lock role to ND or ND-X only
          const discoveryRoleOptions = isDiscoveryRow
            ? [{ value: site.role, label: site.role, description: site.role === 'ND' ? 'Network Discovery Appliance' : 'NIOS-X Network Discovery' }]
            : null;

          return (
            <div className="space-y-0.5">
              <Select value={site.role} onValueChange={v => {
                  if (v === 'Reporting') {
                    onUpdateSite(site.id, {
                      role: v,
                      platform: 'NIOS-V',
                      hwAddons: [],
                      sfpAddons: {},
                      rptQuantity: '500MB'
                    });
                  } else {
                    onUpdateSite(site.id, 'role', v);
                  }
                }} disabled={site.isDisabledInUddi || isDiscoveryRow}>
                <SelectTrigger className="h-7 text-xs" data-testid={`site-role-${site.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(discoveryRoleOptions || roleOptions.filter(o => !o.group)).map(o => (
                    <SelectItem key={o.value} value={o.value} title={o.description}>
                      {o.label}
                    </SelectItem>
                  ))}
                  {!isDiscoveryRow && isGmRow && roleOptions.some(o => o.group === 'Grid Manager') && (
                    <>
                      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
                        Grid Manager
                      </div>
                      {roleOptions.filter(o => o.group === 'Grid Manager').map(o => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          title={o.description}
                          className={o.notRecommended ? 'text-amber-600 dark:text-amber-400' : ''}
                        >
                          {o.label}{o.notRecommended && ' ⚠️'}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Subtitle: hover = instant description tooltip; click = editable popover */}
              {(() => {
                const roleDesc = roleOptions.find(o => o.value === site.role)?.description;
                const subtitle = firstLine || roleDesc;
                if (!subtitle) return null;
                return (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <Popover>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button
                              className="text-[10px] text-muted-foreground w-full text-left leading-tight px-0.5 hover:text-primary truncate cursor-pointer"
                              disabled={site.isDisabledInUddi}
                            >
                              {subtitle}
                            </button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-xs text-xs whitespace-pre-line bg-popover text-popover-foreground border border-border">
                          {fullDesc}
                        </TooltipContent>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="space-y-2">
                            <div className="font-medium text-sm">Description</div>
                            <div className="text-xs text-muted-foreground whitespace-pre-line bg-muted/40 rounded px-2 py-1.5 border border-border">
                              {fullDesc}
                            </div>
                            <textarea
                              value={site.description || ''}
                              onChange={e => onUpdateSite(site.id, 'description', e.target.value)}
                              placeholder={description}
                              className="w-full min-h-[60px] text-sm rounded border border-border bg-background px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                              rows={3}
                            />
                            <p className="text-[10px] text-muted-foreground">Override auto-generated description for export.</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
          );
        })()}
      </TableCell>

      {/* Description — click to open editor popover (conditionally shown; skipped for discovery rows) */}
      {showDescription && !isDiscoveryRow && (
      <TableCell className="p-1 lg:p-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-full text-left text-xs rounded border border-border bg-background hover:bg-muted px-2 truncate min-w-[80px]"
              disabled={site.isDisabledInUddi}
              title={site.description || description}
            >
              {site.description ? (
                <span>{site.description}</span>
              ) : (
                <span className="text-muted-foreground">{description.replace(/\n/g, ', ')}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <div className="font-medium text-sm">Description</div>
              <textarea
                value={site.description || ''}
                onChange={e => onUpdateSite(site.id, 'description', e.target.value)}
                placeholder={description}
                className="w-full min-h-[80px] text-sm rounded border border-border bg-background px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">Leave empty to use auto-generated text in exports. Multi-line supported.</p>
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      )}

      {/* Services (conditional; skipped for discovery rows — absorbed by Role colspan) */}
      {showServices && !isDiscoveryRow && (
        <TableCell className="p-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="min-h-[28px] h-auto text-xs w-full justify-between items-start py-1"
                disabled={site.isDisabledInUddi}
                data-testid={`site-services-${site.id}`}
              >
                {(() => {
                  const selected = [
                    ...(site.effectivePerfFeatures || []),
                    ...(site.services || []),
                  ];
                  if (selected.length === 0) {
                    return <span className="text-muted-foreground">&mdash;</span>;
                  }
                  return (
                    <span className="flex flex-col items-start gap-0 text-left leading-tight">
                      {selected.map(s => (
                        <span key={s} className="text-[10px] font-semibold block">{s}</span>
                      ))}
                    </span>
                  );
                })()}
                <Settings2 className="h-3 w-3 lg:h-4 lg:w-4 ml-1 flex-shrink-0 mt-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                {/* Performance Features — high impact, affects model sizing */}
                {(() => {
                  // NX platforms (NXVS, NXaaS, NX-P) use net_qps = rated_qps — no reductions apply
                  const isNxPlatform = site.platform === 'NXVS' || site.platform === 'NXaaS' || site.platform === 'NX-P';
                  if (isNxPlatform) return null;
                  const availPerf = getAvailablePerfFeatures(site.role);
                  const hasFO = site.isHub || site.isSpoke;
                  const hasDhcpRole = site.role === 'DHCP' || site.role === 'DNS/DHCP' || 
                                      site.role?.includes('+DHCP') || site.role?.includes('+DNS/DHCP');
                  // DHCP-FP auto-injected from global fingerprinting answer (not manually set)
                  const fpAutoApplied = hasDhcpRole &&
                    (site.effectivePerfFeatures || []).includes('DHCP-FP') &&
                    !(site.perfFeatures || []).includes('DHCP-FP');
                  // Filter out DHCP-FP from manual list when auto-applied so there's no duplicate
                  const manualPerf = availPerf.filter(f => !(f.value === 'DHCP-FP' && fpAutoApplied));
                  if (manualPerf.length === 0 && !hasFO && !fpAutoApplied) return null;
                  return (
                    <>
                      <div className="font-medium text-sm">Performance Features</div>
                      <p className="text-xs text-muted-foreground">These reduce effective server capacity and affect model sizing.</p>
                      {/* Auto-applied rows (full width) */}
                      {(hasFO && hasDhcpRole) && (
                        <div className="flex items-center gap-2 opacity-80">
                          <Checkbox checked={true} disabled={true} />
                          <span className="text-xs">
                            <span className="font-medium">DHCP FO</span>
                            <span className="text-red-500 ml-1">−50% LPS</span>
                            <Badge variant="outline" className="ml-1 text-[9px] py-0">auto</Badge>
                          </span>
                        </div>
                      )}
                      {fpAutoApplied && (
                        <div className="flex items-center gap-2 opacity-80">
                          <Checkbox checked={true} disabled={true} />
                          <span className="text-xs">
                            <span className="font-medium">Fingerprinting</span>
                            <span className="text-red-500 ml-1">−10% LPS</span>
                            <Badge variant="outline" className="ml-1 text-[9px] py-0">auto</Badge>
                          </span>
                        </div>
                      )}
                      {/* Manual toggles in 2-column grid */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                        {manualPerf.map(feat => (
                          <div key={feat.value} className="flex items-start gap-1.5">
                            <Checkbox
                              id={`${site.id}-perf-${feat.value}`}
                              checked={(site.perfFeatures || []).includes(feat.value)}
                              onCheckedChange={() => onTogglePerfFeature?.(site.id, feat.value)}
                              data-testid={`perf-${site.id}-${feat.value}`}
                              className="mt-0.5 shrink-0"
                            />
                            <label htmlFor={`${site.id}-perf-${feat.value}`} className="text-xs cursor-pointer leading-tight">
                              <span className="font-medium block">{feat.label}</span>
                              <span className="text-red-500">−{feat.impactPercent}% {feat.impactType.toUpperCase()}</span>
                              {feat.warning && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 inline ml-0.5 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">{feat.warning}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Co-located Services — CPU impact on DNS/DHCP workloads */}
                {(() => {
                  const isNios = platformMode === 'NIOS' || platformMode === 'Hybrid';
                  const visibleServices = ADDITIONAL_SERVICES.filter(s =>
                    (!s.niosOnly || isNios) &&
                    !(s.excludePlatforms || []).includes(site.platform)
                  );
                  const checkedServices: string[] = site.services || [];
                  // Count Multi-Master DNS members across grid for best-practice warning
                  const mmDnsCount = sites.filter(s =>
                    !s.isDisabledInUddi &&
                    (s.services || []).includes('MULTI-MASTER') &&
                    (s.role || '').includes('DNS')
                  ).length;
                  return (
                    <div className="border-t pt-3">
                      <div className="font-medium text-sm">Co-located Services</div>
                      <p className="text-xs text-muted-foreground">Affects CPU capacity — directly related to DNS and DHCP workload sizing.</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2">
                        {visibleServices.map(svc => {
                          const isChecked = checkedServices.includes(svc.value);
                          const showBpWarning = svc.value === 'MULTI-MASTER' && isChecked && mmDnsCount > 5;
                          return (
                            <div key={svc.value} className="flex items-start gap-1.5 col-span-1">
                              <Checkbox
                                id={`${site.id}-${svc.value}`}
                                checked={isChecked}
                                onCheckedChange={() => onToggleService(site.id, svc.value)}
                                data-testid={`checkbox-${site.id}-${svc.value}`}
                                className="mt-0.5 shrink-0"
                              />
                              <label htmlFor={`${site.id}-${svc.value}`} className="text-xs cursor-pointer leading-tight">
                                <span className="font-medium block">{svc.label}{svc.niosOnly && <span className="ml-1 text-[9px] text-muted-foreground font-normal">NIOS</span>}</span>
                                {svc.impact > 0 && <span className="text-amber-600">+{svc.impact}% CPU</span>}
                                {isChecked && svc.warning && (
                                  <span className={`block mt-0.5 text-[10px] leading-tight ${showBpWarning ? 'text-red-500' : 'text-amber-600'}`}>
                                    ⚠ {showBpWarning ? svc.warning : svc.warning}
                                  </span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      {/* Multi-Master grid-level warning */}
                      {mmDnsCount > 5 && (
                        <div className="mt-2 text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1 border border-red-200 dark:border-red-800">
                          ⚠ {mmDnsCount} DNS members with Multi-Master — Against Best Practice (max 5).
                        </div>
                      )}
                    </div>
                  );
                })()}
                {(site.serviceImpact || 0) > 0 && (
                  <div className="pt-2 border-t text-xs">
                    <span className="text-muted-foreground">CPU overhead: </span>
                    <span className="font-medium text-amber-600">+{site.serviceImpact}%</span>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
      )}

      {/* FO / HA Association (skipped for discovery rows) */}
      {!isDiscoveryRow && (
      <TableCell className="p-1">
        {(() => {
          const hasDhcp = site.role === 'DHCP' || site.role === 'DNS/DHCP' ||
            site.role.includes('+DHCP') || site.role.includes('+DNS/DHCP');
          if (!hasDhcp || site.isDisabledInUddi) {
            return <span className="text-muted-foreground text-xs">N/A</span>;
          }
          const isUddi = site.platform === 'NXVS' || site.platform === 'NXaaS';
          const myAssociations = site.siteAssociations || [];
          return (
            <FoAssocCell
              site={site}
              sites={sites}
              dhcpAssociations={dhcpAssociations}
              onAddAssociation={onAddAssociation}
              onRemoveAssociation={onRemoveAssociation}
              isUddi={isUddi}
              displayLabel={site.displayLabel || '—'}
              myAssociations={myAssociations}
              unitAssignments={unitAssignments}
            />
          );
        })()}
      </TableCell>
      )}

      {/* Server Count (Srv#) — number + stacked ±  */}
      <TableCell className="p-1" colSpan={isDiscoveryRow ? 3 : 1}>
        {site._isExpanded && site._serverIndex !== 0 ? (
          <span className="text-xs font-semibold text-center block text-muted-foreground">—</span>
        ) : site._isExpanded && site._serverIndex === 0 ? (() => {
          // First expanded sub-row: show interactive ×N trigger using parent's total count
          const parentSite = sites.find(s => s.id === site._parentSiteId);
          const parentCount = parentSite?.serverCount || 1;
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-7 px-2.5 rounded-full border text-xs font-semibold tabular-nums transition-colors bg-primary/10 border-primary text-primary hover:bg-primary/20"
                  disabled={site.isDisabledInUddi}
                  data-testid={`site-server-count-${site.id}`}
                >
                  ×{parentCount}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-3" align="start">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Member Count</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (parentCount > 1) onUpdateSite(site._parentSiteId, 'serverCount', parentCount - 1); }}
                    disabled={site.isDisabledInUddi || parentCount <= 1}
                    className="h-7 w-7 rounded border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >−</button>
                  <span className="flex-1 text-center text-lg font-bold tabular-nums">{parentCount}</span>
                  <button
                    onClick={() => { if (parentCount < 99) onUpdateSite(site._parentSiteId, 'serverCount', parentCount + 1); }}
                    disabled={site.isDisabledInUddi || parentCount >= 99}
                    className="h-7 w-7 rounded border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >+</button>
                </div>
              </PopoverContent>
            </Popover>
          );
        })() : (
          <Popover
            open={srvPopoverOpen}
            onOpenChange={(open) => {
              if (open) {
                setPendingCount(site.serverCount || 1);
              } else {
                // Commit pending count on close
                const hasDhcpRole = site.role === 'DHCP' || site.role === 'DNS/DHCP' ||
                  (site.role || '').includes('+DHCP') || (site.role || '').includes('+DNS/DHCP');
                const hasFoa = hasDhcpRole && (site.siteAssociations || []).length > 0;
                const cur = site.serverCount || 1;
                if (pendingCount !== cur) {
                  if (pendingCount > 1 && cur === 1 && hasFoa) {
                    setConfirmClearFoa(pendingCount);
                    setSrvPopoverOpen(true);
                    return;
                  }
                  onUpdateSite(site.id, 'serverCount', Math.max(1, Math.min(99, pendingCount)));
                }
                setConfirmClearFoa(null);
              }
              setSrvPopoverOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                className={`h-7 px-2.5 rounded-full border text-xs font-semibold tabular-nums transition-colors ${
                  (site.serverCount || 1) > 1
                    ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                    : 'bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
                disabled={site.isDisabledInUddi}
                data-testid={`site-server-count-${site.id}`}
              >
                ×{srvPopoverOpen ? pendingCount : (site.serverCount || 1)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-3" align="start">
              {confirmClearFoa !== null ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Remove FOA?</div>
                  <div className="text-xs text-muted-foreground">
                    This site has {(site.siteAssociations || []).length} FOA/HA group(s).
                    Increasing member count will remove them.
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-6 text-xs flex-1" onClick={() => {
                      (site.siteAssociations || []).forEach(a => onRemoveAssociation?.(a.id));
                      onUpdateSite(site.id, { serverCount: confirmClearFoa, dhcpPartner: null });
                      setConfirmClearFoa(null);
                    }}>Confirm</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setConfirmClearFoa(null); setSrvPopoverOpen(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs font-medium mb-2 text-muted-foreground">Member Count</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPendingCount(p => Math.max(1, p - 1))}
                      disabled={site.isDisabledInUddi || pendingCount <= 1}
                      className="h-7 w-7 rounded border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      data-testid={`site-srv-minus-${site.id}`}
                    >−</button>
                    <input
                      type="number"
                      min={1} max={99}
                      value={pendingCount}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setPendingCount(Math.max(1, Math.min(99, v))); }}
                      onKeyDown={e => { if (e.key === 'Enter') setSrvPopoverOpen(false); }}
                      className="flex-1 h-7 text-center text-lg font-bold tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid={`site-srv-input-${site.id}`}
                    />
                    <button
                      onClick={() => setPendingCount(p => Math.min(99, p + 1))}
                      disabled={site.isDisabledInUddi || pendingCount >= 99}
                      className="h-7 w-7 rounded border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      data-testid={`site-srv-plus-${site.id}`}
                    >+</button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Click outside or press Enter to apply</p>
                </>
              )}
            </PopoverContent>
          </Popover>
        )}
      </TableCell>

      {/* HA toggle (skipped for discovery rows — absorbed by Srv# colspan) */}
      {!isDiscoveryRow && (
      <TableCell className="p-1 text-center">
        {site.platform === 'NXVS' || site.platform === 'NX-P' || site.platform === 'NXaaS' ? (
          <span className="text-muted-foreground text-xs">N/A</span>
        ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => !site.isDisabledInUddi && onUpdateSite(site.id, 'haEnabled', !site.haEnabled)}
                data-testid={`site-ha-${site.id}`}
                disabled={site.isDisabledInUddi}
                className={`p-0.5 rounded transition-colors ${
                  site.haEnabled
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  {/* Top server slab — fully filled */}
                  <rect x="2" y="3" width="20" height="8" rx="2.5" fill="currentColor" />
                  {/* Top slab cap — slightly darker overlay */}
                  <path d="M2 5.5C2 4.12 3.12 3 4.5 3H19.5C20.88 3 22 4.12 22 5.5V6.5H2Z" fill="black" fillOpacity="0.15" />
                  {/* Top slab diamonds — white cutouts */}
                  <path d="M7 7.5L8.5 6L10 7.5L8.5 9Z" fill="white" fillOpacity="0.85" />
                  <path d="M11 7.5L12.5 6L14 7.5L12.5 9Z" fill="white" fillOpacity="0.85" />
                  {/* Bottom server slab — fully filled */}
                  <rect x="2" y="13" width="20" height="8" rx="2.5" fill="currentColor" />
                  {/* Bottom slab cap */}
                  <path d="M2 15.5C2 14.12 3.12 13 4.5 13H19.5C20.88 13 22 14.12 22 15.5V16.5H2Z" fill="black" fillOpacity="0.15" />
                  {/* Bottom slab diamonds — white cutouts */}
                  <path d="M7 17.5L8.5 16L10 17.5L8.5 19Z" fill="white" fillOpacity="0.85" />
                  <path d="M11 17.5L12.5 16L14 17.5L12.5 19Z" fill="white" fillOpacity="0.85" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent>{site.haEnabled ? 'HA enabled' : 'HA disabled'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        )}
      </TableCell>
      )}

      {/* Platform — discovery rows get restricted options */}
      <TableCell className="p-1">
        {(() => {
          const discoveryPlatformOptions = isDiscoveryRow
            ? site.role === 'ND'
              ? [{ value: 'NIOS-V', label: 'Virtual' }, { value: 'NIOS', label: 'Physical' }]
              : [{ value: 'NXVS', label: 'NX Virtual' }, { value: 'NX-P', label: 'NX Physical' }]
            : null;
          const opts = discoveryPlatformOptions || platformOptions;
          return (
            <Select value={site.platform} onValueChange={v => onUpdateSite(site.id, 'platform', v)} disabled={site.isDisabledInUddi}>
              <SelectTrigger className="h-7 text-xs" data-testid={`site-platform-${site.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          );
        })()}
      </TableCell>

      {/* Model — dropdown with auto-recommended + not-recommended options */}
      <TableCell className="p-1">
        {site.isDisabledInUddi ? (
          <span className="text-muted-foreground text-xs">&mdash;</span>
        ) : (() => {
          // Build model list for this role/platform
          const isNIOS = site.platform === 'NIOS' || site.platform === 'NIOS-V'
            || site.platform === 'NIOS-PHA' || site.platform === 'NIOS-VHA';
          const isNXVS = site.platform === 'NXVS' || site.platform === 'NX-P';
          const isNXaaS = site.platform === 'NXaaS';
          const isND = site.role === 'ND';
          const isRPT = site.role === 'Reporting';

          const isNDX = site.role === 'ND-X';

          let modelOptions = [];
          if (isND) {
            modelOptions = ['ND-906','ND-1606','ND-2306','ND-4106'];
          } else if (isNDX) {
            modelOptions = ndxServerGuardrails.map(s => s.model);
          } else if (isRPT) {
            modelOptions = ['TR-5005'];
          } else if (isNIOS) {
            modelOptions = niosServerGuardrails.map(s => s.model);
          } else if (isNXVS) {
            modelOptions = nxvsServers.map(s => s.serverSize);
          } else if (isNXaaS) {
            modelOptions = nxaasServers.map(s => s.serverSize);
          } else {
            modelOptions = [site.recommendedModel].filter(Boolean);
          }

          const auto = site.autoRecommendedModel;
          const current = site.recommendedModel;
          const isOverridden = site.isModelOverridden;

          return (
            <div className="flex items-center gap-1">
              <Select
                value={current}
                onValueChange={v => {
                  const newModel = v === auto ? auto : v;
                  const updates: Record<string, unknown> = { modelOverride: v === auto ? null : v };
                  if (isPhysicalPlatform) {
                    const newHardware = getDefaultHardwareSku(newModel);
                    updates.hardwareSku = newHardware;
                    updates.hwAddons = getDefaultHwAddons(newHardware);
                  }
                  onUpdateSite(site.id, updates);
                }}
                disabled={modelOptions.length <= 1}
                data-testid={`site-model-${site.id}`}
              >
                <SelectTrigger
                  className={`h-7 text-xs font-mono w-20 ${isOverridden ? 'border-amber-400 text-amber-600 dark:text-amber-400' : ''}`}
                >
                  <SelectValue>
                    {current ? current.replace(/^TE-/, '') : ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map(m => {
                    const isRecommended = m === auto;
                    const displayLabel = m.startsWith('TE-') ? m.replace(/^TE-/, '') : m;
                    return (
                      <SelectItem key={m} value={m}>
                        <span className="font-mono">{displayLabel}</span>
                        {isRecommended
                          ? <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">✓ rec</span>
                          : <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">⚠ not rec</span>
                        }
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-muted-foreground hover:text-primary shrink-0 p-0.5 rounded"
                      onClick={() => onOpenModelDialog(site)}
                      data-testid={`why-model-${site.id}`}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border border-border">
                    <div><span className="text-muted-foreground">Auto: </span><span className="font-medium font-mono">{auto || '—'}</span>{isOverridden && <span className="text-amber-500 ml-1">(overridden)</span>}</div>
                    <div className="text-muted-foreground mt-0.5">Click for sizing details</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })()}
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

      {/* SW Add-ons — Reporting gets storage+TR-SWTL popover; ND/NX-P/NXVS/NXaaS show —; discovery rows skip entirely */}
      {!exportView && !isDiscoveryRow && (
        <TableCell className="p-1">
          {isReportingRole ? (
            /* Reporting: ACTIVATION storage selector only — TR-SWTL is added automatically in export */
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-between" disabled={site.isDisabledInUddi}>
                  {site.rptQuantity ? (
                    <span className="truncate text-xs">{site.rptQuantity}</span>
                  ) : (
                    <span className="text-muted-foreground text-base leading-none">+</span>
                  )}
                  {site.rptQuantity && <Plus className="h-3 w-3 ml-1 flex-shrink-0" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-3" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm">ACTIVATION Storage</div>
                  <p className="text-[10px] text-muted-foreground">TR-SWTL add-on row added automatically in export.</p>
                  <Select value={site.rptQuantity || ''} onValueChange={v => onUpdateSite(site.id, 'rptQuantity', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {RPT_QUANTITIES.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          ) : hideSwAddons ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs w-full justify-between"
                disabled={site.isDisabledInUddi}
                data-testid={`site-sw-addons-${site.id}`}
              >
                {(() => {
                  const items = [];
                  if (isReportingRole && site.rptQuantity) items.push(`RPT-${site.rptQuantity}`);
                  if (site.swAddons?.length) items.push(...site.swAddons);
                  return items.length > 0 ? (
                    <div className="flex flex-col items-start gap-0 leading-tight min-w-0">
                      {items.map((item, i) => (
                        <span key={i} className="text-[10px] font-mono truncate w-full">{item}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-base leading-none">+</span>
                  );
                })()}
                {((site.swAddons?.length || 0) > 0 || (isReportingRole && site.rptQuantity)) && (
                  <Settings2 className="h-3 w-3 ml-1 flex-shrink-0" />
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
          )}
        </TableCell>
      )}

      {/* HW Add-ons — hidden for LIC, CDC, NXVS, NXaaS. ND, RPT, NX-P keep it. */}
      {!exportView && (
        <TableCell className="p-1">
          {hideHwAddons ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (isVirtualPlatform && !isReportingRole) ? (
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
                  {(() => {
                    const serverCount = site._serverCount || 1;
                    const hwLabels = (site.hwAddons || []).map(v => {
                      if (v === 'PSU') {
                        const hwSku = site.hardwareSku || '';
                        return hwSku.includes('-AC') ? 'T-PSU600-AC' : hwSku.includes('-DC') ? 'T-PSU600-DC' : 'T-PSU600';
                      }
                      return v;
                    });
                    const sfpLabels = Object.entries(site.sfpAddons || {})
                      .filter(([, qty]) => qty > 0)
                      .map(([sfp, qty]) => `${qty * serverCount}×${sfp.replace('IB-', '')}`);
                    const all = [...hwLabels, ...sfpLabels];
                    return all.length > 0 ? (
                      <div className="flex flex-col items-start gap-0 leading-tight min-w-0">
                        {all.map((item, i) => (
                          <span key={i} className="text-[10px] font-mono truncate w-full">{item}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-base leading-none">+</span>
                    );
                  })()}
                  {((site.hwAddons?.length || 0) > 0 || (site.sfpAddons && Object.keys(site.sfpAddons).length > 0)) && (
                    <Settings2 className="h-3 w-3 ml-1 flex-shrink-0" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <div className="font-medium text-sm">HW Add-ons</div>

                  {/* HW Variant selector — switch AC/DC/10GE without needing the HW SKU column */}
                  {(site.hardwareOptions || []).length > 1 && (
                    <div className="pb-2 border-b">
                      <div className="text-xs text-muted-foreground mb-1">HW Variant</div>
                      <Select
                        value={site.hardwareSku || ''}
                        onValueChange={v => {
                          onUpdateSite(site.id, { hardwareSku: v, hwAddons: getDefaultHwAddons(v), sfpAddons: {} });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(site.hardwareOptions || []).map(o => (
                            <SelectItem key={o} value={o} className="text-xs font-mono">{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* PSU — 1506 models only */}
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
                              <span className="font-medium font-mono">{displayLabel}</span>
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
                        {(() => {
                          const sfpAddons = site.sfpAddons || {};
                          const totalSfpUsed = Object.values(sfpAddons).reduce((sum: number, v) => sum + ((v as number) || 0), 0);
                          const MAX_SFP_PER_BOX = 4;
                          return SFP_OPTIONS.map(sfp => {
                          const qty = sfpAddons[sfp.value] || 0;
                          const serverCount = site._serverCount || 1;
                          const total = qty * serverCount;
                          const atMax = totalSfpUsed >= MAX_SFP_PER_BOX && qty === 0;
                          return (
                            <div key={sfp.value} className="flex items-center gap-2">
                              {/* − qty + stepper */}
                              <div className="flex items-center h-6 rounded border border-border overflow-hidden">
                                <button
                                  onClick={() => {
                                    if (qty > 0) {
                                      const updated = { ...sfpAddons, [sfp.value]: qty - 1 };
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
                                    if (totalSfpUsed < MAX_SFP_PER_BOX) {
                                      const updated = { ...sfpAddons, [sfp.value]: qty + 1 };
                                      onUpdateSite(site.id, 'sfpAddons', updated);
                                    }
                                  }}
                                  disabled={totalSfpUsed >= MAX_SFP_PER_BOX}
                                  className="h-full w-5 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 text-[10px] border-l border-border"
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
                        });
                        })()}
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

      {/* Add to Report */}
      <TableCell className="p-1 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onUpdateSite(site.id, 'addToReport', !site.addToReport)}
                data-testid={`site-report-${site.id}`}
                className={`p-1 rounded transition-colors ${
                  site.addToReport
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{site.addToReport ? 'In report' : 'Excluded from report'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Add to BOM */}
      <TableCell className="p-1 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onUpdateSite(site.id, 'addToBom', !site.addToBom)}
                data-testid={`site-bom-${site.id}`}
                className={`p-1 rounded transition-colors ${
                  site.addToBom
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{site.addToBom ? 'In BOM' : 'Excluded from BOM'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Actions: Move (grip) + Copy to Drawing + Delete */}
      <TableCell className="p-1">
        <div className="flex items-center gap-0.5">
          {/* Copy to another drawing */}
          {drawings && drawings.length > 1 && onCopySiteToDrawing && (
            <CopySiteToDrawingMenu
              site={site}
              drawings={drawings}
              activeDrawingId={activeDrawingId}
              onCopy={onCopySiteToDrawing}
            />
          )}
          {/* Delete */}
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
});

function ModelTooltipContent({ site, platformMode, dhcpPercent }) {
  const workload = getSiteWorkloadDetails(
    site.numIPs, site.role, platformMode, dhcpPercent,
    site.platform, {
      isSpoke: site.isSpoke,
      hubLPS: site.hubLPS || 0,
      foObjects: site.foObjects || 0,
      perfFeatures: site.effectivePerfFeatures || site.perfFeatures || [],
    }
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
      {workload.foObjects > 0 && (
        <div className="border-t pt-1 text-amber-500">
          <div className="font-medium">FO Object Replication:</div>
          <div>&#8226; +{workload.foObjects.toLocaleString()} DHCP objects from partner(s)</div>
        </div>
      )}
      {workload.penalties.length > 0 && (
        <div className="border-t pt-1 text-amber-600">
          <div className="font-medium">Penalties Applied:</div>
          {workload.penalties.map((p, i) => <div key={i}>&#8226; {p}</div>)}
        </div>
      )}
      {(workload.qpsMultiplier < 1 || workload.lpsMultiplier < 1) && (
        <div className="border-t pt-1 text-red-400">
          <div className="font-medium">Effective Capacity Reduction:</div>
          {workload.qpsMultiplier < 1 && <div>&#8226; QPS: {Math.round(workload.qpsMultiplier * 100)}% of rated</div>}
          {workload.lpsMultiplier < 1 && <div>&#8226; LPS: {Math.round(workload.lpsMultiplier * 100)}% of rated</div>}
        </div>
      )}
      <div className="border-t pt-1 text-muted-foreground">
        <span className="text-accent">{'\u2605'}</span> = driver metric
      </div>
    </div>
  );
}
