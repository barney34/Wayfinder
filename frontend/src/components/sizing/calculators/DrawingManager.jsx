/**
 * DrawingManager Component
 * Manages multiple drawings with tabs, copy, and compare functionality
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Copy, Trash2, FileSpreadsheet, Columns2, 
  ChevronDown, MoreHorizontal 
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

/**
 * Generate a unique drawing ID
 */
const generateDrawingId = () => `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * DrawingTabs - Tab bar for switching between drawings
 */
export function DrawingTabs({ 
  drawings, 
  activeDrawingId, 
  onSelectDrawing, 
  onAddDrawing, 
  onCopyDrawing,
  onDeleteDrawing,
  onRenameDrawing,
  onCompare 
}) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');

  const handleRename = () => {
    if (renameTarget && newName.trim()) {
      onRenameDrawing(renameTarget, newName.trim());
    }
    setShowRenameDialog(false);
    setRenameTarget(null);
    setNewName('');
  };

  const openRenameDialog = (drawing) => {
    setRenameTarget(drawing.id);
    setNewName(drawing.name);
    setShowRenameDialog(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
        <Tabs value={activeDrawingId} onValueChange={onSelectDrawing} className="flex-1">
          <TabsList className="bg-secondary h-9">
            {drawings.map((drawing) => (
              <TabsTrigger
                key={drawing.id}
                value={drawing.id}
                className="relative group data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <span className="mr-1">#{drawing.name}</span>
                <span className="text-xs opacity-70">({drawing.sites?.length || 0})</span>
                
                {/* Dropdown for each tab */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-white/20 rounded p-0.5">
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => openRenameDialog(drawing)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopyDrawing(drawing.id)}>
                      <Copy className="h-3 w-3 mr-2" />
                      Duplicate
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
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Add Drawing Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddDrawing}
          className="h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Drawing
        </Button>

        {/* Compare Button (only show if 2+ drawings) */}
        {drawings.length >= 2 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCompare}
            className="h-9"
          >
            <Columns2 className="h-4 w-4 mr-1" />
            Compare
          </Button>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Drawing</DialogTitle>
            <DialogDescription>
              Enter a new name for this drawing
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Drawing name (e.g., 20, 21, Production)"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * useDrawings Hook - Manages drawing state
 */
export function useDrawings(initialSites = []) {
  const [drawings, setDrawings] = useState(() => [{
    id: generateDrawingId(),
    name: '10', // Start at 10
    sites: initialSites,
    createdAt: new Date().toISOString(),
  }]);
  
  const [activeDrawingId, setActiveDrawingId] = useState(drawings[0].id);

  const activeDrawing = drawings.find(d => d.id === activeDrawingId) || drawings[0];

  // Get next drawing number in increments of 10
  const getNextDrawingNumber = useCallback(() => {
    const existingNumbers = drawings
      .map(d => parseInt(d.name))
      .filter(n => !isNaN(n));
    
    if (existingNumbers.length === 0) return '10';
    
    const maxNumber = Math.max(...existingNumbers);
    return String(Math.ceil((maxNumber + 1) / 10) * 10); // Round up to next 10
  }, [drawings]);

  const addDrawing = useCallback(() => {
    const newDrawing = {
      id: generateDrawingId(),
      name: getNextDrawingNumber(),
      sites: [],
      createdAt: new Date().toISOString(),
    };
    setDrawings(prev => [...prev, newDrawing]);
    setActiveDrawingId(newDrawing.id);
    return newDrawing;
  }, [getNextDrawingNumber]);

  const copyDrawing = useCallback((drawingId) => {
    const source = drawings.find(d => d.id === drawingId);
    if (!source) return;

    const newDrawing = {
      id: generateDrawingId(),
      name: `${source.name}-copy`,
      sites: JSON.parse(JSON.stringify(source.sites)), // Deep copy
      createdAt: new Date().toISOString(),
    };
    setDrawings(prev => [...prev, newDrawing]);
    setActiveDrawingId(newDrawing.id);
    return newDrawing;
  }, [drawings]);

  const deleteDrawing = useCallback((drawingId) => {
    if (drawings.length <= 1) return; // Can't delete last drawing
    
    setDrawings(prev => {
      const filtered = prev.filter(d => d.id !== drawingId);
      // If deleting active drawing, switch to first remaining
      if (drawingId === activeDrawingId) {
        setActiveDrawingId(filtered[0].id);
      }
      return filtered;
    });
  }, [drawings.length, activeDrawingId]);

  const renameDrawing = useCallback((drawingId, newName) => {
    setDrawings(prev => prev.map(d => 
      d.id === drawingId ? { ...d, name: newName } : d
    ));
  }, []);

  const updateDrawingSites = useCallback((drawingId, sites) => {
    setDrawings(prev => prev.map(d => 
      d.id === drawingId ? { ...d, sites } : d
    ));
  }, []);

  const copySiteToDrawing = useCallback((site, targetDrawingId) => {
    setDrawings(prev => prev.map(d => {
      if (d.id === targetDrawingId) {
        return { ...d, sites: [...d.sites, { ...site, id: `${site.id}-copy-${Date.now()}` }] };
      }
      return d;
    }));
  }, []);

  return {
    drawings,
    activeDrawing,
    activeDrawingId,
    setActiveDrawingId,
    addDrawing,
    copyDrawing,
    deleteDrawing,
    renameDrawing,
    updateDrawingSites,
    copySiteToDrawing,
  };
}

/**
 * CompareDrawingsDialog - Side-by-side comparison of drawings
 */
export function CompareDrawingsDialog({ open, onOpenChange, drawings }) {
  const [selectedDrawings, setSelectedDrawings] = useState([
    drawings[0]?.id,
    drawings[1]?.id
  ].filter(Boolean));

  const toggleDrawing = (id) => {
    setSelectedDrawings(prev => {
      if (prev.includes(id)) {
        return prev.filter(d => d !== id);
      }
      if (prev.length < 2) {
        return [...prev, id];
      }
      // Replace second selection
      return [prev[0], id];
    });
  };

  const drawingsToCompare = selectedDrawings
    .map(id => drawings.find(d => d.id === id))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compare Drawings</DialogTitle>
          <DialogDescription>
            Select two drawings to compare side by side
          </DialogDescription>
        </DialogHeader>

        {/* Drawing selector */}
        <div className="flex gap-2 mb-4">
          {drawings.map(d => (
            <Button
              key={d.id}
              variant={selectedDrawings.includes(d.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDrawing(d.id)}
            >
              #{d.name}
            </Button>
          ))}
        </div>

        {/* Comparison table */}
        {drawingsToCompare.length === 2 && (
          <div className="grid grid-cols-2 gap-4">
            {drawingsToCompare.map(drawing => (
              <div key={drawing.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Drawing #{drawing.name}</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  {drawing.sites?.length || 0} sites
                </div>
                <div className="space-y-1 text-xs">
                  {(drawing.sites || []).map((site, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                      <span>{site.name}</span>
                      <span className="text-muted-foreground">{site.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
