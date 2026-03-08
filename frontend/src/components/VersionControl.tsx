/**
 * VersionControl Component
 * Manages rolling (10-slot) and named (5-slot) revision history — MongoDB-backed.
 */

import { useState, useEffect, useCallback } from "react";
import { Check, X, History, Star, Trash2 } from "lucide-react";
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
  renamePersonalRevision,
  deleteRevision,
} from "@/lib/revisionHelpers";
import type { RevisionStorage, RevisionEntry } from "@/types";

interface VersionControlProps { customerId: string; }
export function VersionControl({ customerId }: VersionControlProps) {
  const { updateAnswers, setMeetingNotes, setContextField, setNote } = useDiscovery();
  const { toast } = useToast();
  const [storage, setStorage] = useState<RevisionStorage>({ customerId, dynamic: [], personal: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [renamingRevision, setRenamingRevision] = useState<{ id: string; isPersonal: boolean } | null>(null);
  const [renamingName, setRenamingName] = useState<string>('');

  const refreshRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRevisionStorage(customerId);
      setStorage(data);
    } catch (err) {
      toast({ title: "Failed to load revisions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { refreshRevisions(); }, [refreshRevisions]);

  const handleRestoreRevision = (revision) => {
    try {
      const data = JSON.parse(revision.payload);
      if (data.discoveryAnswers) updateAnswers(data.discoveryAnswers);
      if (data.meetingNotes) setMeetingNotes(data.meetingNotes);
      if (data.contextSummaries) Object.entries(data.contextSummaries).forEach(([k, v]) => { if (typeof v === 'string') setContextField(k, v); });
      if (data.discoveryNotes) Object.entries(data.discoveryNotes).forEach(([k, v]) => { if (typeof v === 'string') setNote(k, v); });
      toast({ title: "Revision restored", description: `Restored from ${new Date(revision.exportedAt).toLocaleString()}` });
    } catch {
      toast({ title: "Restore failed", variant: "destructive" });
    }
  };

  const handlePromote = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: false }); setRenamingName(''); };
  const handleRenamePersonal = (revision) => { setRenamingRevision({ id: revision.id, isPersonal: true }); setRenamingName(revision.name); };
  const handleCancelRenaming = () => { setRenamingRevision(null); setRenamingName(''); };

  const handleSaveRenaming = async () => {
    if (!renamingRevision || !renamingName.trim()) return;
    try {
      if (renamingRevision.isPersonal) {
        await renamePersonalRevision(customerId, renamingRevision.id, renamingName.trim());
        toast({ title: "Renamed" });
      } else {
        await promoteToPersonal(customerId, renamingRevision.id, renamingName.trim());
        toast({ title: "Saved as named revision" });
      }
      setRenamingRevision(null);
      setRenamingName('');
      refreshRevisions();
    } catch (err) {
      toast({ title: err.message || "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async (revisionId) => {
    try {
      await deleteRevision(customerId, revisionId);
      refreshRevisions();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Versions</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Named Revisions */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Star className="h-4 w-4" />Named Revisions ({storage.personal.length}/5)
          </Label>
          {storage.personal.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">No named revisions yet. Click "Name" on any save to pin it here.</p>
          ) : (
            <div className="space-y-2">
              {storage.personal.map((rev, i) => (
                <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20 gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingRevision?.id === rev.id && renamingRevision.isPersonal ? (
                      <div className="flex items-center gap-2">
                        <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Revision name..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-personal-revision-name-${i}`} />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ) : (
                      <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{new Date(rev.exportedAt).toLocaleString()}</p></div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleRenamePersonal(rev)} data-testid={`button-rename-personal-${i}`}>Rename</Button>
                    <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-personal-${i}`}>Restore</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(rev.id)}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rolling Saves */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />Saves ({storage.dynamic.length}/10)
            </Label>
            <Button variant="ghost" size="sm" onClick={refreshRevisions} data-testid="button-refresh-revisions">Refresh</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : storage.dynamic.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No saves yet. Hit Save to create a checkpoint.</p>
          ) : (
            <ScrollArea className="h-[250px] rounded-md border">
              <div className="p-4 space-y-2">
                {storage.dynamic.map((rev, i) => (
                  <div key={rev.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 gap-2">
                    <div className="flex-1 min-w-0">
                      {renamingRevision?.id === rev.id && !renamingRevision.isPersonal ? (
                        <div className="flex items-center gap-2">
                          <Input value={renamingName} onChange={e => setRenamingName(e.target.value)} placeholder="Name this save..." className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveRenaming(); if (e.key === 'Escape') handleCancelRenaming(); }} data-testid={`input-revision-name-${i}`} />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveRenaming}><Check className="h-3 w-3 text-primary" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelRenaming}><X className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      ) : (
                        <div><p className="text-sm font-medium truncate">{rev.name}</p><p className="text-xs text-muted-foreground">{new Date(rev.exportedAt).toLocaleString()}</p></div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handlePromote(rev)} data-testid={`button-rename-${i}`}>Name</Button>
                      <Button variant="outline" size="sm" onClick={() => handleRestoreRevision(rev)} data-testid={`button-restore-${i}`}>Restore</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(rev.id)}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></Button>
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
