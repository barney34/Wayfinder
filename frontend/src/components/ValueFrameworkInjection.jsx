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
// Each follow-up has a trigger (seed question ID) and a framing message
const FOLLOW_UPS = {
  // IPAM section follow-ups
  'vf-opt-ipam-1': [
    { id: 'vf-fu-ipam-1a', question: 'How many different tools/spreadsheets do you use for IP tracking?', framing: 'Fragmented IP management is a top cause of conflicts and audit failures.' },
    { id: 'vf-fu-ipam-1b', question: 'How long does it take to find an available IP address when needed?', framing: 'Manual IP allocation often takes hours when it should take seconds.' },
  ],
  'vf-opt-ipam-2': [
    { id: 'vf-fu-ipam-2a', question: 'How much time did the IP conflict resolution take?', framing: 'IP conflicts can cascade into application outages costing $300k+/hour.' },
  ],
  'vf-acc-ipam-1': [
    { id: 'vf-fu-ipam-3a', question: 'Is IP provisioning a bottleneck for your deployment pipeline?', framing: 'Automated IPAM can reduce provisioning from days to seconds.' },
  ],
  
  // Internal DNS section follow-ups
  'vf-opt-idns-1': [
    { id: 'vf-fu-idns-1a', question: 'How many DNS servers/zones are you managing across all sites?', framing: 'Most enterprises have 3+ DNS tools — each adding complexity.' },
    { id: 'vf-fu-idns-1b', question: 'How do you handle DNS changes when AD servers are updated?', framing: 'AD-integrated DNS often creates management silos.' },
  ],
  'vf-acc-idns-2': [
    { id: 'vf-fu-idns-2a', question: 'What was the MTTR for the DNS-related outage?', framing: 'DNS misconfigurations cause 80% of network outages.' },
  ],
  'vf-pro-idns-1': [
    { id: 'vf-fu-idns-3a', question: 'Can you detect DNS tunneling or exfiltration attempts?', framing: '>90% of malware uses DNS for command & control.' },
  ],
  
  // External DNS section follow-ups
  'vf-opt-edns-1': [
    { id: 'vf-fu-edns-1a', question: 'How do you coordinate external DNS changes across teams?', framing: 'External DNS changes often require multiple approvals, slowing deployments.' },
  ],
  'vf-pro-edns-2': [
    { id: 'vf-fu-edns-2a', question: 'How many lookalike domains have you discovered targeting your brand?', framing: 'Average enterprise sees 20+ lookalike domains per month.' },
    { id: 'vf-fu-edns-2b', question: 'How long does it take to get a malicious domain taken down?', framing: 'Infoblox achieves takedowns in 24-48 hours vs industry average of weeks.' },
  ],
  
  // DHCP section follow-ups
  'vf-opt-dhcp-1': [
    { id: 'vf-fu-dhcp-1a', question: 'How do you monitor DHCP scope utilization across sites?', framing: 'DHCP exhaustion can silently block new device connections.' },
  ],
  'vf-opt-dhcp-2': [
    { id: 'vf-fu-dhcp-2a', question: 'How long did it take to identify and resolve the DHCP issue?', framing: 'Without centralized visibility, DHCP troubleshooting can take hours.' },
  ],
  'vf-acc-dhcp-1': [
    { id: 'vf-fu-dhcp-3a', question: 'How long does it take to deploy DHCP to a new site?', framing: 'New site DHCP deployment typically costs $75-100k with manual processes.' },
  ],
  
  // Cloud section follow-ups
  'vf-opt-cloud-1': [
    { id: 'vf-fu-cloud-1a', question: 'What challenges are blocking your cloud adoption goals?', framing: 'DDI complexity is a top blocker for cloud migrations.' },
  ],
  'vf-acc-cloud-1': [
    { id: 'vf-fu-cloud-2a', question: 'How do you manage DNS/DHCP consistency across cloud providers?', framing: '90% of enterprises have 2+ clouds — each with different DNS/DHCP tools.' },
  ],
  'vf-acc-cloud-2': [
    { id: 'vf-fu-cloud-3a', question: 'What percentage of your DDI provisioning is automated today?', framing: '80% of companies still manage DNS manually or in spreadsheets.' },
  ],
  
  // Security section follow-ups
  'vf-opt-sec-1': [
    { id: 'vf-fu-sec-1a', question: 'What percentage of security alerts does your SOC actually investigate?', framing: '55% of critical alerts are missed by the average SOC.' },
  ],
  'vf-opt-sec-3': [
    { id: 'vf-fu-sec-2a', question: 'Are you blocking threats at the DNS layer before they reach endpoints?', framing: 'DNS-level protection can detect threats 60+ days before other tools.' },
  ],
  'vf-pro-sec-2': [
    { id: 'vf-fu-sec-3a', question: 'How long does it typically take to detect a breach in your environment?', framing: 'Industry average is 250+ days to detect and contain a breach.' },
  ],
  'vf-pro-sec-3': [
    { id: 'vf-fu-sec-4a', question: 'Was DNS involved in the attack chain (exfiltration, C2, phishing)?', framing: '>90% of cyberattacks leverage DNS at some stage.' },
    { id: 'vf-fu-sec-4b', question: 'What was the estimated cost of the incident?', framing: 'Average cost of a material breach is $800k+ (IBM reports $4.9M total).' },
  ],
  'vf-pro-sec-5': [
    { id: 'vf-fu-sec-5a', question: 'What percentage of your devices are IoT/OT without endpoint agents?', framing: 'DNS-level protection covers every device without requiring agents.' },
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
  optimize: { badge: 'bg-accent/15 text-accent', border: 'border-accent/30', icon: '🔍' },
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
    <div className="mb-6" data-testid={`vf-injection-${section.replace(/\s/g, '-')}`}>
      {/* Header - HA style card */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-secondary hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm font-semibold text-foreground">Value Discovery</span>
          <span className="text-xs text-muted-foreground">{answeredSeeds.length}/{seeds.length}</span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Questions - HA card style */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {seeds.map(seed => {
            const currentAnswer = answers[seed.id] || '';
            const hasAnswer = currentAnswer.trim().length > 0;
            const followUps = FOLLOW_UPS[seed.id] || [];
            const showFollowUps = hasAnswer && followUps.length > 0;

            return (
              <div key={seed.id} className="space-y-3" data-testid={`vf-seed-${seed.id}`}>
                {/* Seed Question Card */}
                <div className={`rounded-2xl p-4 transition-all ${hasAnswer ? 'bg-secondary ring-1 ring-primary/30' : 'bg-secondary'}`}>
                  <label className="text-[15px] font-semibold text-foreground block mb-3">
                    {seed.question}
                  </label>
                  <input
                    value={currentAnswer}
                    onChange={e => setAnswer(seed.id, e.target.value)}
                    placeholder="Response..."
                    className="w-full h-11 px-4 rounded-xl bg-background border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid={`vf-seed-input-${seed.id}`}
                  />
                </div>

                {/* Follow-ups - nested card */}
                {showFollowUps && (
                  <div className="ml-4 space-y-3">
                    {followUps.map(fu => {
                      const fuAnswer = answers[fu.id] || '';
                      return (
                        <div key={fu.id} className="rounded-2xl p-4 bg-secondary border-l-4 border-accent" data-testid={`vf-followup-${fu.id}`}>
                          <p className="text-xs text-accent mb-2 italic">{fu.framing}</p>
                          <label className="text-sm font-semibold text-foreground block mb-2">
                            {fu.question}
                          </label>
                          <input
                            value={fuAnswer}
                            onChange={e => setAnswer(fu.id, e.target.value)}
                            placeholder="Response..."
                            className="w-full h-10 px-3 rounded-xl bg-background border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
