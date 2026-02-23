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
    { value: 'Reporting', label: 'Reporting', description: 'Reporting Server (RPT)' },
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
    { value: 'Reporting', label: 'Reporting', description: 'Reporting Server (RPT)' },
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

// SW Add-ons for NIOS (conditional based on role/platform)
// CNA = GM/GMC only, ADNS = NOT GM/GMC, SECECO = GM only, FIPS = Physical only
// TA = Any member but GM/GMC, RPT = Reporting role with qty options
export const SW_ADDONS = [
  { 
    value: 'CNA', 
    label: 'CNA', 
    description: 'Cloud Network Automation',
    allowedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null, // Any NIOS platform
  },
  { 
    value: 'ADNS', 
    label: 'ADNS', 
    description: 'Advanced DNS',
    excludedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null,
  },
  { 
    value: 'DCA', 
    label: 'DCA', 
    description: 'DNS Cache Acceleration',
    excludedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null,
  },
  { 
    value: 'SECECO', 
    label: 'SECECO', 
    description: 'Security Ecosystem',
    allowedRoles: ['GM'],
    platformRestriction: null,
  },
  { 
    value: 'FIPS', 
    label: 'FIPS', 
    description: 'FIPS Compliance Mode',
    allowedRoles: null, // Any role
    platformRestriction: 'physical', // Only physical platforms
  },
  { 
    value: 'TA', 
    label: 'TA', 
    description: 'Threat Analytics',
    excludedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null,
  },
];

// RPT (Reporting) options - only for Reporting role, with GB quantities
export const RPT_QUANTITIES = [
  { value: '1GB', label: '1 GB' },
  { value: '2GB', label: '2 GB' },
  { value: '5GB', label: '5 GB' },
  { value: '10GB', label: '10 GB' },
  { value: '20GB', label: '20 GB' },
  { value: '50GB', label: '50 GB' },
  { value: '100GB', label: '100 GB' },
];

// HW Add-ons (only for physical platforms)
// PSU = Only for TE-1516, SFP = Model-dependent
export const HW_ADDONS = [
  { 
    value: 'PSU', 
    label: '2nd PSU', 
    description: 'Second Power Supply Unit',
    allowedModels: ['TE-1516', 'TE-1525', 'TE-1526'], // Models that support 2nd PSU
  },
  { 
    value: 'SFP', 
    label: 'SFP', 
    description: 'SFP Module',
    allowedModels: ['TE-1516', 'TE-1525', 'TE-1526', 'TE-2225', 'TE-2226'],
  },
];

// Helper to get available SW Add-ons for a given role and platform
export function getAvailableSwAddons(role, platform) {
  const isPhysical = platform === 'NIOS' || platform?.includes('Physical');
  const isGmOrGmc = role?.startsWith('GM');
  
  return SW_ADDONS.filter(addon => {
    // Check role restrictions
    if (addon.allowedRoles && !addon.allowedRoles.includes(role)) return false;
    if (addon.excludedRoles && addon.excludedRoles.includes(role)) return false;
    
    // Check platform restrictions
    if (addon.platformRestriction === 'physical' && !isPhysical) return false;
    
    return true;
  });
}

// Helper to get available HW Add-ons for a given model
export function getAvailableHwAddons(model, platform) {
  const isPhysical = platform === 'NIOS' || platform?.includes('Physical');
  if (!isPhysical) return [];
  
  return HW_ADDONS.filter(addon => {
    if (addon.allowedModels && !addon.allowedModels.includes(model)) return false;
    return true;
  });
}
