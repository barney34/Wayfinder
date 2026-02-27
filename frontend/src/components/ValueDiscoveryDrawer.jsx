/**
 * ValueDiscoveryDrawer
 * Slide-out panel anchored to the left sidebar.
 * Three driver tabs (Optimize / Accelerate / Protect) each backed by
 * the existing ChatValueDiscovery conversational AI, seeded with
 * context chips detected from the technical answers already given.
 */
import { useState, useMemo } from "react";
import { X, Gauge, Zap, Shield, Compass } from "lucide-react";
import { ChatValueDiscovery } from "./ChatValueDiscovery";
import { useDiscovery } from "@/contexts/DiscoveryContext";

// ── Driver definitions ────────────────────────────────────────────────────────
const DRIVERS = [
  {
    key: 'optimize',
    label: 'Optimize',
    color: '#12C2D3',
    Icon: Gauge,
    chatSection: 'IPAM',
    description: 'Critical network services, IP management, visibility',
  },
  {
    key: 'accelerate',
    label: 'Accelerate',
    color: '#00BD4D',
    Icon: Zap,
    chatSection: 'Services',
    description: 'Cloud adoption, DDI strategy, automation',
  },
  {
    key: 'protect',
    label: 'Protect',
    color: '#FF585D',
    Icon: Shield,
    chatSection: 'Security',
    description: 'Threat detection, SOC efficiency, risk reduction',
  },
];

// ── Trigger chip detection ────────────────────────────────────────────────────
// Each trigger maps a detected technical answer to a context chip shown in the drawer
const TRIGGERS = [
  // Optimize
  { id: 'spreadsheets', driver: 'optimize', detect: (a) => tryIncludes(a['ipam-0'], 'Spreadsheets'), label: 'Spreadsheets for IPAM' },
  { id: 'ms-ipam',      driver: 'optimize', detect: (a) => tryIncludes(a['ipam-0'], 'Microsoft'),    label: 'Microsoft IPAM' },
  { id: 'ms-dns',       driver: 'optimize', detect: (a) => tryIncludes(a['idns-0'], 'Microsoft'),    label: 'Microsoft DNS' },
  { id: 'ms-dhcp',      driver: 'optimize', detect: (a) => tryIncludes(a['dhcp-0'], 'Microsoft'),    label: 'Microsoft DHCP' },
  { id: 'bind',         driver: 'optimize', detect: (a) => tryIncludes(a['idns-0'], 'BIND'),          label: 'BIND DNS' },
  // Accelerate
  { id: 'cloud',        driver: 'accelerate', detect: (a) => hasValues(a['ipam-9']),   label: cloudLabel },
  { id: 'integrations', driver: 'accelerate', detect: (a) => hasValues(a['ipam-11']), label: integLabel },
  { id: 'automation',   driver: 'accelerate', detect: (a) => hasValues(a['ipam-13']), label: automLabel },
  // Protect
  { id: 'iot',          driver: 'protect', detect: (a) => parseInt(a['ni-3'] || '0') > 0, label: (a) => `${parseInt(a['ni-3']).toLocaleString()} SNMP/SSH devices` },
  { id: 'sec-rpz',      driver: 'protect', detect: (a) => a['sec-1'],                     label: 'DNS threat exposure noted' },
];

function tryIncludes(val, str) {
  if (!val) return false;
  try { const arr = JSON.parse(val); return Array.isArray(arr) && arr.some(v => v.includes(str)); } catch {
    // GridMultiSelect stores as CSV string — fall back to CSV check
    return val.split(',').some(v => v.trim().includes(str));
  }
}

function hasValues(val) {
  if (!val) return false;
  try { const arr = JSON.parse(val); return Array.isArray(arr) && arr.length > 0; } catch {
    return val.trim().length > 0;
  }
}

function cloudLabel(a) {
  const val = a['ipam-9'] || '';
  try { const arr = JSON.parse(val); return `Cloud: ${arr.join(', ')}`; } catch { return val.trim() ? `Cloud: ${val}` : 'Cloud detected'; }
}
function integLabel(a) {
  const val = a['ipam-11'] || '';
  try { const arr = JSON.parse(val); return `Integrations: ${arr.slice(0, 2).join(', ')}${arr.length > 2 ? '…' : ''}`; } catch {
    const parts = val.split(',').map(v => v.trim()).filter(Boolean);
    return `Integrations: ${parts.slice(0, 2).join(', ')}${parts.length > 2 ? '…' : ''}`;
  }
}
function automLabel(a) {
  const val = a['ipam-13'] || '';
  try { const arr = JSON.parse(val); return arr.join(', '); } catch { return val || 'Automation'; }
}

function resolveLabel(trigger, answers) {
  return typeof trigger.label === 'function' ? trigger.label(answers) : trigger.label;
}

// ── Chip component ────────────────────────────────────────────────────────────
function TriggerChip({ label, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
      style={{ borderColor: color + '60', backgroundColor: color + '15', color }}
    >
      {label}
    </span>
  );
}

// ── Contextual opener builder ─────────────────────────────────────────────────
// Generates a specific, trigger-aware opening question based on what was detected
function buildContextualOpener(driverKey, answers) {
  if (driverKey === 'optimize') {
    const hasSpreadsheets = tryIncludes(answers['ipam-0'], 'Spreadsheets');
    const hasMsIpam     = tryIncludes(answers['ipam-0'], 'Microsoft');
    const hasMsDns      = tryIncludes(answers['idns-0'], 'Microsoft');
    const hasMsDhcp     = tryIncludes(answers['dhcp-0'], 'Microsoft');

    if (hasSpreadsheets)
      return `You're managing IP space with spreadsheets — let's make that pain tangible. Walk me through what happens when two teams claim the same subnet at the same time. What's the fallout, and how long does it take to sort out?`;
    if (hasMsIpam || hasMsDns)
      return `You're running Microsoft DNS${hasMsDhcp ? ' and DHCP' : ''}. At scale that creates real friction — change windows, single-pane visibility, auditing. What's the biggest headache with it today?`;
    if (hasMsDhcp)
      return `You're using Microsoft DHCP. Multi-site failover and scope exhaustion are common pain points there. How are you managing DHCP availability across your ${answers['ud-5'] || 'multiple'} data centers today?`;
    return `Let's explore how your critical network services are holding up. Walk me through a situation recently where DNS, DHCP, or IP management slowed you down or created risk.`;
  }

  if (driverKey === 'accelerate') {
    const cloudVal = answers['ipam-9'] || '';
    const integVal = answers['ipam-11'] || '';
    const automVal = answers['ipam-13'] || '';
    const hasCloud  = hasValues(cloudVal);
    const hasInteg  = hasValues(integVal);
    const hasAutom  = hasValues(automVal);

    if (hasCloud) {
      const cloudList = cloudVal.split(',').map(v => v.trim()).filter(Boolean).join(' and ');
      return `You're running on ${cloudList}. How consistent is your DNS and DHCP policy between those cloud environments and on-prem today? Where does configuration drift or blind spots show up?`;
    }
    if (hasInteg) {
      const tools = integVal.split(',').map(v => v.trim()).filter(Boolean).slice(0, 2).join(' and ');
      return `You've got ${tools} in your stack. How much manual effort does your team spend keeping DDI data in sync with those security tools? What breaks when that sync falls behind?`;
    }
    if (hasAutom) {
      const tools = automVal.split(',').map(v => v.trim()).filter(Boolean).join(' and ');
      return `You're using ${tools} for automation. Is DNS and DHCP provisioning fully part of those pipelines today, or is it still a manual step that slows deployments down?`;
    }
    return `Let's talk about your DDI strategy as you scale. What's the biggest obstacle to moving faster on cloud adoption or infrastructure automation right now?`;
  }

  if (driverKey === 'protect') {
    const ni3 = parseInt(answers['ni-3'] || '0');
    if (ni3 > 0)
      return `You have ${ni3.toLocaleString()} SNMP/SSH devices in your environment. How confident are you that's the complete picture — including IoT, OT, and shadow devices that never got properly inventoried? What would a blind spot there cost you?`;
    return `DNS is the most exploited attack vector in most networks, yet it's often the least monitored. Walk me through your current visibility into DNS-based threats. What's your biggest concern right now?`;
  }

  return null;
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function ValueDiscoveryDrawer({ onClose, defaultDriver = 'optimize' }) {
  const { answers } = useDiscovery();
  const [activeDriver, setActiveDriver] = useState(defaultDriver);

  // Detect triggers per driver
  const triggersByDriver = useMemo(() => {
    const result = {};
    DRIVERS.forEach(d => {
      result[d.key] = TRIGGERS
        .filter(t => t.driver === d.key && t.detect(answers))
        .map(t => resolveLabel(t, answers));
    });
    return result;
  }, [answers]);

  // Build a contextual opener for the active driver
  const contextualOpener = useMemo(
    () => buildContextualOpener(activeDriver, answers),
    [activeDriver, answers]
  );

  const driver = DRIVERS.find(d => d.key === activeDriver);

  return (
    <div
      className="w-[360px] flex-none flex flex-col border-r bg-card shadow-xl"
      data-testid="value-discovery-drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#00BD4D]" />
          <span className="font-semibold text-sm">Value Discovery</span>
        </div>
        <button
          onClick={onClose}
          data-testid="value-drawer-close"
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Driver tabs */}
      <div className="flex border-b">
        {DRIVERS.map(d => {
          const { Icon } = d;
          const isActive = activeDriver === d.key;
          const chipCount = triggersByDriver[d.key]?.length || 0;
          return (
            <button
              key={d.key}
              onClick={() => setActiveDriver(d.key)}
              data-testid={`driver-tab-${d.key}`}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-xs font-medium transition-colors relative"
              style={{
                color: isActive ? d.color : undefined,
                borderBottom: isActive ? `2px solid ${d.color}` : '2px solid transparent',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{d.label}</span>
              {chipCount > 0 && (
                <span
                  className="absolute top-1.5 right-2 w-3.5 h-3.5 rounded-full text-[8px] text-white flex items-center justify-center font-bold leading-none"
                  style={{ backgroundColor: d.color }}
                >
                  {chipCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Context chips — detected from technical answers */}
      {triggersByDriver[activeDriver]?.length > 0 && (
        <div className="px-3 py-2 border-b bg-muted/10 flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground w-full mb-0.5">Detected context:</span>
          {triggersByDriver[activeDriver].map((chip, i) => (
            <TriggerChip key={i} label={chip} color={driver.color} />
          ))}
        </div>
      )}

      {/* Chat — auto-expanded, contextual opener based on detected triggers */}
      <div className="flex-1 overflow-hidden">
        <ChatValueDiscovery
          section={driver.chatSection}
          key={activeDriver}
          defaultExpanded={true}
          contextualOpener={contextualOpener}
        />
      </div>
    </div>
  );
}
