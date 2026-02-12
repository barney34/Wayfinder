/**
 * VersionControl Component
 * Manages auto-saves and named revisions for discovery data
 */

import { useState } from "react";
import { Check, X, History, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { 
  getRevisionStorage, 
  promoteToPersonal, 
  renamePersonalRevision 
} from "@/lib/revisionHelpers";

export function VersionControl({ customerId }) {
  const { updateAnswers, setMeetingNotes, setContextField, setNote } = useDiscovery();
  const { toast } = useToast();
  const [revisionStorage, setRevisionStorage] = useState(() => getRevisionStorage(customerId));
  const [renamingRevision, setRenamingRevision] = useState(null);
  const [renamingName, setRenamingName] = useState('');

  const refreshRevisions = () => setRevisionStorage(getRevisionStorage(customerId));

  const handleRestoreRevision = (revision) => {
    try {
      const data = JSON.parse(revision.payload);
      if (data.discoveryAnswers) updateAnswers(data.discoveryAnswers);
      if (data.meetingNotes) setMeetingNotes(data.meetingNotes);
      if (data.contextSummaries) Object.entries(data.contextSummaries).forEach(([k, v]) => { if (typeof v === 'string') setContextField(k, v); });
      if (data.discoveryNotes) Object.entries(data.discoveryNotes).forEach(([k, v]) => { if (typeof v === 'string') setNote(k, v); });
      toast({ title: "Revision restored", description: `Restored data from ${new Date(revision.exportedAt).toLocaleString()}` });
    } catch (err) {
      toast({ title: "Restore failed", description: "Failed to restore revision data.", variant: "destructive" });
    }
  };

  const handlePromote = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: false }); setRenamingName(revision.name); };
  const handleRenamePersonal = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: true }); setRenamingName(revision.name); };

  const handleSaveRenaming = () => {
    if (!renamingRevision) return;
    if (renamingRevision.isPersonal) renamePersonalRevision(customerId, renamingRevision.id, renamingName);
    else promoteToPersonal(customerId, renamingRevision.id, renamingName);
    refreshRevisions();
    setRenamingRevision(null);
    toast({ title: renamingRevision.isPersonal ? "Renamed" : "Saved to Personal", description: renamingRevision.isPersonal ? "Personal save renamed." : "Revision saved as a personal save." });
  };

  const handleCancelRenaming = () => { setRenamingRevision(null); setRenamingName(''); };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Versions</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Named Revisions */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4" />Named Revisions ({revisionStorage.personal.length}/5)</Label>
          {revisionStorage.personal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">No named revisions yet. Click "Rename" on any auto-save to add it here.</p>
          ) : (
            <div className="space-y-2">
              {revisionStorage.personal.map((rev, i) => (
                <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20 gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingRevision?.id === rev.id && renamingRevision.isPersonal ? (
                      <div className="flex items-center gap-2">
                        <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Revision name..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-personal-revision-name-${i}`} />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ) : (
                      <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{new Date(rev.exportedAt).toLocaleString()}</p></div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleRenamePersonal(rev)} data-testid={`button-rename-personal-${i}`}>Rename</Button>
                    <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-personal-${i}`}>Restore</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Auto-Saves */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Auto-Saves ({revisionStorage.dynamic.length}/10)</Label>
            <Button variant="ghost" size="sm" onClick={refreshRevisions} data-testid="button-refresh-revisions">Refresh</Button>
          </div>
          {revisionStorage.dynamic.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No auto-saves yet. Saves, exports, and imports will appear here.</p>
          ) : (
            <ScrollArea className="h-[250px] rounded-md border">
              <div className="p-4 space-y-2">
                {revisionStorage.dynamic.map((rev, i) => (
                  <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 gap-2">
                    <div className="flex-1 min-w-0">
                      {renamingRevision?.id === rev.id && !renamingRevision.isPersonal ? (
                        <div className="flex items-center gap-2">
                          <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Save as personal..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-revision-name-${i}`} />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      ) : (
                        <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{rev.format?.toUpperCase() || 'SAVE'}</p></div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handlePromote(rev)} data-testid={`button-rename-${i}`}>Rename</Button>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-${i}`}>Restore</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
