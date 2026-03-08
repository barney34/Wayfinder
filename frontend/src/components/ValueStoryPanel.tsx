/**
 * ValueStoryPanel — sidebar widget showing value discovery progress
 * across the 3 Infoblox value drivers (Optimize / Accelerate / Protect).
 *
 * Reads `answers` from DiscoveryContext to detect:
 *   1. Direct value-adjacent question answers
 *   2. ChatValueDiscovery conversations that have been engaged
 *
 * Lives in the bottom of the left sidebar, above Save/Export.
 */
import { Gauge, Zap, Shield, Compass, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Value driver definitions ─────────────────────────────────────────────────
// Each driver lists question IDs whose non-empty answers count as "captured"
// and chat section keys that count as "engaged" when the user has replied.
const DRIVERS = [
  {
    key: 'optimize',
    label: 'Optimize',
    color: '#12C2D3',
    Icon: Gauge,
    // Value-adjacent questions in Discovery
    questionIds: ['ipam-6', 'ipam-7', 'ipam-10', 'ipam-12'],
    // ChatValueDiscovery section keys stored in answers
    chatSections: ['IPAM', 'Internal DNS', 'DHCP'],
  },
  {
    key: 'accelerate',
    label: 'Accelerate',
    color: '#00BD4D',
    Icon: Zap,
    questionIds: ['uddi-1', 'svc-5', 'uddi-4', 'svc-6'],
    chatSections: ['Cloud Management', 'Services'],
  },
  {
    key: 'protect',
    label: 'Protect',
    color: '#FF585D',
    Icon: Shield,
    questionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4'],
    chatSections: ['Security'],
  },
];

// Count answered questions + engaged chats for a driver
function scoreDriver(driver, answers) {
  const qAnswered = driver.questionIds.filter(id => {
    const v = answers[id];
    return v && v !== '' && v !== '[]' && v !== 'false' && v !== '{}';
  }).length;

  const chatEngaged = driver.chatSections.filter(section => {
    const key = `vd-chat-${section.replace(/\s/g, '-')}`;
    const raw = answers[key];
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      // Engaged = at least 1 user message (not just the opener)
      return (parsed.messages || []).some(m => m.role === 'user');
    } catch {
      return false;
    }
  }).length;

  const total = driver.questionIds.length + driver.chatSections.length;
  const captured = qAnswered + chatEngaged;
  return { captured, total };
}

// ── Collapsed icon ────────────────────────────────────────────────────────────
function CollapsedButton({ totalCaptured, onClick, isDrawerOpen }) {
  return (
    <div className="px-1.5 py-2 border-t">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              data-testid="value-story-collapsed-btn"
              className={`w-full p-2 rounded-md flex justify-center transition-colors ${isDrawerOpen ? 'bg-primary/10' : 'hover:bg-muted'}`}
            >
              <div className="relative">
                <Compass className="h-5 w-5 text-muted-foreground" />
                {totalCaptured > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#00BD4D] rounded-full text-[8px] text-white flex items-center justify-center font-bold leading-none">
                    {totalCaptured}
                  </span>
                )}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Value Story ({totalCaptured} captured)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function ValueStoryPanel({ answers = {}, onOpen, collapsed = false, isDrawerOpen = false }) {
  const scores = DRIVERS.map(d => ({ ...d, ...scoreDriver(d, answers) }));
  const totalCaptured = scores.reduce((s, d) => s + d.captured, 0);
  const totalPossible = scores.reduce((s, d) => s + d.total, 0);

  if (collapsed) {
    return <CollapsedButton totalCaptured={totalCaptured} onClick={onOpen} isDrawerOpen={isDrawerOpen} />;
  }

  return (
    <div className="border-t bg-muted/10 flex-none" data-testid="value-story-panel">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Value Story
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {totalCaptured}/{totalPossible}
        </span>
      </div>

      {/* Driver rows */}
      <div className="px-3 pb-2 space-y-2">
        {scores.map(driver => {
          const pct = driver.total > 0 ? Math.round((driver.captured / driver.total) * 100) : 0;
          const { Icon } = driver;
          return (
            <div key={driver.key} className="flex items-center gap-2" data-testid={`value-driver-${driver.key}`}>
              <Icon className="h-3 w-3 shrink-0" style={{ color: driver.color }} />
              <span className="text-[11px] text-muted-foreground w-16 truncate">{driver.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: driver.color }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums w-7 text-right">
                {driver.captured}/{driver.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-3 pb-2.5">
        <button
          onClick={onOpen}
          data-testid="value-story-open-btn"
          className={`w-full text-[11px] flex items-center justify-center gap-1.5 py-1 rounded-md transition-colors border ${
            isDrawerOpen
              ? 'text-primary bg-primary/10 border-primary/40'
              : 'text-primary hover:text-primary/80 hover:bg-primary/5 border-primary/20 hover:border-primary/40'
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          {isDrawerOpen ? 'Close Value Discovery' : 'Open Value Discovery'}
        </button>
      </div>
    </div>
  );
}
