/**
 * Unit Designations for Infoblox Design Template
 * Maps roles to unit letters per the LucidChart Design Template Cheat Sheet
 */

export interface UnitOption {
  value: string;
  label: string;
}

export interface UnitAssignment {
  unitLetter: string;
  unitNumber: number;
}

export interface Server {
  id: string;
  role: string;
  unitLetterOverride?: string;
  _serverCount?: number;
}

export type LayoutMode = 'auto' | 'autoOverride';

// Role → Unit Letter mapping
export const ROLE_TO_UNIT: Record<string, string> = {
  'GM':       'A',  // Grid Manager
  'GMC':      'A',  // Grid Master Candidate
  'GM+DNS':   'A',
  'GM+DHCP':  'A',
  'GM+DNS/DHCP': 'A',
  'GMC+DNS':  'A',
  'GMC+DHCP': 'A',
  'GMC+DNS/DHCP': 'A',
  'DNS':      'B',  // Internal DNS
  'DNS/DHCP': 'B',
  'DHCP':     'C',  // DHCP
  'Edge':     'D',
  'ExtDNS':   'E',
  'Cache':    'F',
  'Guest':    'G',
  'MSSync':   'M',
  'ND':       'N',  // Network Discovery
  'ND-X':     'NX', // NIOS-X Network Discovery
  'NI':       'N',  // Network Insight (legacy)
  'Reporting':'RPT',
  'License':  'LIC',
  'CDC':      'CDC',
};

// Unit letter definitions with descriptions
export const UNIT_OPTIONS: UnitOption[] = [
  { value: 'A',   label: 'A — GM / GMC' },
  { value: 'B',   label: 'B — Internal DNS' },
  { value: 'C',   label: 'C — DHCP' },
  { value: 'D',   label: 'D — Edge/Remote' },
  { value: 'E',   label: 'E — External Auth DNS' },
  { value: 'F',   label: 'F — Cache/DMZ DNS' },
  { value: 'G',   label: 'G — Guest Network' },
  { value: 'M',   label: 'M — MS Sync' },
  { value: 'N',   label: 'N — Network Insight' },
  { value: 'NX',  label: 'NX — NIOS-X Discovery' },
  { value: 'RPT', label: 'RPT — Reporting' },
  { value: 'LIC', label: 'LIC — License Only' },
  { value: 'CDC', label: 'CDC — Cloud Data Connector' },
];

// Sort priority — lower number = higher in the table
export const UNIT_SORT_ORDER: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6,
  'G': 7, 'M': 8, 'N': 9, 'NX': 10, 'RPT': 11, 'LIC': 12, 'CDC': 13,
};

/**
 * Get the unit letter for a given role
 */
export function getUnitLetterForRole(role: string): string {
  if (!role) return 'B';
  // Check exact match first
  if (ROLE_TO_UNIT[role]) return ROLE_TO_UNIT[role];
  // Check if role starts with GM or GMC (for composite roles like GM+DNS)
  if (role.startsWith('GMC')) return 'A';
  if (role.startsWith('GM')) return 'A';
  if (role === 'ND-X') return 'NX';
  // Default to B (Internal DNS) for unknown roles
  return 'B';
}

export function getEffectiveUnitLetter(server: Pick<Server, 'role' | 'unitLetterOverride'>): string {
  return server.unitLetterOverride || getUnitLetterForRole(server.role);
}

export function isPrimaryGridManagerRole(role: string): boolean {
  return Boolean(role) && role.startsWith('GM') && !role.startsWith('GMC');
}

export function orderServersByUnit<T extends Server>(servers: T[], preferredOrderIds?: string[] | null): T[] {
  const idToServer = new Map(servers.map(server => [server.id, server]));
  const ordered: T[] = [];
  const seen = new Set<string>();

  preferredOrderIds?.forEach(id => {
    const server = idToServer.get(id);
    if (!server) return;
    ordered.push(server);
    seen.add(id);
  });

  servers.forEach(server => {
    if (seen.has(server.id)) return;
    ordered.push(server);
  });

  return [...ordered].sort((a, b) => {
    const unitA = getEffectiveUnitLetter(a);
    const unitB = getEffectiveUnitLetter(b);
    const sortA = UNIT_SORT_ORDER[unitA] ?? 99;
    const sortB = UNIT_SORT_ORDER[unitB] ?? 99;

    if (sortA !== sortB) return sortA - sortB;

    if (unitA === 'A') {
      const aIsPrimary = isPrimaryGridManagerRole(a.role);
      const bIsPrimary = isPrimaryGridManagerRole(b.role);

      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
    }

    return 0;
  });
}

/**
 * Auto-assign unit numbers globally across all servers in a drawing.
 * Returns a map of serverId → { unitLetter, unitNumber }
 * 
 * Rules:
 * - A1 = always GM, A2+ = GMC
 * - Numbers increment per letter based on the INPUT ORDER (respects drag/sort)
 * - Grouped rows (e.g., 1-3) advance the counter by their server count
 * - Sequential numbering within each unit group: A1, A2, B1, B2, B3, C1, etc.
 */
export function computeUnitAssignments(servers: Server[]): Record<string, UnitAssignment> {
  // Track counters for each unit letter
  const letterCounters: Record<string, number> = {};
  
  // Assign numbers in the order servers are provided (respects siteOrder)
  const assignments: Record<string, UnitAssignment> = {};
  
  servers.forEach(srv => {
    const letter = getEffectiveUnitLetter(srv);
    
    // Initialize counter for this letter if not seen yet
    if (letterCounters[letter] === undefined) {
      letterCounters[letter] = 1;
    }
    
    assignments[srv.id] = {
      unitLetter: letter,
      unitNumber: letterCounters[letter],
    };
    
    // Advance counter by server count (or +2 for Reporting to account for TR-SWTL)
    const advance = (srv.role === 'Reporting') ? 2 : (srv._serverCount || 1);
    letterCounters[letter] += advance;
  });

  return assignments;
}
