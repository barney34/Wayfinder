/**
 * ChatValueDiscovery - Conversational Value Discovery with AI-powered follow-ups
 * 
 * Hybrid approach:
 * - Pre-defined key topics that MUST be covered (pain points, impact, goals, timeline)
 * - AI generates natural follow-up questions based on responses
 * - Ensures completeness while feeling conversational
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [coveredTopics, setCoveredTopics] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const sectionConfig = SECTION_TOPICS[section] || DEFAULT_SECTION;
  const storageKey = `vd-chat-${section.replace(/\s/g, '-')}`;

  // Load conversation from answers context on mount
  useEffect(() => {
    const savedConvo = answers[storageKey];
    if (savedConvo) {
      try {
        const parsed = JSON.parse(savedConvo);
        setConversation(parsed.messages || []);
        setCoveredTopics(parsed.coveredTopics || []);
      } catch (e) {
        // Start fresh if invalid
        initConversation();
      }
    } else {
      initConversation();
    }
  }, [section]);

  // Save conversation to answers context
  useEffect(() => {
    if (conversation.length > 0) {
      setAnswer(storageKey, JSON.stringify({
        messages: conversation,
        coveredTopics: coveredTopics
      }));
    }
  }, [conversation, coveredTopics]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const initConversation = useCallback(() => {
    setConversation([
      { role: 'system', content: sectionConfig.opener, timestamp: Date.now() }
    ]);
    setCoveredTopics([]);
  }, [sectionConfig]);

  const resetConversation = () => {
    initConversation();
    toast({
      title: "Conversation reset",
      description: "Starting fresh with Value Discovery",
    });
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputValue.trim(), timestamp: Date.now() };
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
          coveredTopics,
          requiredTopics: sectionConfig.topics,
          contextHints: sectionConfig.contextHints
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI response to conversation
      const aiMessage = { role: 'system', content: data.response, timestamp: Date.now() };
      setConversation([...newConversation, aiMessage]);
      
      // Update covered topics
      if (data.newTopicsCovered && data.newTopicsCovered.length > 0) {
        setCoveredTopics(prev => [...new Set([...prev, ...data.newTopicsCovered])]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Fallback to a generic follow-up
      const fallbackMessage = { 
        role: 'system', 
        content: "Thanks for sharing. Can you tell me more about the business impact of this situation?",
        timestamp: Date.now()
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

  // Calculate progress
  const requiredTopics = sectionConfig.topics.filter(t => t.required);
  const requiredCovered = requiredTopics.filter(t => coveredTopics.includes(t.id)).length;
  const progressPercent = requiredTopics.length > 0 
    ? Math.round((requiredCovered / requiredTopics.length) * 100) 
    : 0;

  return (
    <div className="mb-6" data-testid={`chat-vd-${section.replace(/\s/g, '-')}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#2c2c2e] hover:bg-[#3c3c3e] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#5e5ce6]/20 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-[#5e5ce6]" />
          </div>
          <span className="text-sm font-semibold text-white">Value Discovery</span>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-16 h-1.5 bg-[#3c3c3e] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#30d158] transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-[#8e8e93]">{progressPercent}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); resetConversation(); }}
              className="p-1.5 rounded-lg hover:bg-[#48484a] text-[#8e8e93] hover:text-white transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-[#8e8e93]" /> : <ChevronRight className="h-4 w-4 text-[#8e8e93]" />}
        </div>
      </button>

      {/* Chat Interface */}
      {expanded && (
        <div className="mt-3 rounded-2xl bg-[#1c1c1e] border border-[#3c3c3e] overflow-hidden">
          {/* Topics Progress Bar */}
          <div className="px-4 py-2 border-b border-[#3c3c3e] flex items-center gap-3 bg-[#2c2c2e]/50">
            <span className="text-[10px] text-[#8e8e93] uppercase tracking-wider">Topics:</span>
            <div className="flex items-center gap-2">
              {sectionConfig.topics.map(topic => (
                <div 
                  key={topic.id}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                    coveredTopics.includes(topic.id)
                      ? 'bg-[#30d158]/20 text-[#30d158]'
                      : topic.required
                        ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]/70'
                        : 'bg-[#3c3c3e] text-[#8e8e93]'
                  }`}
                >
                  {coveredTopics.includes(topic.id) 
                    ? <CheckCircle2 className="h-2.5 w-2.5" />
                    : <Circle className="h-2.5 w-2.5" />
                  }
                  {topic.label}
                </div>
              ))}
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
                      : 'bg-[#2c2c2e] text-white rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#2c2c2e] text-[#8e8e93] px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#3c3c3e] bg-[#2c2c2e]/30">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1 h-10 px-4 rounded-xl bg-[#1c1c1e] border border-[#3c3c3e] text-white placeholder:text-[#8e8e93] focus:outline-none focus:border-[#0a84ff] disabled:opacity-50 text-sm"
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
