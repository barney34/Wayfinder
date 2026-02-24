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

// Platform options per mode - Physical/Virtual for both NIOS and NIOS-X
export const PLATFORM_OPTIONS_BY_MODE = {
  NIOS: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
  ],
  UDDI: [
    { value: 'NX-P', label: 'NIOS-X Physical' },
    { value: 'NXVS', label: 'NIOS-X Virtual' },
    { value: 'NXaaS', label: 'NXaaS' },
  ],
  Hybrid: [
    { value: 'NIOS', label: 'NIOS Physical' },
    { value: 'NIOS-V', label: 'NIOS Virtual' },
    { value: 'NX-P', label: 'NIOS-X Physical' },
    { value: 'NXVS', label: 'NIOS-X Virtual' },
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

// Default models by role
export const DEFAULT_MODEL_BY_ROLE = {
  'Reporting': 'TE-5005', // Reporting Server default
};

// HW Add-ons (only for physical platforms)
// PSU = 1506 series only (AC/DC). SFP options handled separately via SFP_OPTIONS for 10GE SKUs.
export const HW_ADDONS = [
  { 
    value: 'PSU', 
    label: 'T-PSU600', // Dynamic suffix -AC/-DC applied in UI based on selected hardware SKU
    description: 'Second Power Supply Unit',
    allowedModels: ['TE-1506', 'TE-1506-HW-AC', 'TE-1506-HW-DC', 'TE-1506-10GE-HW-AC', 'TE-1506-10GE-HW-DC'],
    hasQuantity: false,
  },
];

// SFP Interface options — each requires a per-server quantity
export const SFP_OPTIONS = [
  { value: 'IB-SFPPLUS-LR', label: 'IB-SFPPLUS-LR', description: 'SFP+ Long Range 10GE' },
  { value: 'IB-SFPPLUS-SR', label: 'IB-SFPPLUS-SR', description: 'SFP+ Short Range 10GE' },
  { value: 'IB-SFP-SX',     label: 'IB-SFP-SX',     description: 'SFP Short Range 1GE' },
  { value: 'IB-SFP-CO',     label: 'IB-SFP-CO',     description: 'SFP Copper 1GE' },
];

// Helper: Check if platform is physical (has hardware)
export function isPlatformPhysical(platform) {
  return platform === 'NIOS' || platform === 'NX-P';
}

// Helper to get available SW Add-ons for a given role and platform
export function getAvailableSwAddons(role, platform) {
  const isPhysical = isPlatformPhysical(platform);
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
  if (!isPlatformPhysical(platform)) return [];
  
  return HW_ADDONS.filter(addon => {
    if (!addon.allowedModels) return true;
    // Match against model prefix (e.g., "TE-1506" matches "TE-1506-HW-AC")
    return addon.allowedModels.some(allowed => 
      allowed === model || allowed.startsWith(model + '-') || model?.startsWith(allowed.split('-HW')[0])
    );
  });
}
