/**
 * Platform Configuration Constants for Token Calculator
 * Extracted from TokenCalculatorSummary.jsx for better organization
 */

// Global platform modes
export const PLATFORM_MODES = [
  { value: 'NIOS', label: 'NIOS', description: 'Traditional on-prem (Physical/Virtual)' },
  { value: 'UDDI', label: 'UDDI', description: 'Cloud-native NIOS-X' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Mix of NIOS + UDDI' },
];

// Platform options per mode - Simplified: Physical/Virtual only (HA is separate checkbox)
export const PLATFORM_OPTIONS_BY_MODE = {
  NIOS: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
  ],
  UDDI: [
    { value: 'NXVS', label: 'NIOS-X Virtual Server' },
    { value: 'NXaaS', label: 'NIOS-X as a Service' },
  ],
  Hybrid: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
    { value: 'NXVS', label: 'NIOS-X VS' },
    { value: 'NXaaS', label: 'NXaaS' },
  ],
};

// Role options by platform mode (UDDI doesn't have GM/GMC)
export const ROLE_OPTIONS_BY_MODE = {
  NIOS: [
    { value: 'GM', label: 'GM', description: 'Grid Master (no DNS/DHCP)' },
    { value: 'GM+DNS', label: 'GM+DNS', description: 'Grid Master with DNS (not recommended)', notRecommended: true },
    { value: 'GM+DHCP', label: 'GM+DHCP', description: 'Grid Master with DHCP (not recommended)', notRecommended: true },
    { value: 'GM+DNS/DHCP', label: 'GM+DNS/DHCP', description: 'Grid Master with DNS+DHCP (not recommended)', notRecommended: true },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate (no DNS/DHCP)' },
    { value: 'GMC+DNS', label: 'GMC+DNS', description: 'GMC with DNS (not recommended)', notRecommended: true },
    { value: 'GMC+DHCP', label: 'GMC+DHCP', description: 'GMC with DHCP (not recommended)', notRecommended: true },
    { value: 'GMC+DNS/DHCP', label: 'GMC+DNS/DHCP', description: 'GMC with DNS+DHCP (not recommended)', notRecommended: true },
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
  UDDI: [
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
  Hybrid: [
    { value: 'GM', label: 'GM', description: 'Grid Master (NIOS only, no DNS/DHCP)' },
    { value: 'GM+DNS', label: 'GM+DNS', description: 'Grid Master with DNS (not recommended)', notRecommended: true },
    { value: 'GM+DHCP', label: 'GM+DHCP', description: 'Grid Master with DHCP (not recommended)', notRecommended: true },
    { value: 'GM+DNS/DHCP', label: 'GM+DNS/DHCP', description: 'Grid Master with DNS+DHCP (not recommended)', notRecommended: true },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate (NIOS only, no DNS/DHCP)' },
    { value: 'GMC+DNS', label: 'GMC+DNS', description: 'GMC with DNS (not recommended)', notRecommended: true },
    { value: 'GMC+DHCP', label: 'GMC+DHCP', description: 'GMC with DHCP (not recommended)', notRecommended: true },
    { value: 'GMC+DNS/DHCP', label: 'GMC+DNS/DHCP', description: 'GMC with DNS+DHCP (not recommended)', notRecommended: true },
    { value: 'DNS', label: 'DNS', description: 'DNS Only' },
    { value: 'DHCP', label: 'DHCP', description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
  ],
};

// Additional services (multi-select) - can be co-located on same host
export const ADDITIONAL_SERVICES = [
  { value: 'NTP', label: 'NTP', description: 'Network Time Protocol', impact: 0 },
  { value: 'DFP', label: 'DFP', description: 'DNS Firewall Policy', impact: 5 },
  { value: 'TFTP', label: 'TFTP', description: 'Trivial File Transfer', impact: 2 },
  { value: 'FTP', label: 'FTP', description: 'File Transfer Protocol', impact: 2 },
  { value: 'HTTP', label: 'HTTP', description: 'HTTP File Distribution', impact: 3 },
];
