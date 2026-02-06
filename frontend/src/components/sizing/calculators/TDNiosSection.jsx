import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { tokenModels, x5Models, x6Models } from "@/lib/tokenData";
import { safeParseTDNios } from '../parsers';

export function TDNiosSection({ value, onChange, questionId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('X6');
  const [selectedAppSize, setSelectedAppSize] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const data = safeParseTDNios(value);
  const { enabled, collapsed, tokens } = data;
  const availableModels = selectedModel === 'X5' ? x5Models : x6Models;

  const updateData = (updates) => onChange(JSON.stringify({ ...data, ...updates }));

  const handleToggleEnabled = (newEnabled) => {
    if (!newEnabled) updateData({ enabled: false, tokens: [] });
    else updateData({ enabled: true, collapsed: false });
  };

  const handleAddToken = () => {
    if (!selectedAppSize || selectedQuantity < 1) return;
    const model = tokenModels.find(m => m.model === selectedModel && m.appSize === parseInt(selectedAppSize));
    if (model) {
      const newToken = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, model: model.model, appSize: model.appSize, tokens: model.tokens, quantity: selectedQuantity };
      updateData({ tokens: [...tokens, newToken] });
      setSelectedAppSize(''); setSelectedQuantity(1); setDialogOpen(false);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-md" data-testid={`td-nios-section-${questionId}`}>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent" onClick={() => updateData({ collapsed: !collapsed })} data-testid={`td-nios-header-${questionId}`}>
          {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">TD for NIOS</span>
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">No</span>
          <Switch checked={enabled} onCheckedChange={handleToggleEnabled} data-testid={`td-nios-toggle-${questionId}`} />
          <span className="text-xs text-muted-foreground">Yes</span>
        </div>
      </div>
      {!collapsed && enabled && (
        <div className="space-y-3 pl-4">
          <div className="text-sm text-muted-foreground">Select Series, Model, and QTY</div>
          {tokens.length > 0 && tokens.map((token, index) => (
            <div key={token.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-2" data-testid={`td-nios-config-row-${questionId}-${index}`}>
              <span className="text-sm font-medium min-w-[60px]">{token.model} {token.appSize}</span>
              <span className="text-sm text-muted-foreground">x</span>
              <Input type="number" min="1" value={token.quantity} onChange={(e) => updateData({ tokens: tokens.map(t => t.id === token.id ? { ...t, quantity: parseInt(e.target.value) || 1 } : t) })} className="w-16 h-8 text-center" />
              <span className="text-sm text-muted-foreground flex-1">({(token.tokens * token.quantity).toLocaleString()} tokens)</span>
              <Button size="icon" variant="ghost" onClick={() => updateData({ tokens: tokens.filter(t => t.id !== token.id) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} data-testid={`td-nios-add-${questionId}`}><Plus className="h-4 w-4 mr-1" />Add Configuration</Button>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Series, Model, & QTY</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Series</label>
              <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setSelectedAppSize(''); }}>
                <SelectTrigger><SelectValue placeholder="Select series..." /></SelectTrigger>
                <SelectContent><SelectItem value="X5">X5</SelectItem><SelectItem value="X6">X6</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Model</label>
              <Select value={selectedAppSize} onValueChange={setSelectedAppSize}>
                <SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger>
                <SelectContent>{availableModels.map(m => <SelectItem key={m.appSize} value={m.appSize.toString()}>{m.appSize} ({m.tokens.toLocaleString()} tokens)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">QTY</label>
              <Input type="number" min="1" value={selectedQuantity} onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)} className="w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToken} disabled={!selectedAppSize}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
