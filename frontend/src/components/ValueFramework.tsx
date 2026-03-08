/**
 * ValueFramework - Value Framework discovery questions & AI-generated propositions
 * Shows 3 categories: Optimize, Accelerate, Protect
 * Each with discovery questions and AI-generated customer-specific value props
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ShieldCheck, Rocket, Shield, Sparkles, Loader2, ChevronDown, ChevronRight,
  RefreshCw, AlertTriangle, TrendingUp, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiscovery } from "@/contexts/DiscoveryContext";

const CATEGORY_ICONS = {
  optimize: ShieldCheck,
  accelerate: Rocket,
  protect: Shield,
};

const CATEGORY_COLORS = {
  optimize: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent", badge: "bg-accent/15 text-accent" },
  accelerate: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  protect: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

const TAG_LABELS = { C: "Cloud", N: "Network", S: "Security" };
const TAG_COLORS = { C: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", N: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", S: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" };

export function ValueFramework() {
  const { answers, notes, meetingNotes, setAnswer } = useDiscovery();
  const [framework, setFramework] = useState(null);
  const [vfAnswers, setVfAnswers] = useState({});
  const [generating, setGenerating] = useState({});
  const [valuePropSummaries, setValuePropSummaries] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const { toast } = useToast();
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // Fetch value framework data
  useEffect(() => {
    fetch(`${API_URL}/api/value-framework`)
      .then(r => r.json())
      .then(data => {
        setFramework(data);
        // Initialize first category as expanded
        if (data.categories?.length > 0) {
          setExpandedCategories({ [data.categories[0].id]: true });
        }
      })
      .catch(err => console.error("Failed to fetch value framework:", err));
  }, [API_URL]);

  // Update a VF answer
  const updateVfAnswer = (questionId, value) => {
    setVfAnswers(prev => ({ ...prev, [questionId]: value }));
    // Also store in main answers for AI context
    setAnswer(questionId, value);
  };

  // Generate value propositions for a category
  const generateValueProps = async (categoryId) => {
    setGenerating(prev => ({ ...prev, [categoryId]: true }));
    try {
      // Merge VF answers with main answers
      const allAnswers = { ...answers, ...vfAnswers };
      const res = await fetch(`${API_URL}/api/generate-value-props`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType: categoryId, answers: allAnswers, notes, meetingNotes }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setValuePropSummaries(prev => ({ ...prev, [categoryId]: data.summary }));
    } catch (err) {
      console.error('Value prop generation failed:', err);
      toast({ title: "Generation failed", description: "Could not generate value propositions.", variant: "destructive" });
    } finally {
      setGenerating(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  // Generate all categories
  const generateAll = async () => {
    if (!framework) return;
    for (const cat of framework.categories) {
      await generateValueProps(cat.id);
    }
    toast({ title: "Value propositions generated", description: "All 3 categories have been analyzed" });
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleQuestion = (id) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!framework) return null;

  const isAnyGenerating = Object.values(generating).some(Boolean);

  return (
    <div className="space-y-4" data-testid="value-framework">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Value Framework
              <span className="text-xs font-normal text-muted-foreground">
                Infoblox Value Propositions
              </span>
            </CardTitle>
            <Button
              variant="outline" size="sm" className="h-7 text-xs"
              onClick={generateAll}
              disabled={isAnyGenerating}
              data-testid="generate-all-value-props"
            >
              {isAnyGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Generate All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Discovery questions aligned to Infoblox's 3 value drivers. Answer the questions below and use AI to generate customer-specific value propositions.
          </p>
        </CardContent>
      </Card>

      {/* Categories */}
      {framework.categories.map(category => {
        const Icon = CATEGORY_ICONS[category.id] || Shield;
        const colors = CATEGORY_COLORS[category.id];
        const isExpanded = expandedCategories[category.id];
        const answeredCount = category.discovery_questions.filter(q => vfAnswers[q.id] || answers[q.id]).length;

        return (
          <Card key={category.id} className={`${colors.border} border`} data-testid={`vf-category-${category.id}`}>
            <CardHeader className="pb-2">
              <Collapsible open={!!isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${colors.text}`} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {answeredCount}/{category.discovery_questions.length}
                      </Badge>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 space-y-4">
                    {/* Before Scenarios (Pain Points) */}
                    <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Common Pain Points</span>
                      </div>
                      <ul className="space-y-1">
                        {category.before_scenarios.map((scenario, i) => (
                          <li key={i} className="text-xs text-destructive/80 flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5 shrink-0">&#8226;</span>
                            {scenario}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Infoblox Solutions */}
                    <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">How Infoblox Solves This</span>
                      </div>
                      <ul className="space-y-1">
                        {category.infoblox_solves.map((solution, i) => (
                          <li key={i} className="text-xs text-primary/80 flex items-start gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">&#8226;</span>
                            {solution}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Metrics */}
                    <div className="flex flex-wrap gap-2">
                      {category.key_metrics.slice(0, 4).map((metric, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal">{metric}</Badge>
                      ))}
                    </div>

                    {/* Discovery Questions */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Discovery Questions
                      </div>
                      <div className="space-y-2">
                        {category.discovery_questions.map(q => {
                          const currentAnswer = vfAnswers[q.id] || answers[q.id] || '';
                          const isOpen = expandedQuestions[q.id];
                          return (
                            <div key={q.id} className="border rounded-lg overflow-hidden" data-testid={`vf-question-${q.id}`}>
                              <button
                                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                                onClick={() => toggleQuestion(q.id)}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {currentAnswer ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                  ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                                  )}
                                  <span className="text-xs truncate">{q.question}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {q.tags.map(tag => (
                                    <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag]}`}>
                                      {TAG_LABELS[tag]}
                                    </span>
                                  ))}
                                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </div>
                              </button>
                              {isOpen && (
                                <div className="px-3 pb-3 pt-1 border-t bg-muted/10">
                                  <Input
                                    value={currentAnswer}
                                    onChange={e => updateVfAnswer(q.id, e.target.value)}
                                    placeholder="Enter customer's response..."
                                    className="h-8 text-xs"
                                    data-testid={`vf-answer-${q.id}`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Generated Value Proposition */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          AI Value Proposition
                        </span>
                        <Button
                          variant="outline" size="sm" className="h-6 text-xs"
                          onClick={() => generateValueProps(category.id)}
                          disabled={generating[category.id]}
                          data-testid={`generate-vp-${category.id}`}
                        >
                          {generating[category.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      </div>
                      <Textarea
                        value={valuePropSummaries[category.id] || ''}
                        onChange={e => setValuePropSummaries(prev => ({ ...prev, [category.id]: e.target.value }))}
                        placeholder="Click 'Generate' to create a customer-specific value proposition based on discovery answers and meeting notes..."
                        className="min-h-[120px] text-xs resize-y leading-relaxed"
                        data-testid={`vp-summary-${category.id}`}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
