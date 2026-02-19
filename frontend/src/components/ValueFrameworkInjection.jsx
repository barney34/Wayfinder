/**
 * ValueFrameworkInjection - Seed VF questions injected into discovery sections
 * Shows 1-2 seed questions per section based on tag mapping.
 * When answered, contextual follow-ups appear framed around the customer's response.
 */
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, ChevronDown, MessageSquare, TrendingUp, Lightbulb } from "lucide-react";
import { useDiscovery } from "@/contexts/DiscoveryContext";

// Map discovery sections to VF tags (section-specific tags)
const SECTION_TO_TAGS = {
  'IPAM': ['IPAM'],
  'Internal DNS': ['IDNS'],
  'External DNS': ['EDNS'],
  'DHCP': ['DHCP'],
  'Cloud Management': ['CLOUD'],
  'Services': ['CLOUD'],  // Services also uses cloud questions
  'Security': ['SECURITY'],
};

// Contextual follow-ups triggered by seed question answers
// Each follow-up has a trigger (seed question ID + condition) and a framing message
const FOLLOW_UPS = {
  // Optimize seeds
  'vf-opt-1': [
    { id: 'vf-fu-opt-1a', question: 'How many cloud providers are you managing DNS/DHCP across today?', framing: 'Understanding your cloud footprint helps size the right deployment model.' },
    { id: 'vf-fu-opt-1b', question: 'Are you experiencing delays deploying new cloud services due to DNS/IPAM provisioning?', framing: 'Cloud goals often get blocked by manual DDI processes.' },
  ],
  'vf-opt-2': [
    { id: 'vf-fu-opt-2a', question: 'How many hours per week does your team spend troubleshooting DNS/DHCP issues?', framing: 'Based on your challenges, quantifying the operational impact helps build the business case.' },
    { id: 'vf-fu-opt-2b', question: 'Have these challenges resulted in any outages or compliance gaps?', framing: 'Day-to-day friction often masks larger risk exposure.' },
  ],
  'vf-opt-7': [
    { id: 'vf-fu-opt-7a', question: 'Do you have a real-time inventory of all network-connected assets including IoT?', framing: 'Asset visibility gaps are a top cause of security blind spots.' },
  ],
  'vf-opt-8': [
    { id: 'vf-fu-opt-8a', question: 'How many different tools do you use to manage DNS, DHCP, and IPAM?', framing: 'Most enterprises use 3+ tools — each adding complexity and risk.' },
    { id: 'vf-fu-opt-8b', question: 'Can you see the health of all DDI services from a single dashboard?', framing: 'Unified visibility is the #1 driver for DDI consolidation.' },
  ],
  // Accelerate seeds
  'vf-acc-1': [
    { id: 'vf-fu-acc-1a', question: 'How long does it take to provision DNS/IPAM for a new cloud instance?', framing: 'Most enterprises take 6+ weeks per new app deployment — automation cuts this to minutes.' },
  ],
  'vf-acc-4': [
    { id: 'vf-fu-acc-4a', question: 'What was the estimated cost of that outage (downtime, lost productivity, SLA penalties)?', framing: 'The average enterprise faces $2M/year in network outage costs.' },
    { id: 'vf-fu-acc-4b', question: 'Was the root cause related to DNS, DHCP, or IP address conflicts?', framing: 'DDI misconfigurations are behind 80% of network outages.' },
  ],
  'vf-acc-7': [
    { id: 'vf-fu-acc-7a', question: 'Are you using infrastructure-as-code (Terraform, Ansible) for DDI provisioning?', framing: 'API-first automation eliminates manual errors and accelerates deployment.' },
  ],
  // Protect seeds
  'vf-pro-3': [
    { id: 'vf-fu-pro-3a', question: 'Was DNS involved in the attack chain (exfiltration, C2 communication, phishing)?', framing: '>90% of cyberattacks leverage DNS at some stage.' },
    { id: 'vf-fu-pro-3b', question: 'How long did it take to detect and contain the incident?', framing: 'Industry average is 250+ days. DNS-level detection can flag threats 60+ days earlier.' },
  ],
  'vf-pro-4': [
    { id: 'vf-fu-pro-4a', question: 'What percentage of your security alerts does your SOC actually investigate?', framing: '55% of critical alerts are missed by the average SOC.' },
  ],
  'vf-pro-8': [
    { id: 'vf-fu-pro-8a', question: 'Are you concerned about lookalike domains targeting your brand?', framing: 'Infoblox detects and takes down lookalike domains in 24-48 hours.' },
    { id: 'vf-fu-pro-8b', question: 'How do you protect IoT/OT devices that can\'t run endpoint agents?', framing: 'DNS-level protection covers every device without requiring agents.' },
  ],
  'vf-pro-12': [
    { id: 'vf-fu-pro-12a', question: 'Are you blocking threats at the DNS layer before they reach endpoints?', framing: 'DNS is the earliest point to detect and block — before the first connection.' },
  ],
};

// Pick seed questions for a section (max 2-3)
function getSeedQuestionsForSection(section, allVfQuestions) {
  const tags = SECTION_TO_TAGS[section];
  if (!tags || !allVfQuestions) return [];

  const candidates = allVfQuestions.filter(q =>
    q.tags.some(t => tags.includes(t))
  );

  // Pick max 2 seeds per section — prefer questions with follow-ups
  const withFollowUps = candidates.filter(q => FOLLOW_UPS[q.id]);
  const picked = withFollowUps.slice(0, 2);
  if (picked.length < 2) {
    const remaining = candidates.filter(q => !picked.includes(q));
    picked.push(...remaining.slice(0, 2 - picked.length));
  }
  return picked;
}

// Category colors
const CATEGORY_STYLES = {
  optimize: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', icon: '🔍' },
  accelerate: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', icon: '🚀' },
  protect: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', icon: '🛡️' },
};

export function ValueFrameworkInjection({ section }) {
  const { answers, setAnswer } = useDiscovery();
  const [framework, setFramework] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetch(`${API_URL}/api/value-framework`)
      .then(r => r.json())
      .then(setFramework)
      .catch(() => {});
  }, [API_URL]);

  if (!framework) return null;

  // Gather all VF questions across categories with their category info
  const allVfQuestions = framework.categories.flatMap(cat =>
    cat.discovery_questions.map(q => ({ ...q, categoryId: cat.id, categoryName: cat.name }))
  );

  const seeds = getSeedQuestionsForSection(section, allVfQuestions);
  if (seeds.length === 0) return null;

  // Check if any seeds have been answered
  const answeredSeeds = seeds.filter(q => answers[q.id]?.trim());
  // Get triggered follow-ups
  const triggeredFollowUps = answeredSeeds.flatMap(seed => {
    const fus = FOLLOW_UPS[seed.id] || [];
    return fus.map(fu => ({ ...fu, seedId: seed.id, seedAnswer: answers[seed.id], categoryId: seed.categoryId }));
  });

  return (
    <div className="mb-3" data-testid={`vf-injection-${section.replace(/\s/g, '-')}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/40 hover:from-indigo-50 hover:to-purple-50 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Value Discovery</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400">
          {answeredSeeds.length}/{seeds.length}
        </Badge>
        {triggeredFollowUps.length > 0 && (
          <Badge className="text-[9px] px-1 py-0 bg-indigo-500 text-white">
            +{triggeredFollowUps.length} follow-up{triggeredFollowUps.length > 1 ? 's' : ''}
          </Badge>
        )}
        <div className="flex-1" />
        {expanded ? <ChevronDown className="h-3 w-3 text-indigo-400" /> : <ChevronRight className="h-3 w-3 text-indigo-400" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800/50">
          {/* Seed Questions */}
          {seeds.map(seed => {
            const catStyle = CATEGORY_STYLES[seed.categoryId] || CATEGORY_STYLES.optimize;
            const currentAnswer = answers[seed.id] || '';
            const hasAnswer = currentAnswer.trim().length > 0;
            const followUps = FOLLOW_UPS[seed.id] || [];
            const showFollowUps = hasAnswer && followUps.length > 0;

            return (
              <div key={seed.id} className="space-y-1.5" data-testid={`vf-seed-${seed.id}`}>
                {/* Seed Question */}
                <div className={`rounded-md border px-3 py-2 transition-colors ${hasAnswer ? 'bg-white dark:bg-card border-indigo-200 dark:border-indigo-800' : 'bg-muted/20 border-border/50'}`}>
                  <div className="flex items-start gap-2 mb-1.5">
                    <MessageSquare className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-xs leading-relaxed flex-1">{seed.question}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${catStyle.badge}`}>
                      {seed.categoryName.split(' ')[0]}
                    </span>
                  </div>
                  <Input
                    value={currentAnswer}
                    onChange={e => setAnswer(seed.id, e.target.value)}
                    placeholder="Customer's response..."
                    className="h-7 text-xs bg-background/50"
                    data-testid={`vf-seed-input-${seed.id}`}
                  />
                </div>

                {/* Triggered Follow-ups */}
                {showFollowUps && (
                  <div className="pl-4 space-y-1.5">
                    {followUps.map(fu => {
                      const fuAnswer = answers[fu.id] || '';
                      return (
                        <div key={fu.id} className="rounded-md border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 px-3 py-2" data-testid={`vf-followup-${fu.id}`}>
                          {/* Framing - contextual bridge */}
                          <div className="flex items-start gap-1.5 mb-1.5">
                            <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 italic leading-relaxed">{fu.framing}</span>
                          </div>
                          {/* Follow-up question */}
                          <div className="flex items-start gap-2 mb-1.5">
                            <TrendingUp className="h-3 w-3 text-indigo-400 mt-0.5 shrink-0" />
                            <span className="text-xs leading-relaxed">{fu.question}</span>
                          </div>
                          <Input
                            value={fuAnswer}
                            onChange={e => setAnswer(fu.id, e.target.value)}
                            placeholder="Response..."
                            className="h-7 text-xs bg-background/50"
                            data-testid={`vf-fu-input-${fu.id}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
