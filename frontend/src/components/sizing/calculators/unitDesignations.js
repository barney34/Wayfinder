/**
 * Unit Designations for Infoblox Design Template
 * Maps roles to unit letters per the LucidChart Design Template Cheat Sheet
 */

// Role → Unit Letter mapping
export const ROLE_TO_UNIT = {
  'GM':       'A',  // Grid Manager (A1 = GM)
  'GMC':      'A',  // Grid Master Candidate (A2+ = GMC)
  'GM+DNS':   'A',
  'GM+DHCP':  'A',
  'GM+DNS/DHCP': 'A',
  'GMC+DNS':  'A',
  'GMC+DHCP': 'A',
  'GMC+DNS/DHCP': 'A',
  'DNS':      'B',  // Internal DNS
  'DNS/DHCP': 'B',  // Multi-protocol DNS/DHCP
  'DHCP':     'C',  // DHCP members or secondary DNS
  'Edge':     'D',  // Edge/Remote DNS/DHCP
  'ExtDNS':   'E',  // External Authoritative DNS
  'Cache':    'F',  // Cache forwarders / DMZ recursive DNS
  'Guest':    'G',  // Guest network devices
  'MSSync':   'M',  // Microsoft Sync members
  'NI':       'N',  // Network Insight
  'Reporting':'RPT',// Reporting Server(s)
  'License':  'LIC',// License-only items
  'CDC':      'CDC',// Cloud Data Connector
};

// Unit letter definitions with descriptions
export const UNIT_OPTIONS = [
  { value: 'A',   label: 'A — GM / GMC' },
  { value: 'B',   label: 'B — Internal DNS' },
  { value: 'C',   label: 'C — DHCP' },
  { value: 'D',   label: 'D — Edge/Remote' },
  { value: 'E',   label: 'E — External Auth DNS' },
  { value: 'F',   label: 'F — Cache/DMZ DNS' },
  { value: 'G',   label: 'G — Guest Network' },
  { value: 'M',   label: 'M — MS Sync' },
  { value: 'N',   label: 'N — Network Insight' },
  { value: 'RPT', label: 'RPT — Reporting' },
  { value: 'LIC', label: 'LIC — License Only' },
  { value: 'CDC', label: 'CDC — Cloud Data Connector' },
];

// Sort priority — lower number = higher in the table
export const UNIT_SORT_ORDER = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6,
  'G': 7, 'M': 8, 'N': 9, 'RPT': 10, 'LIC': 11, 'CDC': 12,
};

/**
 * Get the unit letter for a given role
 */
export function getUnitLetterForRole(role) {
  if (!role) return 'B';
  // Check exact match first
  if (ROLE_TO_UNIT[role]) return ROLE_TO_UNIT[role];
  // Check if role starts with GM or GMC (for composite roles like GM+DNS)
  if (role.startsWith('GMC')) return 'A';
  if (role.startsWith('GM')) return 'A';
  // Default to B (Internal DNS) for unknown roles
  return 'B';
}

/**
 * Auto-assign unit numbers globally across all servers in a drawing.
 * Returns a map of serverId → { unitLetter, unitNumber }
 * 
 * Rules:
 * - A1 = always GM, A2+ = GMC
 * - Numbers increment per letter across the entire drawing
 * - Grouped rows (e.g., 1-3) advance the counter by their server count
 * - Sort: A1, A2, B1, B2, B3, C1, etc.
 */
export function computeUnitAssignments(servers) {
  // Group by unit letter
  const letterGroups = {};
  
  servers.forEach(srv => {
    const letter = srv.unitLetterOverride || getUnitLetterForRole(srv.role);
    if (!letterGroups[letter]) letterGroups[letter] = [];
    letterGroups[letter].push(srv);
  });

  // For A units: GM first (A1), then GMC (A2+)
  if (letterGroups['A']) {
    letterGroups['A'].sort((a, b) => {
      const aIsGM = a.role === 'GM' || a.role?.startsWith('GM+');
      const bIsGM = b.role === 'GM' || b.role?.startsWith('GM+');
      if (aIsGM && !bIsGM) return -1;
      if (!aIsGM && bIsGM) return 1;
      return 0;
    });
  }

  // Assign numbers within each letter group
  // Grouped rows (with _serverCount > 1) advance the counter by their count
  const assignments = {};
  Object.keys(letterGroups)
    .sort((a, b) => (UNIT_SORT_ORDER[a] || 99) - (UNIT_SORT_ORDER[b] || 99))
    .forEach(letter => {
      let counter = 1;
      letterGroups[letter].forEach((srv) => {
        assignments[srv.id] = {
          unitLetter: letter,
          unitNumber: counter,
        };
        // Advance counter by the number of physical servers this row represents
        counter += srv._serverCount || 1;
      });
    });

  return assignments;
}
