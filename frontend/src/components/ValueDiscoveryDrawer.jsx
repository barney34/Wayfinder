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
  try { const arr = JSON.parse(a['ipam-9'] || '[]'); return `Cloud: ${arr.join(', ')}`; } catch { return 'Cloud detected'; }
}
function integLabel(a) {
  try { const arr = JSON.parse(a['ipam-11'] || '[]'); return `Integrations: ${arr.slice(0, 2).join(', ')}${arr.length > 2 ? '…' : ''}`; } catch { return 'Integrations'; }
}
function automLabel(a) {
  try { const arr = JSON.parse(a['ipam-13'] || '[]'); return arr.join(', '); } catch { return 'Automation'; }
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

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function ValueDiscoveryDrawer({ onClose }) {
  const { answers } = useDiscovery();
  const [activeDriver, setActiveDriver] = useState('optimize');

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

      {/* Driver description */}
      <div className="px-3 py-1.5 border-b">
        <p className="text-[11px] text-muted-foreground italic">{driver.description}</p>
      </div>

      {/* Chat — reuses existing ChatValueDiscovery, shares same storage key */}
      <div className="flex-1 overflow-hidden">
        <ChatValueDiscovery section={driver.chatSection} key={activeDriver} />
      </div>
    </div>
  );
}
