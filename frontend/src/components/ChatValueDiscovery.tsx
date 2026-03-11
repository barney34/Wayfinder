/**
 * ChatValueDiscovery - Conversational Value Discovery with AI-powered follow-ups
 * 
 * Features:
 * - 3-question limit per topic for focused discovery
 * - Mode toggle: Guided (AI-led) vs Free Ask (user-led)
 * - Clickable topic pills to pivot conversation
 * - Progress tracking per topic
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, ChevronDown, ChevronRight, CheckCircle2, Loader2, MessageSquare, RotateCcw, Compass, MessageCircleQuestion, ArrowRight, StickyNote } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/queryClient";

const MAX_QUESTIONS_PER_TOPIC = 3;

// Topic opener questions for when user clicks a topic pill
const TOPIC_OPENERS = {
  'current-state': "Tell me about your current setup and how things work today.",
  'pain-points': "What are the biggest challenges or frustrations you're facing?",
  'business-impact': "How do these issues affect your business - time, money, risk?",
  'goals': "What outcomes are you hoping to achieve?"
};

// Consistent L1/L2/L3 topic definitions — shared across all sections
const BASE_TOPICS = [
  { id: 'current-state',  label: 'Current State', level: 'L1', required: true },
  { id: 'pain-points',   label: 'Challenge',      level: 'L2', required: true },
  { id: 'business-impact', label: 'Business Pain', level: 'L3', required: true },
  { id: 'goals',         label: 'Goals',          level: null,  required: false },
];

// Key topics that MUST be covered per section
const SECTION_TOPICS = {
  'IPAM': {
    opener: "Let's talk about your IP address management. How do you currently track and manage IP addresses across your organization?",
    topics: BASE_TOPICS,
    contextHints: [
      "IP conflicts", "spreadsheets", "manual tracking", "subnet management",
      "audit compliance", "provisioning time", "cloud integration"
    ]
  },
  'Internal DNS': {
    opener: "Let's discuss your internal DNS infrastructure. What DNS platform are you currently using for internal resolution?",
    topics: BASE_TOPICS,
    contextHints: [
      "Active Directory DNS", "BIND", "zone management", "DNS outages",
      "GSLB", "split-horizon", "propagation delays"
    ]
  },
  'External DNS': {
    opener: "Let's explore your external DNS setup. Who manages your authoritative DNS for public domains?",
    topics: BASE_TOPICS,
    contextHints: [
      "Cloudflare", "Route 53", "DDoS protection", "TTL management",
      "multi-provider", "failover", "performance"
    ]
  },
  'DHCP': {
    opener: "Let's discuss your DHCP services. How do you currently manage dynamic IP assignment across your network?",
    topics: BASE_TOPICS,
    contextHints: [
      "Windows DHCP", "scope exhaustion", "failover", "lease management",
      "rogue DHCP", "VoIP", "PXE boot"
    ]
  },
  'Overlay': {
    opener: "You're managing DNS and DHCP across a mix of cloud and on-prem — how unified is your visibility and control across all of those today?",
    topics: BASE_TOPICS,
    contextHints: [
      "AWS Route 53", "Azure DNS", "GCP Cloud DNS", "Cloudflare", "Akamai",
      "Microsoft AD DNS", "overlay", "single pane", "visibility", "consistency"
    ]
  },
  'Security': {
    opener: "Let's discuss network security. Are you using DNS as a security layer today, and what threats concern you most?",
    topics: BASE_TOPICS,
    contextHints: [
      "DNS tunneling", "data exfiltration", "malware C2", "phishing",
      "SOC", "SIEM integration", "threat intelligence"
    ]
  },
  'Services': {
    opener: "Let's discuss your DDI services strategy. What automation or integrations are you looking to implement?",
    topics: BASE_TOPICS,
    contextHints: [
      "Ansible", "Terraform", "ServiceNow", "API", "automation",
      "self-service", "provisioning"
    ]
  },
};

// Default config for sections not explicitly defined
const DEFAULT_SECTION = {
  opener: "Tell me about your current setup and any challenges you're facing.",
  topics: BASE_TOPICS,
  contextHints: []
};

interface ChatValueDiscoveryProps {
  section: string;
  defaultExpanded?: boolean;
  contextualOpener?: string | null;
}
export function ChatValueDiscovery({ section, defaultExpanded = false, contextualOpener = null }: ChatValueDiscoveryProps) {
  const { answers, setAnswer } = useDiscovery();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [topicQuestionCounts, setTopicQuestionCounts] = useState({}); // { 'current-state': 2, 'pain-points': 1 }
  const [currentTopic, setCurrentTopic] = useState('current-state');
  const [mode, setMode] = useState('guided'); // 'guided' or 'free'
  const [pendingTransition, setPendingTransition] = useState(null); // { nextTopic, completedTopic, nextLabel }
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevConvoRef = useRef(null);
  
  const sectionConfig = SECTION_TOPICS[section] || DEFAULT_SECTION;
  const storageKey = `vd-chat-${section.replace(/\s/g, '-')}`;

  // Initialize conversation with opener — uses contextualOpener if provided (no saved convo)
  const getInitialConversation = useCallback(() => {
    const opener = contextualOpener || sectionConfig.opener;
    return [{ role: 'system', content: opener, timestamp: Date.now(), topic: 'current-state' }];
  }, [sectionConfig.opener, contextualOpener]);

  // Load conversation from answers context on mount and when it changes (WebSocket sync)
  useEffect(() => {
    const savedConvo = answers[storageKey];
    
    // Skip if this is the same value we just saved (avoid infinite loop)
    if (savedConvo === prevConvoRef.current) {
      return;
    }
    
    if (savedConvo) {
      try {
        const parsed = JSON.parse(savedConvo);
        if (parsed.messages && parsed.messages.length > 0) {
          const msgs = parsed.messages;
          // If a contextual opener is provided AND the conversation has no user replies yet
          // (just the system opener), replace the opener with the contextual one
          const hasUserReplies = msgs.some(m => m.role === 'user');
          if (contextualOpener && !hasUserReplies) {
            setConversation([{ role: 'system', content: contextualOpener, timestamp: Date.now(), topic: 'current-state' }]);
          } else {
            console.log('[ChatValueDiscovery] Loading conversation from WebSocket update:', msgs.length, 'messages');
            setConversation(msgs);
          }
          setTopicQuestionCounts(parsed.topicQuestionCounts || {});
          setCurrentTopic(parsed.currentTopic || 'current-state');
          setMode(parsed.mode || 'guided');
          return;
        }
      } catch (e) {
        console.error('[ChatValueDiscovery] Failed to parse saved conversation:', e);
      }
    }
    // Start fresh
    setConversation(getInitialConversation());
    setTopicQuestionCounts({ 'current-state': 1 });
    setCurrentTopic('current-state');
  }, [answers, storageKey, getInitialConversation, contextualOpener]); // Watch entire answers object

  // Save conversation to answers context
  useEffect(() => {
    if (conversation.length > 0) {
      const serialized = JSON.stringify({
        messages: conversation,
        topicQuestionCounts: topicQuestionCounts,
        currentTopic: currentTopic,
        mode: mode
      });
      prevConvoRef.current = serialized;
      setAnswer(storageKey, serialized);
    }
  }, [conversation, topicQuestionCounts, currentTopic, mode, storageKey, setAnswer]);

  // Scroll to bottom on new messages (within chat container only)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [conversation]);

  const resetConversation = () => {
    setConversation(getInitialConversation());
    setTopicQuestionCounts({ 'current-state': 1 });
    setCurrentTopic('current-state');
    setMode('guided');
    setPendingTransition(null);
    setShowNoteInput(false);
    setNoteInput('');
    toast({
      title: "Conversation reset",
      description: "Starting fresh with Value Discovery",
    });
  };

  const handleNextTopic = () => {
    if (!pendingTransition?.nextTopic) return;
    const nextId = pendingTransition.nextTopic;
    const nextConfig = sectionConfig.topics.find(t => t.id === nextId);
    const pivotMsg = {
      role: 'system',
      content: TOPIC_OPENERS[nextId] || `Let's move on to ${nextConfig?.label || nextId}.`,
      timestamp: Date.now(),
      topic: nextId
    };
    setConversation(prev => [...prev, pivotMsg]);
    setTopicQuestionCounts(prev => ({ ...prev, [nextId]: (prev[nextId] || 0) + 1 }));
    setCurrentTopic(nextId);
    setPendingTransition(null);
    setShowNoteInput(false);
    setNoteInput('');
  };

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    const noteKey = `vd-note-${sectionConfig}-${pendingTransition?.completedTopic || currentTopic}`;
    setAnswer(noteKey, noteInput.trim());
    const noteMsg = {
      role: 'user',
      content: `[Note] ${noteInput.trim()}`,
      timestamp: Date.now(),
      topic: pendingTransition?.completedTopic || currentTopic
    };
    setConversation(prev => [...prev, noteMsg]);
    setNoteInput('');
    setShowNoteInput(false);
    if (pendingTransition?.nextTopic) handleNextTopic();
    else setPendingTransition(null);
  };

  // Check if a topic is complete (3 questions asked)
  const isTopicComplete = (topicId) => {
    return (topicQuestionCounts[topicId] || 0) >= MAX_QUESTIONS_PER_TOPIC;
  };

  // Get question count for a topic
  const getTopicQuestionCount = (topicId) => {
    return topicQuestionCounts[topicId] || 0;
  };

  // Handle clicking on a topic pill to switch focus
  const handleTopicClick = (topicId) => {
    if (isLoading) return;
    
    const count = getTopicQuestionCount(topicId);
    if (count >= MAX_QUESTIONS_PER_TOPIC) {
      toast({
        title: "Topic complete",
        description: `You've covered ${sectionConfig.topics.find(t => t.id === topicId)?.label || topicId}. Try another topic!`,
      });
      return;
    }

    setCurrentTopic(topicId);
    
    // Add a transition message from the AI
    const topicLabel = sectionConfig.topics.find(t => t.id === topicId)?.label || topicId;
    const pivotMessage = {
      role: 'system',
      content: TOPIC_OPENERS[topicId] || `Let's talk about ${topicLabel.toLowerCase()}.`,
      timestamp: Date.now(),
      topic: topicId
    };
    
    setConversation(prev => [...prev, pivotMessage]);
    setTopicQuestionCounts(prev => ({
      ...prev,
      [topicId]: (prev[topicId] || 0) + 1
    }));
  };

  const sendMessage = async (overrideText = null) => {
    const text = overrideText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', content: text, timestamp: Date.now(), topic: currentTopic };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    if (!overrideText) setInputValue('');
    setIsLoading(true);

    try {
      // Call AI to generate contextual follow-up
      // Strip chat-storage keys — only send real discovery form answers
      const discoveryAnswers = Object.fromEntries(
        Object.entries(answers).filter(([k]) => !k.startsWith('vd-'))
      );

      const response = await fetch(getApiUrl('/api/value-discovery-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          conversation: newConversation,
          currentTopic,
          topicQuestionCounts,
          maxQuestionsPerTopic: MAX_QUESTIONS_PER_TOPIC,
          requiredTopics: sectionConfig.topics,
          contextHints: sectionConfig.contextHints,
          mode,
          discoveryAnswers,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Determine the topic for this response
      const responseTopic = data.topic || currentTopic;
      
      // Add AI response — two bubbles on pivot, one otherwise
      const aiMessage = {
        role: 'system',
        content: data.response,
        timestamp: Date.now(),
        topic: responseTopic,
      };
      const messages = [...newConversation, aiMessage];
      if (data.topicComplete && data.needPayoff) {
        messages.push({
          role: 'system',
          content: data.needPayoff,
          timestamp: Date.now() + 1,
          topic: responseTopic,
          isPivotQuestion: true,
        });
      }
      setConversation(messages);
      
      // Update question count for the topic
      if (mode === 'guided') {
        setTopicQuestionCounts(prev => ({
          ...prev,
          [responseTopic]: (prev[responseTopic] || 0) + 1
        }));

        // 3-deep: if topic complete, queue transition gate
        if (data.topicComplete) {
          const nextId = data.suggestedNextTopic;
          const nextTopicCfg = nextId ? sectionConfig.topics.find(t => t.id === nextId) : null;
          const nextLabel = nextTopicCfg
            ? `${nextTopicCfg.level ? nextTopicCfg.level + ' · ' : ''}${nextTopicCfg.label}`
            : null;
          setPendingTransition({
            completedTopic: responseTopic,
            nextTopic: nextId || null,
            nextLabel,
            bridgeQuestion: data.suggestedBridgeQuestion || null,
          });
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Fallback to a generic follow-up
      const fallbackMessage = { 
        role: 'system', 
        content: "Thanks for sharing. Can you tell me more about the business impact of this situation?",
        timestamp: Date.now(),
        topic: currentTopic
      };
      setConversation([...newConversation, fallbackMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calculate overall progress
  const requiredTopics = sectionConfig.topics.filter(t => t.required);
  const completedRequired = requiredTopics.filter(t => isTopicComplete(t.id)).length;
  const progressPercent = requiredTopics.length > 0 
    ? Math.round((completedRequired / requiredTopics.length) * 100) 
    : 0;

  return (
    <div className="mb-6" data-testid={`chat-vd-${section.replace(/\s/g, '-')}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#12C2D3]/15 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-[#00594C] dark:text-[#12C2D3]" />
            </div>
            <span className="text-sm font-semibold text-foreground">Value Discovery</span>
            {/* Progress indicator */}
            <div className="flex items-center gap-2 ml-2">
              <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#00BD4D] transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{progressPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {expanded && (
          <button
            onClick={resetConversation}
            className="p-2 rounded-xl bg-card border border-border shadow-sm hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chat Interface */}
      {expanded && (
        <div className="mt-3 rounded-2xl bg-card border border-border overflow-hidden">
          {/* Mode Toggle + Topics Bar */}
          <div className="px-4 py-2 border-b border-border bg-secondary/50">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 p-0.5 bg-background border border-border rounded-lg">
                <button
                  onClick={() => setMode('guided')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    mode === 'guided' 
                      ? 'bg-[#12C2D3] text-white' 
                      : 'text-secondary-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Compass className="h-3 w-3" />
                  Guided
                </button>
                <button
                  onClick={() => setMode('free')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    mode === 'free' 
                      ? 'bg-[#12C2D3] text-white' 
                      : 'text-secondary-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <MessageCircleQuestion className="h-3 w-3" />
                  Free Ask
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {mode === 'guided' ? 'L1 → L2 → L3 per area' : 'Ask anything'}
              </span>
            </div>
            
            {/* Clickable Topic Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 font-medium">Topics:</span>
              {sectionConfig.topics.map(topic => {
                const count = getTopicQuestionCount(topic.id);
                const isComplete = count >= MAX_QUESTIONS_PER_TOPIC;
                const isActive = currentTopic === topic.id && mode === 'guided';
                const levelLabel = topic.level;

                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic.id)}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                      isComplete
                        ? 'bg-[#00BD4D]/15 text-[#00BD4D] border-[#00BD4D]/30 cursor-default'
                        : isActive
                          ? 'bg-[#12C2D3]/20 text-[#00594C] dark:text-[#12C2D3] border-[#12C2D3] ring-1 ring-[#12C2D3]/30'
                          : topic.required
                            ? 'bg-[#FEDD00]/10 text-[#9A7600] dark:text-[#FEDD00] border-[#FEDD00]/30 hover:bg-[#FEDD00]/20 cursor-pointer'
                            : 'bg-secondary text-secondary-foreground border-border hover:bg-muted hover:text-foreground cursor-pointer'
                    }`}
                    data-testid={`topic-pill-${topic.id}`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : levelLabel ? (
                      <span className={`text-[9px] font-bold px-0.5 rounded ${
                        isActive ? 'text-[#12C2D3]' : 'text-muted-foreground'
                      }`}>{levelLabel}</span>
                    ) : null}
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[320px] overflow-y-auto p-4 space-y-3 bg-background/50">
            {conversation.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#00BD4D] text-white rounded-br-md'
                      : msg.isPivotQuestion
                        ? 'bg-[#12C2D3]/10 border border-[#12C2D3]/60 text-foreground rounded-bl-md font-medium'
                        : 'bg-secondary border border-border text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary border border-border text-muted-foreground px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            {/* 3-deep transition gate */}
            {pendingTransition && (
              <div className="mx-1 mt-2 rounded-xl border border-[#00BD4D]/30 bg-[#00BD4D]/8 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00BD4D] shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    {sectionConfig.topics.find(t => t.id === pendingTransition.completedTopic)?.label || pendingTransition.completedTopic} covered
                  </span>
                </div>
                {/* Bridge question suggestion */}
                {pendingTransition.bridgeQuestion && !showNoteInput && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Suggested next question</p>
                    <div className="flex items-start gap-2 bg-background rounded-lg border border-border p-2">
                      <span className="text-xs text-foreground flex-1 leading-relaxed italic">"{pendingTransition.bridgeQuestion}"</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 shrink-0 border-[#12C2D3] text-[#12C2D3] hover:bg-[#12C2D3]/10"
                        onClick={() => {
                          const q = pendingTransition.bridgeQuestion;
                          setPendingTransition(prev => ({ ...prev, bridgeQuestion: null }));
                          sendMessage(q);
                        }}
                      >
                        Use →
                      </Button>
                    </div>
                  </div>
                )}
                {showNoteInput ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder="Add context or notes before moving on..."
                      className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-[#00BD4D] hover:bg-[#00BD4D]/90 text-white" onClick={handleSaveNote} disabled={!noteInput.trim()}>
                        Save &amp; {pendingTransition.nextTopic ? 'Continue' : 'Done'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNoteInput(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pendingTransition.nextTopic && (
                      <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#12C2D3] hover:bg-[#12C2D3]/90 text-white" onClick={handleNextTopic}>
                        <ArrowRight className="h-3 w-3" />
                        Next: {pendingTransition.nextLabel}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowNoteInput(true)}>
                      <StickyNote className="h-3 w-3" />
                      Add notes
                    </Button>
                    {!pendingTransition.nextTopic && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPendingTransition(null)}>Done</Button>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'guided' ? "Type your response..." : "Ask any question..."}
                disabled={isLoading}
                className="flex-1 h-10 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 text-sm"
                data-testid={`chat-input-${section.replace(/\s/g, '-')}`}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#00BD4D] hover:bg-[#00BD4D]/90 disabled:opacity-50"
                data-testid={`chat-send-${section.replace(/\s/g, '-')}`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
