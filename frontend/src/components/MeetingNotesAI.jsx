import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, X, Loader2, Upload, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { discoveryQuestions } from "@/lib/questions";

export function MeetingNotesAI() {
  const { meetingNotes, setMeetingNotes, setAnswer } = useDiscovery();
  const [isProcessing, setIsProcessing] = useState(false);
  const [matches, setMatches] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { toast } = useToast();
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Auto-expand when user starts typing
  useEffect(() => {
    if (meetingNotes.length > 0) {
      setIsExpanded(true);
    }
  }, [meetingNotes]);

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
      setIsExpanded(true);
      toast({ title: "Document uploaded", description: `Loaded content from ${file.name}` });
    } catch (error) {
      toast({ title: "Error reading file", description: "Failed to extract text.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Compact Meeting Notes Input */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Meeting Notes
            </CardTitle>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" data-testid="input-file-upload" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-document">
                <Upload className="h-3 w-3 mr-1" />Upload
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleAnalyze} 
                disabled={!meetingNotes.trim() || isProcessing}
                data-testid="button-analyze-notes"
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Analyze
              </Button>
            </div>
          </div>
          {uploadedFileName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <FileText className="h-3 w-3" />
              <span>{uploadedFileName}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Textarea 
              ref={textareaRef}
              value={meetingNotes} 
              onChange={e => setMeetingNotes(e.target.value)} 
              placeholder="Paste meeting notes here... (auto-expands as you type)"
              className={`resize-none transition-all duration-200 ${isExpanded ? 'min-h-[200px]' : 'min-h-[80px]'}`}
              onFocus={() => setIsExpanded(true)}
              data-testid="input-meeting-notes" 
            />
            {meetingNotes.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute bottom-2 right-2 h-6 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" />Collapse</> : <><ChevronDown className="h-3 w-3 mr-1" />Expand</>}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paste meeting notes, call transcripts, or discovery conversations. AI will extract answers to discovery questions.
          </p>
        </CardContent>
      </Card>

      {/* Matched Answers - Only show when there are matches */}
      {matches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm lg:text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Matched Answers
                <Badge variant="secondary" className="text-xs">{matches.length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={handleAcceptAll} data-testid="button-accept-all">
                <Check className="h-3 w-3 mr-1" />Accept All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 lg:grid-cols-2">
              {matches.map(match => (
                <div key={match.questionId} className="border rounded-lg p-3 space-y-2" data-testid={`match-${match.questionId}`}>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-xs">{match.section}</Badge>
                    <Badge variant="outline" className={`text-xs ${match.confidence > 0.8 ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'}`}>
                      {Math.round(match.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs font-medium truncate" title={match.question}>{match.question}</p>
                  <p className="text-sm bg-muted/50 rounded p-2">{match.extractedAnswer}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1 h-7 text-xs" onClick={() => handleAccept(match.questionId)} data-testid={`button-accept-${match.questionId}`}>
                      <Check className="h-3 w-3 mr-1" />Accept
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleReject(match.questionId)} data-testid={`button-reject-${match.questionId}`}>
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
