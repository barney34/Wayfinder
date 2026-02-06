import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, X, Loader2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { discoveryQuestions } from "@/lib/questions";

export function MeetingNotesAI() {
  const { meetingNotes, setMeetingNotes, setAnswer } = useDiscovery();
  const [isProcessing, setIsProcessing] = useState(false);
  const [matches, setMatches] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const handleAnalyze = async () => {
    if (!meetingNotes.trim()) { toast({ title: "No meeting notes", description: "Please enter meeting notes to analyze", variant: "destructive" }); return; }
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/analyze-notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: meetingNotes }) });
      if (!response.ok) throw new Error('Failed to analyze meeting notes');
      const data = await response.json();
      const aiMatches = (data.matches || []).map(match => {
        const question = discoveryQuestions.find(q => q.id === match.questionId);
        return { questionId: match.questionId, section: question?.section || 'Unknown', question: question?.question || '', extractedAnswer: match.answer, confidence: match.confidence === 'high' ? 0.9 : 0.7 };
      });
      setMatches(aiMatches);
      toast({ title: "Analysis complete", description: `Found ${aiMatches.length} potential matches` });
    } catch (error) {
      console.error('Error analyzing notes:', error);
      toast({ title: "Analysis failed", description: "Failed to analyze meeting notes. Please try again.", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const handleAccept = (questionId) => { const match = matches.find(m => m.questionId === questionId); if (match) setAnswer(questionId, match.extractedAnswer); setMatches(prev => prev.filter(m => m.questionId !== questionId)); };
  const handleReject = (questionId) => { setMatches(prev => prev.filter(m => m.questionId !== questionId)); };
  const handleAcceptAll = () => { matches.forEach(match => setAnswer(match.questionId, match.extractedAnswer)); setMatches([]); };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['txt'].includes(ext)) { toast({ title: "Unsupported file type", description: "Please upload a .txt file", variant: "destructive" }); return; }
    try {
      const text = await file.text();
      setMeetingNotes(text);
      setUploadedFileName(file.name);
      toast({ title: "Document uploaded", description: `Loaded content from ${file.name}` });
    } catch (error) {
      toast({ title: "Error reading file", description: "Failed to extract text.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-lg">Meeting Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" data-testid="input-file-upload" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" data-testid="button-upload-document"><Upload className="mr-2 h-4 w-4" />Upload Document (.txt)</Button>
            </div>
            {uploadedFileName && <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /><span>{uploadedFileName}</span></div>}
          </div>
          <Textarea value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} placeholder="Upload a document or paste/type your meeting notes here. AI will analyze and extract answers to discovery questions..." className="min-h-[400px] resize-y" data-testid="input-meeting-notes" />
          <Button onClick={handleAnalyze} disabled={!meetingNotes.trim() || isProcessing} className="w-full" data-testid="button-analyze-notes">
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</> : <><Sparkles className="mr-2 h-4 w-4" />Analyze with AI</>}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Matched Answers</CardTitle>
          {matches.length > 0 && <Button size="sm" onClick={handleAcceptAll} data-testid="button-accept-all">Accept All</Button>}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {matches.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-center"><p className="text-sm text-muted-foreground">{isProcessing ? 'Processing your meeting notes...' : 'No matches yet. Add meeting notes and click "Analyze with AI" to get started.'}</p></div>
            ) : (
              <div className="space-y-4">
                {matches.map(match => (
                  <Card key={match.questionId} data-testid={`match-${match.questionId}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary" className="text-xs">{match.section}</Badge>
                        <Badge variant="outline" className={match.confidence > 0.8 ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-yellow-500 text-yellow-700 dark:text-yellow-400'}>{Math.round(match.confidence * 100)}% confidence</Badge>
                      </div>
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Question:</p><p className="text-sm font-medium">{match.question}</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Extracted Answer:</p><p className="text-sm text-foreground">{match.extractedAnswer}</p></div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => handleAccept(match.questionId)} className="flex-1" data-testid={`button-accept-${match.questionId}`}><Check className="mr-1 h-3 w-3" />Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(match.questionId)} className="flex-1" data-testid={`button-reject-${match.questionId}`}><X className="mr-1 h-3 w-3" />Reject</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
