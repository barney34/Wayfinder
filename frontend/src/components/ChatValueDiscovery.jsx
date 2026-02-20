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
import { Send, ChevronDown, ChevronRight, CheckCircle2, Loader2, MessageSquare, RotateCcw, Compass, MessageCircleQuestion } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MAX_QUESTIONS_PER_TOPIC = 3;

// Topic opener questions for when user clicks a topic pill
const TOPIC_OPENERS = {
  'current-state': "Tell me about your current setup and how things work today.",
  'pain-points': "What are the biggest challenges or frustrations you're facing?",
  'business-impact': "How do these issues affect your business - time, money, risk?",
  'goals': "What outcomes are you hoping to achieve?"
};

// Key topics that MUST be covered per section
const SECTION_TOPICS = {
  'IPAM': {
    opener: "Let's talk about your IP address management. How do you currently track and manage IP addresses across your organization?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "IP conflicts", "spreadsheets", "manual tracking", "subnet management",
      "audit compliance", "provisioning time", "cloud integration"
    ]
  },
  'Internal DNS': {
    opener: "Let's discuss your internal DNS infrastructure. What DNS platform are you currently using for internal resolution?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "Active Directory DNS", "BIND", "zone management", "DNS outages",
      "GSLB", "split-horizon", "propagation delays"
    ]
  },
  'External DNS': {
    opener: "Let's explore your external DNS setup. Who manages your authoritative DNS for public domains?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "Cloudflare", "Route 53", "DDoS protection", "TTL management",
      "multi-provider", "failover", "performance"
    ]
  },
  'DHCP': {
    opener: "Let's discuss your DHCP services. How do you currently manage dynamic IP assignment across your network?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "Windows DHCP", "scope exhaustion", "failover", "lease management",
      "rogue DHCP", "VoIP", "PXE boot"
    ]
  },
  'Cloud Management': {
    opener: "Let's explore your cloud infrastructure. Which cloud providers are you using, and how do you manage DNS/DHCP there?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "AWS", "Azure", "GCP", "multi-cloud", "hybrid", "Terraform",
      "visibility", "consistency"
    ]
  },
  'Security': {
    opener: "Let's discuss network security. Are you using DNS as a security layer today, and what threats concern you most?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "DNS tunneling", "data exfiltration", "malware C2", "phishing",
      "SOC", "SIEM integration", "threat intelligence"
    ]
  },
  'Services': {
    opener: "Let's discuss your DDI services strategy. What automation or integrations are you looking to implement?",
    topics: [
      { id: 'current-state', label: 'Current State', required: true },
      { id: 'pain-points', label: 'Pain Points', required: true },
      { id: 'business-impact', label: 'Business Impact', required: true },
      { id: 'goals', label: 'Goals', required: false },
    ],
    contextHints: [
      "Ansible", "Terraform", "ServiceNow", "API", "automation",
      "self-service", "provisioning"
    ]
  },
};

// Default config for sections not explicitly defined
const DEFAULT_SECTION = {
  opener: "Tell me about your current setup and any challenges you're facing.",
  topics: [
    { id: 'current-state', label: 'Current State', required: true },
    { id: 'pain-points', label: 'Pain Points', required: true },
    { id: 'business-impact', label: 'Business Impact', required: true },
    { id: 'goals', label: 'Goals', required: false },
  ],
  contextHints: []
};

export function ChatValueDiscovery({ section }) {
  const { answers, setAnswer } = useDiscovery();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [topicQuestionCounts, setTopicQuestionCounts] = useState({}); // { 'current-state': 2, 'pain-points': 1 }
  const [currentTopic, setCurrentTopic] = useState('current-state');
  const [mode, setMode] = useState('guided'); // 'guided' or 'free'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const sectionConfig = SECTION_TOPICS[section] || DEFAULT_SECTION;
  const storageKey = `vd-chat-${section.replace(/\s/g, '-')}`;

  // Initialize conversation with opener
  const getInitialConversation = useCallback(() => {
    return [{ role: 'system', content: sectionConfig.opener, timestamp: Date.now(), topic: 'current-state' }];
  }, [sectionConfig.opener]);

  // Load conversation from answers context on mount
  useEffect(() => {
    const savedConvo = answers[storageKey];
    if (savedConvo) {
      try {
        const parsed = JSON.parse(savedConvo);
        if (parsed.messages && parsed.messages.length > 0) {
          setConversation(parsed.messages);
          setTopicQuestionCounts(parsed.topicQuestionCounts || {});
          setCurrentTopic(parsed.currentTopic || 'current-state');
          setMode(parsed.mode || 'guided');
          return;
        }
      } catch (e) {
        // Fall through to init
      }
    }
    // Start fresh
    setConversation(getInitialConversation());
    setTopicQuestionCounts({ 'current-state': 1 });
    setCurrentTopic('current-state');
  }, [section, storageKey, getInitialConversation]);

  // Save conversation to answers context
  useEffect(() => {
    if (conversation.length > 0) {
      setAnswer(storageKey, JSON.stringify({
        messages: conversation,
        topicQuestionCounts: topicQuestionCounts,
        currentTopic: currentTopic,
        mode: mode
      }));
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
    toast({
      title: "Conversation reset",
      description: "Starting fresh with Value Discovery",
    });
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

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue.trim(), timestamp: Date.now(), topic: currentTopic };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call AI to generate contextual follow-up
      const response = await fetch(`${API_URL}/api/value-discovery-chat`, {
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
          mode // 'guided' or 'free'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Determine the topic for this response
      const responseTopic = data.topic || currentTopic;
      
      // Add AI response to conversation
      const aiMessage = { 
        role: 'system', 
        content: data.response, 
        timestamp: Date.now(),
        topic: responseTopic
      };
      setConversation([...newConversation, aiMessage]);
      
      // Update question count for the topic
      if (mode === 'guided') {
        setTopicQuestionCounts(prev => ({
          ...prev,
          [responseTopic]: (prev[responseTopic] || 0) + 1
        }));
        
        // If topic is now complete, suggest next topic
        const newCount = (topicQuestionCounts[responseTopic] || 0) + 1;
        if (newCount >= MAX_QUESTIONS_PER_TOPIC && data.suggestedNextTopic) {
          setCurrentTopic(data.suggestedNextTopic);
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
          className="flex-1 flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-[#7c3aed]" />
            </div>
            <span className="text-sm font-semibold text-foreground">Value Discovery</span>
            {/* Progress indicator */}
            <div className="flex items-center gap-2 ml-2">
              <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#16a34a] transition-all duration-300" 
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
        <div className="mt-3 rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          {/* Mode Toggle + Topics Bar */}
          <div className="px-4 py-2 border-b border-border bg-secondary/50">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 p-0.5 bg-background border border-border rounded-lg">
                <button
                  onClick={() => setMode('guided')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    mode === 'guided' 
                      ? 'bg-[#7c3aed] text-white shadow-sm' 
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
                      ? 'bg-[#7c3aed] text-white shadow-sm' 
                      : 'text-secondary-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <MessageCircleQuestion className="h-3 w-3" />
                  Free Ask
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {mode === 'guided' ? '3 questions per topic' : 'Ask anything'}
              </span>
            </div>
            
            {/* Clickable Topic Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Topics:</span>
              {sectionConfig.topics.map(topic => {
                const count = getTopicQuestionCount(topic.id);
                const isComplete = count >= MAX_QUESTIONS_PER_TOPIC;
                const isActive = currentTopic === topic.id && mode === 'guided';
                
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic.id)}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      isComplete
                        ? 'bg-[#30d158]/20 text-[#30d158] cursor-default'
                        : isActive
                          ? 'bg-[#5e5ce6]/30 text-[#5e5ce6] ring-1 ring-[#5e5ce6]'
                          : topic.required
                            ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]/80 hover:bg-[#ff9f0a]/20 hover:text-[#ff9f0a] cursor-pointer'
                            : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
                    }`}
                    data-testid={`topic-pill-${topic.id}`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <span className="w-3 h-3 flex items-center justify-center text-[9px] font-bold">
                        {count}/{MAX_QUESTIONS_PER_TOPIC}
                      </span>
                    )}
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
            {conversation.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0a84ff] text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'guided' ? "Type your response..." : "Ask any question..."}
                disabled={isLoading}
                className="flex-1 h-10 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0a84ff] disabled:opacity-50 text-sm"
                data-testid={`chat-input-${section.replace(/\s/g, '-')}`}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#0a84ff] hover:bg-[#0a84ff]/80 disabled:opacity-50"
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
