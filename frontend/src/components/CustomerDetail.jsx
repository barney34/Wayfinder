import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Sparkles, ChevronDown, ChevronRight, FileText, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const statusColors = {
  "not-submitted": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "submitted": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "not-started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "started": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "reviewed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const psarArbLabels = {
  "not-submitted": "Not Submitted",
  "submitted": "Submitted",
  "not-relevant": "N/A",
};

const designLabels = {
  "not-started": "Not Started",
  "started": "Started",
  "reviewed": "Reviewed w/ Customer",
};

// Section icons and colors
const sectionConfig = {
  "Users - Devices - Sites": { color: "text-blue-600", bgColor: "bg-blue-50" },
  "Sizing Data": { color: "text-purple-600", bgColor: "bg-purple-50" },
  "IPAM": { color: "text-green-600", bgColor: "bg-green-50" },
  "Internal DNS": { color: "text-orange-600", bgColor: "bg-orange-50" },
  "External DNS": { color: "text-amber-600", bgColor: "bg-amber-50" },
  "DHCP": { color: "text-cyan-600", bgColor: "bg-cyan-50" },
  "Services": { color: "text-indigo-600", bgColor: "bg-indigo-50" },
  "Microsoft Management": { color: "text-blue-500", bgColor: "bg-blue-50" },
  "Asset/ Network Insight": { color: "text-teal-600", bgColor: "bg-teal-50" },
  "Security": { color: "text-red-600", bgColor: "bg-red-50" },
  "Professional Services": { color: "text-violet-600", bgColor: "bg-violet-50" },
};

function QuestionField({ question, value, onChange, answers, onNoteChange, note }) {
  const { id, fieldType, options, allowFreeform, defaultValue, conditionalOn } = question;
  
  // Check if this question should be shown based on conditions
  if (conditionalOn) {
    const dependentValue = answers[conditionalOn.questionId];
    if (dependentValue !== conditionalOn.value) {
      return null;
    }
  }

  const currentValue = value ?? defaultValue ?? "";

  // Render different field types
  switch (fieldType) {
    case "yesno":
      return (
        <div className="flex items-center gap-4">
          <Button
            variant={currentValue === "Yes" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(id, "Yes")}
            data-testid={`${id}-yes`}
          >
            Yes
          </Button>
          <Button
            variant={currentValue === "No" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(id, "No")}
            data-testid={`${id}-no`}
          >
            No
          </Button>
        </div>
      );

    case "select":
      return (
        <Select value={currentValue} onValueChange={(val) => onChange(id, val)}>
          <SelectTrigger className="w-full max-w-md" data-testid={`${id}-select`}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect":
      const selectedValues = currentValue ? currentValue.split(", ").filter(Boolean) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {options?.map((opt) => (
              <Button
                key={opt}
                variant={selectedValues.includes(opt) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newValues = selectedValues.includes(opt)
                    ? selectedValues.filter(v => v !== opt)
                    : [...selectedValues, opt];
                  onChange(id, newValues.join(", "));
                }}
                data-testid={`${id}-${opt.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {selectedValues.includes(opt) && <Check className="h-3 w-3 mr-1" />}
                {opt}
              </Button>
            ))}
          </div>
          {allowFreeform && (
            <Input
              placeholder="Add other (comma-separated)..."
              className="max-w-md mt-2"
              onBlur={(e) => {
                if (e.target.value) {
                  const existing = selectedValues.filter(v => !options?.includes(v));
                  const newOther = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  const newValues = [...selectedValues.filter(v => options?.includes(v)), ...existing, ...newOther];
                  onChange(id, [...new Set(newValues)].join(", "));
                  e.target.value = "";
                }
              }}
              data-testid={`${id}-other`}
            />
          )}
        </div>
      );

    case "number":
      return (
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => onChange(id, e.target.value)}
          className="max-w-xs"
          placeholder="Enter a number"
          data-testid={`${id}-input`}
        />
      );

    case "leaseTime":
      const leaseOptions = [
        { label: "1 hour", value: "3600" },
        { label: "4 hours", value: "14400" },
        { label: "8 hours", value: "28800" },
        { label: "1 day", value: "86400" },
        { label: "3 days", value: "259200" },
        { label: "7 days", value: "604800" },
        { label: "14 days", value: "1209600" },
        { label: "30 days", value: "2592000" },
      ];
      return (
        <Select value={currentValue} onValueChange={(val) => onChange(id, val)}>
          <SelectTrigger className="w-full max-w-md" data-testid={`${id}-select`}>
            <SelectValue placeholder="Select lease time" />
          </SelectTrigger>
          <SelectContent>
            {leaseOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "enableSwitch":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={currentValue === "Yes"}
            onCheckedChange={(checked) => onChange(id, checked ? "Yes" : "No")}
            data-testid={`${id}-switch`}
          />
          <span className="text-sm text-muted-foreground">
            {currentValue === "Yes" ? "Enabled" : "Disabled"}
          </span>
        </div>
      );

    case "ipCalculated":
    case "dnsAggregateCalculated":
    case "dnsPerServerCalculated":
      return (
        <div className="space-y-2">
          <Input
            type="text"
            value={currentValue}
            onChange={(e) => onChange(id, e.target.value)}
            className="max-w-xs"
            placeholder="Calculated or enter manually"
            data-testid={`${id}-input`}
          />
          <p className="text-xs text-muted-foreground">
            Auto-calculated based on other inputs, or enter manually
          </p>
        </div>
      );

    case "siteConfiguration":
      return (
        <div className="text-sm text-muted-foreground">
          <p>Site configuration tool will be added here</p>
          <Textarea
            value={currentValue}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder="Enter site configuration details..."
            className="mt-2"
            rows={3}
            data-testid={`${id}-textarea`}
          />
        </div>
      );

    default:
      // Default text input or textarea for longer questions
      const isLongQuestion = question.question.length > 60;
      if (isLongQuestion) {
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder="Enter your answer..."
            rows={3}
            data-testid={`${id}-textarea`}
          />
        );
      }
      return (
        <Input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(id, e.target.value)}
          placeholder="Enter your answer..."
          data-testid={`${id}-input`}
        />
      );
  }
}

export function CustomerDetail({ customer, onBack }) {
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [meetingNotes, setMeetingNotes] = useState("");
  const [expandedSections, setExpandedSections] = useState(new Set(["IPAM"]));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Fetch questions from API
  const { data: questions = [] } = useQuery({
    queryKey: ['/api/questions'],
  });

  // Load saved data from localStorage
  useEffect(() => {
    const storageKey = `discovery-${customer.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAnswers(data.answers || {});
        setNotes(data.notes || {});
        setMeetingNotes(data.meetingNotes || "");
      } catch (e) {
        console.error("Error loading saved data:", e);
      }
    }
  }, [customer.id]);

  // Save to localStorage when data changes
  const saveData = useCallback(() => {
    const storageKey = `discovery-${customer.id}`;
    const data = {
      answers,
      notes,
      meetingNotes,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setHasUnsavedChanges(false);
    toast({
      title: "Saved",
      description: "Discovery data saved locally.",
    });
  }, [customer.id, answers, notes, meetingNotes, toast]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNoteChange = (questionId, value) => {
    setNotes(prev => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
  };

  // Group questions by section
  const sections = questions.reduce((acc, q) => {
    if (q.hidden) return acc;
    const section = q.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(q);
    return acc;
  }, {});

  const sectionNames = Object.keys(sections);

  // Calculate progress
  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim()).length;
  const totalQuestions = questions.filter(q => !q.hidden).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // AI Analysis
  const handleAnalyzeNotes = async () => {
    if (!meetingNotes.trim()) {
      toast({
        title: "No notes",
        description: "Please enter meeting notes to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/analyze-notes", {
        notes: meetingNotes,
      });
      const data = await response.json();
      
      if (data.matches && data.matches.length > 0) {
        setAiMatches(data.matches);
        setAiDialogOpen(true);
      } else {
        toast({
          title: "No matches found",
          description: "The AI couldn't extract any answers from the notes. Try adding more detail.",
        });
      }
    } catch (error) {
      console.error("Error analyzing notes:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze meeting notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiMatches = () => {
    const newAnswers = { ...answers };
    aiMatches.forEach(match => {
      newAnswers[match.questionId] = match.answer;
    });
    setAnswers(newAnswers);
    setHasUnsavedChanges(true);
    setAiDialogOpen(false);
    toast({
      title: "Applied",
      description: `Applied ${aiMatches.length} answers from AI analysis.`,
    });
  };

  return (
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.opportunity || 'No opportunity set'} • SE: {customer.seName || 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          <Button onClick={saveData} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PSAR</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.psar]}>
              {psarArbLabels[customer.psar] || customer.psar}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ARB</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.arb]}>
              {psarArbLabels[customer.arb] || customer.arb}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Design</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[customer.design]}>
              {designLabels[customer.design] || customer.design}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount} of {totalQuestions} questions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="discovery" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="discovery" data-testid="tab-discovery">
            <FileText className="h-4 w-4 mr-2" />
            Discovery Questions
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* Discovery Questions Tab */}
        <TabsContent value="discovery" className="mt-6">
          <div className="space-y-4">
            {sectionNames.map((sectionName) => {
              const sectionQuestions = sections[sectionName];
              const isExpanded = expandedSections.has(sectionName);
              const config = sectionConfig[sectionName] || { color: "text-gray-600", bgColor: "bg-gray-50" };
              
              // Count answered in section
              const sectionAnswered = sectionQuestions.filter(q => answers[q.id]?.trim()).length;
              
              return (
                <Collapsible
                  key={sectionName}
                  open={isExpanded}
                  onOpenChange={(open) => {
                    setExpandedSections(prev => {
                      const next = new Set(prev);
                      if (open) next.add(sectionName);
                      else next.delete(sectionName);
                      return next;
                    });
                  }}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className={`cursor-pointer hover:bg-muted/50 ${config.bgColor}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className={`h-5 w-5 ${config.color}`} />
                            ) : (
                              <ChevronRight className={`h-5 w-5 ${config.color}`} />
                            )}
                            <CardTitle className={`text-lg ${config.color}`}>
                              {sectionName}
                            </CardTitle>
                          </div>
                          <Badge variant="outline">
                            {sectionAnswered}/{sectionQuestions.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4 space-y-6">
                        {sectionQuestions.map((q) => (
                          <div key={q.id} className="space-y-2 pb-4 border-b last:border-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <Label className="text-sm font-medium">
                                  {q.question}
                                  {q.technicalOnly && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Technical
                                    </Badge>
                                  )}
                                </Label>
                                {q.subsection && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {q.subsection}
                                  </p>
                                )}
                              </div>
                            </div>
                            <QuestionField
                              question={q}
                              value={answers[q.id]}
                              onChange={handleAnswerChange}
                              answers={answers}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                AI Meeting Notes Analysis
              </CardTitle>
              <CardDescription>
                Paste your meeting notes and let AI extract answers to discovery questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meeting Notes</Label>
                <Textarea
                  value={meetingNotes}
                  onChange={(e) => {
                    setMeetingNotes(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Paste your meeting notes here... Include details about the customer's infrastructure, requirements, current vendors, etc."
                  rows={10}
                  data-testid="textarea-meeting-notes"
                />
              </div>
              <Button 
                onClick={handleAnalyzeNotes} 
                disabled={isAnalyzing}
                data-testid="button-analyze"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Matches Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Analysis Results</DialogTitle>
            <DialogDescription>
              Found {aiMatches.length} potential answers. Review and apply them to the questionnaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {aiMatches.map((match, index) => {
              const question = questions.find(q => q.id === match.questionId);
              return (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{question?.question || match.questionId}</span>
                    <Badge variant={match.confidence === "high" ? "default" : "outline"}>
                      {match.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-sm bg-muted p-2 rounded">{match.answer}</p>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAiMatches} data-testid="button-apply-ai">
              Apply All Answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
