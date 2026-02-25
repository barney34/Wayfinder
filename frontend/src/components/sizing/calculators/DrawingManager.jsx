/**
 * DrawingManager Component
 * Manages multiple drawings with tabs, copy, and compare functionality
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Copy, Trash2, Columns2, MoreHorizontal, FilePlus, ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * Generate a unique drawing ID
 */
const generateDrawingId = () => `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * DrawingTabs - Tab bar for switching between drawings
 * Props:
 *  - currentSiteCount: number of sites in the active drawing (from context)
 */
export function DrawingTabs({
  drawings,
  activeDrawingId,
  onSelectDrawing,
  onAddDrawing,
  onCloneDrawing,
  onCopyDrawing,
  onDeleteDrawing,
  onRenameDrawing,
  onCompare,
  currentSiteCount = 0,
}) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');

  const handleRename = () => {
    if (!renameTarget || !newName.trim()) return;
    if (!/^\d+$/.test(newName.trim())) {
      setRenameError('Drawing name must be a number (e.g., 10, 20)');
      return;
    }
    onRenameDrawing(renameTarget, newName.trim());
    setShowRenameDialog(false);
    setRenameTarget(null);
    setNewName('');
    setRenameError('');
  };

  const openRenameDialog = (drawing) => {
    setRenameTarget(drawing.id);
    setNewName(drawing.name);
    setRenameError('');
    setShowRenameDialog(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2 flex-wrap">
        {/* Drawing Tabs */}
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          {drawings.map((drawing) => {
            const isActive = drawing.id === activeDrawingId;
            // For active drawing use the live site count; for others use stored
            const count = isActive ? currentSiteCount : (drawing.sites?.length || 0);
            return (
              <div
                key={drawing.id}
                className={`group relative flex items-center rounded-md transition-colors cursor-pointer select-none
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                {/* Tab button */}
                <button
                  onClick={() => onSelectDrawing(drawing.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                >
                  <span>#{drawing.name}</span>
                  <span className={`text-[10px] ${isActive ? 'opacity-75' : 'opacity-50'}`}>
                    ({count})
                  </span>
                </button>

                {/* Per-tab dropdown — always accessible via MoreHorizontal */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-1 py-1.5 rounded-r-md transition-colors
                        ${isActive
                          ? 'hover:bg-primary/80'
                          : 'opacity-60 hover:opacity-100 hover:bg-muted'
                        }`}
                      onClick={(e) => e.stopPropagation()}
                      title="Drawing options"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => openRenameDialog(drawing)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => (onCloneDrawing || onCopyDrawing)(drawing.id)}>
                      <Copy className="h-3 w-3 mr-2" />
                      Clone Drawing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteDrawing(drawing.id)}
                      disabled={drawings.length <= 1}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>

        {/* New Drawing — dropdown with Blank or Clone options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 shrink-0">
              <Plus className="h-3.5 w-3.5" />
              New Drawing
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddDrawing}>
              <FilePlus className="h-3.5 w-3.5 mr-2" />
              Blank Drawing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (onCloneDrawing || onCopyDrawing)(activeDrawingId)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Clone Current Drawing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Compare Button (only show if 2+ drawings) */}
        {drawings.length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCompare}
            className="h-8 shrink-0"
          >
            <Columns2 className="h-3.5 w-3.5 mr-1" />
            Compare
          </Button>
        )}
      </div>

      {/* Rename Dialog — numbers only */}
      <Dialog open={showRenameDialog} onOpenChange={(o) => { setShowRenameDialog(o); if (!o) { setRenameError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Drawing</DialogTitle>
            <DialogDescription>
              Enter a number for this drawing (e.g., 10, 20, 30)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(e) => {
                // Only allow digits
                const val = e.target.value.replace(/[^0-9]/g, '');
                setNewName(val);
                setRenameError('');
              }}
              placeholder="Drawing number (e.g., 20)"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              type="number"
              min="1"
            />
            {renameError && (
              <p className="text-xs text-destructive">{renameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * useDrawings Hook — stub (drawings now managed in DiscoveryContext)
 */
export function useDrawings() {
  return {};
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

function siteKey(site) {
  // Use the site's stable id as the primary key for diff matching
  return site.id || `${site.name || '?'}::${site.role || '?'}`;
}

function siteLabel(site) {
  if (!site) return '—';
  return [site.name, site.role, site.recommendedModel || site.model, site.platform]
    .filter(Boolean).join(' · ');
}

function diffSiteLabel(a, b) {
  // Return fields that changed
  const fields = ['role', 'recommendedModel', 'platform', 'numIPs', 'haEnabled', 'serverCount'];
  const changed = [];
  fields.forEach(f => {
    const va = a?.[f] ?? '—';
    const vb = b?.[f] ?? '—';
    if (String(va) !== String(vb)) {
      changed.push(`${f}: ${va} → ${vb}`);
    }
  });
  return changed.join(', ') || '(no field differences)';
}

/**
 * CompareDrawingsDialog - Unified diff view of two drawings
 */
export function CompareDrawingsDialog({ open, onOpenChange, drawings, currentSites = [], drawingConfigs = {} }) {
  const [selectedA, setSelectedA] = useState(drawings[0]?.id);
  const [selectedB, setSelectedB] = useState(drawings[1]?.id);

  const drawingA = drawings.find(d => d.id === selectedA);
  const drawingB = drawings.find(d => d.id === selectedB);

  // Build effective site list for a drawing.
  // currentSites = processed sites from TokenCalculatorSummary (already has active drawing overrides).
  // We re-apply each drawing's siteOverrides on top of the base site data.
  const getEffectiveSites = (drawingId) => {
    const overrides = drawingConfigs[drawingId]?.siteOverrides || {};
    return currentSites.map(s => {
      // siteOverrides keys match the computed site's id (e.g. "dc-123", "site-456")
      const ovr = overrides[s.id] || {};
      return { ...s, ...ovr };
    });
  };

  const sitesA = drawingA ? getEffectiveSites(selectedA) : [];
  const sitesB = drawingB ? getEffectiveSites(selectedB) : [];

  // Build unified diff
  const buildDiff = () => {
    const mapA = new Map(sitesA.map(s => [siteKey(s), s]));
    const mapB = new Map(sitesB.map(s => [siteKey(s), s]));

    const allKeys = [...new Set([...mapA.keys(), ...mapB.keys()])];

    // Sort by insertion order (A first, then B-only)
    const orderedKeys = [
      ...sitesA.map(siteKey),
      ...sitesB.map(siteKey).filter(k => !mapA.has(k)),
    ];

    return orderedKeys.map(key => {
      const a = mapA.get(key);
      const b = mapB.get(key);
      if (a && b) {
        const fieldsMatch = ['role', 'recommendedModel', 'platform', 'numIPs', 'haEnabled', 'serverCount']
          .every(f => String(a[f] ?? '') === String(b[f] ?? ''));
        return { key, type: fieldsMatch ? 'same' : 'changed', a, b };
      }
      if (a && !b) return { key, type: 'removed', a, b: null };
      return { key, type: 'added', a: null, b };
    });
  };

  const diff = (drawingA && drawingB) ? buildDiff() : [];

  const diffCounts = {
    same: diff.filter(r => r.type === 'same').length,
    changed: diff.filter(r => r.type === 'changed').length,
    removed: diff.filter(r => r.type === 'removed').length,
    added: diff.filter(r => r.type === 'added').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compare Drawings</DialogTitle>
          <DialogDescription>
            Line-by-line diff between two drawings. Green = added to B, Red = removed from B, Yellow = changed.
          </DialogDescription>
        </DialogHeader>

        {/* Drawing selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Drawing A (base):</span>
            <div className="flex gap-1">
              {drawings.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedA(d.id)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    selectedA === d.id
                      ? 'bg-red-500/80 text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  #{d.name}
                </button>
              ))}
            </div>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Drawing B (compare):</span>
            <div className="flex gap-1">
              {drawings.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedB(d.id)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    selectedB === d.id
                      ? 'bg-green-500/80 text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  #{d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diff summary badges */}
        {diff.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {diffCounts.same > 0 && <span className="px-2 py-0.5 text-[11px] rounded bg-muted text-muted-foreground">{diffCounts.same} unchanged</span>}
            {diffCounts.changed > 0 && <span className="px-2 py-0.5 text-[11px] rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">{diffCounts.changed} changed</span>}
            {diffCounts.removed > 0 && <span className="px-2 py-0.5 text-[11px] rounded bg-red-500/20 text-red-700 dark:text-red-400">{diffCounts.removed} removed</span>}
            {diffCounts.added > 0 && <span className="px-2 py-0.5 text-[11px] rounded bg-green-500/20 text-green-700 dark:text-green-400">{diffCounts.added} added</span>}
          </div>
        )}

        {/* Diff table */}
        {selectedA && selectedB && selectedA !== selectedB ? (
          <div className="border rounded-lg overflow-hidden text-xs">
            {/* Header */}
            <div className="grid grid-cols-[24px_1fr_1fr] bg-muted/80 border-b font-semibold">
              <div className="p-2 text-center">Δ</div>
              <div className="p-2 border-l">Drawing #{drawingA?.name} (A)</div>
              <div className="p-2 border-l">Drawing #{drawingB?.name} (B)</div>
            </div>

            {diff.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">No sites to compare</div>
            )}

            {diff.map((row, idx) => {
              const bgClass = {
                same:    'bg-background',
                changed: 'bg-yellow-500/10 border-l-2 border-yellow-500/50',
                removed: 'bg-red-500/10 border-l-2 border-red-500/50',
                added:   'bg-green-500/10 border-l-2 border-green-500/50',
              }[row.type];

              const icon = {
                same: <span className="text-muted-foreground">·</span>,
                changed: <span className="text-yellow-600 font-bold">~</span>,
                removed: <span className="text-red-600 font-bold">−</span>,
                added: <span className="text-green-600 font-bold">+</span>,
              }[row.type];

              return (
                <div key={idx} className={`grid grid-cols-[24px_1fr_1fr] border-b last:border-0 ${bgClass}`}>
                  <div className="p-2 text-center font-mono">{icon}</div>
                  {/* Column A */}
                  <div className="p-2 border-l">
                    {row.a ? (
                      <div>
                        <span className="font-medium">{row.a.name}</span>
                        <span className="text-muted-foreground ml-2">{row.a.role}</span>
                        {row.a.recommendedModel && <span className="ml-2 text-muted-foreground">[{row.a.recommendedModel}]</span>}
                        {row.a.platform && <span className="ml-2 opacity-60">{row.a.platform}</span>}
                        {row.a.haEnabled && <span className="ml-2 text-primary text-[10px]">HA</span>}
                      </div>
                    ) : <span className="text-muted-foreground/40 italic">—</span>}
                  </div>
                  {/* Column B */}
                  <div className="p-2 border-l">
                    {row.b ? (
                      <div>
                        <span className="font-medium">{row.b.name}</span>
                        <span className="text-muted-foreground ml-2">{row.b.role}</span>
                        {row.b.recommendedModel && <span className="ml-2 text-muted-foreground">[{row.b.recommendedModel}]</span>}
                        {row.b.platform && <span className="ml-2 opacity-60">{row.b.platform}</span>}
                        {row.b.haEnabled && <span className="ml-2 text-primary text-[10px]">HA</span>}
                      </div>
                    ) : <span className="text-muted-foreground/40 italic">—</span>}
                    {row.type === 'changed' && (
                      <div className="mt-1 text-[10px] text-yellow-700 dark:text-yellow-400">
                        ↳ {diffSiteLabel(row.a, row.b)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6 text-sm">
            {selectedA === selectedB ? 'Select two different drawings to compare' : 'Select drawings above'}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * CopySiteToDrawingMenu - Dropdown to copy a site to another drawing
 */
export function CopySiteToDrawingMenu({ site, drawings, activeDrawingId, onCopy }) {
  const otherDrawings = drawings.filter(d => d.id !== activeDrawingId);

  if (otherDrawings.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Copy className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2 py-1 text-xs text-muted-foreground">Copy to drawing:</div>
        {otherDrawings.map(d => (
          <DropdownMenuItem key={d.id} onClick={() => onCopy(site, d.id)}>
            #{d.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
