/**
 * Platform Configuration Constants for Token Calculator
 * Extracted from TokenCalculatorSummary.jsx for better organization
 */

export interface PlatformMode {
  value: string;
  label: string;
  description: string;
}

export interface PlatformOption {
  value: string;
  label: string;
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
  group?: string;
  notRecommended?: boolean;
}

export interface AdditionalService {
  value: string;
  label: string;
  description: string;
  impact: number;
  niosOnly?: boolean;
  warning?: string;
  maxCount?: number;         // warn if more than this many DNS-role members use this service
  affectsGmGmc?: boolean;   // impact also applies to GM/GMC in the grid
  excludePlatforms?: string[]; // hide this service when site.platform matches
}

export interface SwAddon {
  value: string;
  label: string;
  description: string;
  allowedRoles?: string[];
  excludedRoles?: string[];
  platformRestriction?: string | null;
}

export interface RptQuantity {
  value: string;
  label: string;
}

export interface HwAddon {
  value: string;
  label: string;
  description: string;
  allowedModels?: string[];
  hasQuantity?: boolean;
}

export interface SfpOption {
  value: string;
  label: string;
  description: string;
}

export interface PerformanceFeature {
  value: string;
  label: string;
  description: string;
  impactPercent: number;
  impactType: 'qps' | 'lps';
  allowedRoles?: string[];
  warning?: string | null;
  autoApply?: boolean;
}

export interface PerfImpactResult {
  qpsMultiplier: number;
  lpsMultiplier: number;
}

// Global platform modes
export const PLATFORM_MODES: PlatformMode[] = [
  { value: 'NIOS', label: 'NIOS', description: 'Traditional on-prem (Physical/Virtual)' },
  { value: 'UDDI', label: 'UDDI', description: 'Cloud-native NIOS-X' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Mix of NIOS + UDDI' },
];

// Platform options per mode - Physical/Virtual for both NIOS and NIOS-X
export const PLATFORM_OPTIONS_BY_MODE: Record<string, PlatformOption[]> = {
  NIOS: [
    { value: 'NIOS',   label: 'Physical' },
    { value: 'NIOS-V', label: 'Virtual' },
  ],
  UDDI: [
    { value: 'NX-P',   label: 'NX Physical' },
    { value: 'NXVS',   label: 'NX Virtual' },
    { value: 'NXaaS',  label: 'NXaaS' },
  ],
  Hybrid: [
    { value: 'NIOS',   label: 'Physical' },
    { value: 'NIOS-V', label: 'Virtual' },
    { value: 'NX-P',   label: 'NX Physical' },
    { value: 'NXVS',   label: 'NX Virtual' },
    { value: 'NXaaS',  label: 'NXaaS' },
  ],
};

// Role options by platform mode
// GM/GMC are separated into their own group — only the dedicated Grid Manager rows use these
export const ROLE_OPTIONS_BY_MODE: Record<string, RoleOption[]> = {
  NIOS: [
    // ── Member roles (most rows) ─────────────────────────
    { value: 'DNS',      label: 'DNS',      description: 'Internal DNS' },
    { value: 'DHCP',     label: 'DHCP',     description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
    { value: 'ND',       label: 'ND',       description: 'Network Discovery Appliance' },
    { value: 'Reporting',label: 'Reporting',description: 'Reporting Server (RPT)' },
    { value: 'LIC',      label: 'LIC',      description: 'License-only line item' },
    { value: 'CDC',      label: 'CDC',      description: 'Cloud Data Connector' },
    // ── Grid Manager roles (dedicated GM/GMC servers only) ─
    { value: 'GM',  label: 'GM',  description: 'Grid Master (no DNS/DHCP)', group: 'Grid Manager' },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate',     group: 'Grid Manager' },
    { value: 'GM+DNS',      label: 'GM+DNS',      description: 'GM with DNS (not recommended)',      notRecommended: true, group: 'Grid Manager' },
    { value: 'GM+DHCP',     label: 'GM+DHCP',     description: 'GM with DHCP (not recommended)',     notRecommended: true, group: 'Grid Manager' },
    { value: 'GM+DNS/DHCP', label: 'GM+DNS/DHCP', description: 'GM with DNS+DHCP (not recommended)', notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DNS',      label: 'GMC+DNS',      description: 'GMC with DNS (not recommended)',      notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DHCP',     label: 'GMC+DHCP',     description: 'GMC with DHCP (not recommended)',     notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DNS/DHCP', label: 'GMC+DNS/DHCP', description: 'GMC with DNS+DHCP (not recommended)', notRecommended: true, group: 'Grid Manager' },
  ],
  UDDI: [
    { value: 'DNS',      label: 'DNS',      description: 'DNS Only' },
    { value: 'DHCP',     label: 'DHCP',     description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
    { value: 'ND-X',     label: 'ND-X',     description: 'NIOS-X Network Discovery' },
    { value: 'CDC',      label: 'CDC',      description: 'Cloud Data Connector' },
  ],
  Hybrid: [
    { value: 'DNS',      label: 'DNS',      description: 'Internal DNS' },
    { value: 'DHCP',     label: 'DHCP',     description: 'DHCP Only' },
    { value: 'DNS/DHCP', label: 'DNS/DHCP', description: 'DNS + DHCP' },
    { value: 'ND',       label: 'ND',       description: 'Network Discovery Appliance' },
    { value: 'ND-X',     label: 'ND-X',     description: 'NIOS-X Network Discovery' },
    { value: 'Reporting',label: 'Reporting',description: 'Reporting Server (RPT)' },
    { value: 'LIC',      label: 'LIC',      description: 'License-only line item' },
    { value: 'CDC',      label: 'CDC',      description: 'Cloud Data Connector' },
    { value: 'GM',  label: 'GM',  description: 'Grid Master (NIOS only)',       group: 'Grid Manager' },
    { value: 'GMC', label: 'GMC', description: 'Grid Master Candidate (NIOS)', group: 'Grid Manager' },
    { value: 'GM+DNS',      label: 'GM+DNS',      description: 'GM with DNS (not recommended)',      notRecommended: true, group: 'Grid Manager' },
    { value: 'GM+DHCP',     label: 'GM+DHCP',     description: 'GM with DHCP (not recommended)',     notRecommended: true, group: 'Grid Manager' },
    { value: 'GM+DNS/DHCP', label: 'GM+DNS/DHCP', description: 'GM with DNS+DHCP (not recommended)', notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DNS',      label: 'GMC+DNS',      description: 'GMC with DNS (not recommended)',      notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DHCP',     label: 'GMC+DHCP',     description: 'GMC with DHCP (not recommended)',     notRecommended: true, group: 'Grid Manager' },
    { value: 'GMC+DNS/DHCP', label: 'GMC+DNS/DHCP', description: 'GMC with DNS+DHCP (not recommended)', notRecommended: true, group: 'Grid Manager' },
  ],
};

// Additional services (multi-select) - can be co-located on same host
export const ADDITIONAL_SERVICES: AdditionalService[] = [
  { value: 'NTP',         label: 'NTP',         description: 'Network Time Protocol',      impact: 0 },
  { value: 'DFP',         label: 'DFP',         description: 'DNS Firewall Policy',        impact: 5 },
  { value: 'TFTP',        label: 'TFTP',        description: 'Trivial File Transfer',      impact: 2 },
  { value: 'FTP',         label: 'FTP',         description: 'File Transfer Protocol',     impact: 2 },
  { value: 'HTTP',        label: 'HTTP',        description: 'HTTP File Distribution',     impact: 3 },
  {
    value: 'MULTI-MASTER',
    label: 'Multi-Master',
    description: 'Multi-Master DNS replication (+10% CPU on member and GM/GMC)',
    impact: 10,
    niosOnly: true,
    affectsGmGmc: true,
    maxCount: 5,
    excludePlatforms: ['NX-P', 'NXVS', 'NXaaS'],
    warning: 'Against Best Practice — Multi-Master DNS should not exceed 5 members.',
  },
  {
    value: 'DDNS',
    label: 'DDNS',
    description: 'Dynamic DNS updates (+10% CPU)',
    impact: 10,
    niosOnly: true,
    warning: 'Recursive Queries Interrupted While Processing DDNS — Possible Add Dedicated HA Pair Per Area.',
  },
];

// SW Add-ons for NIOS (conditional based on role/platform)
// CNA = GM/GMC only, ADNS = NOT GM/GMC, SECECO = GM only, FIPS = Physical only
// MS = all NIOS roles (GM, GMC, DNS, DHCP, DNS/DHCP), SKU=DDIMSGD
export const SW_ADDONS: SwAddon[] = [
  { 
    value: 'CNA', 
    label: 'CNA', 
    description: 'Cloud Network Automation',
    allowedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null,
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
    allowedRoles: null,
    platformRestriction: 'physical',
  },
  { 
    value: 'TA', 
    label: 'TA', 
    description: 'Threat Analytics',
    excludedRoles: ['GM', 'GMC', 'GM+DNS', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    platformRestriction: null,
  },
  {
    value: 'DDIMSGD',
    label: 'MS',
    description: 'Microsoft Sync',
    allowedRoles: null,   // all NIOS roles: GM, GMC, DNS, DHCP, DNS/DHCP
    platformRestriction: null,
  },
];

// RPT Reporting storage — ACTIVATION sizes
export const RPT_QUANTITIES: RptQuantity[] = [
  { value: '500MB',  label: '500 MB' },
  { value: '1GB',    label: '1 GB' },
  { value: '2GB',    label: '2 GB' },
  { value: '5GB',    label: '5 GB' },
  { value: '10GB',   label: '10 GB' },
  { value: '20GB',   label: '20 GB' },
  { value: '50GB',   label: '50 GB' },
  { value: '100GB',  label: '100 GB' },
  { value: '200GB',  label: '200 GB' },
  { value: '500GB',  label: '500 GB' },
];

// Default models by role
export const DEFAULT_MODEL_BY_ROLE: Record<string, string> = {
  'Reporting': 'TR-5005',   // Reporting Server default — virtual
  'ND':        'ND-906',    // Network Discovery default — smallest appliance
};

// HW Add-ons (only for physical platforms)
// PSU = TE-1506 series only (AC/DC). SFP options handled separately via SFP_OPTIONS for 10GE SKUs.
export const HW_ADDONS: HwAddon[] = [
  { 
    value: 'PSU', 
    label: 'T-PSU600',
    description: 'Second Power Supply Unit',
    allowedModels: ['TE-1506', 'TE-1506-HW-AC', 'TE-1506-HW-DC', 'TE-1506-10GE-HW-AC', 'TE-1506-10GE-HW-DC'],
    hasQuantity: false,
  },
];

// SFP Interface options — each requires a per-server quantity
export const SFP_OPTIONS: SfpOption[] = [
  { value: 'IB-SFPPLUS-LR', label: 'IB-SFPPLUS-LR', description: 'SFP+ Long Range 10GE' },
  { value: 'IB-SFPPLUS-SR', label: 'IB-SFPPLUS-SR', description: 'SFP+ Short Range 10GE' },
  { value: 'IB-SFP-SX',     label: 'IB-SFP-SX',     description: 'SFP Short Range 1GE' },
  { value: 'IB-SFP-CO',     label: 'IB-SFP-CO',     description: 'SFP Copper 1GE' },
];

// Performance Features — high-impact features affecting server capacity (model sizing)
// These are distinct from ADDITIONAL_SERVICES (low-impact co-located services)
// Impact percentages reduce effective server QPS/LPS
export const PERFORMANCE_FEATURES: PerformanceFeature[] = [
  // ── DNS QPS Features ──────────────────────────────────
  {
    value: 'DTC',
    label: 'DNS Traffic Control',
    description: 'DNS Traffic Control (−25% QPS)',
    impactPercent: 25,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'SYSLOG',
    label: 'Forward to Syslog',
    description: 'Forward to Syslog (−50% QPS)',
    impactPercent: 50,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: '⚠️ Syslog logging reduces DNS capacity by 50%. Consider Data Connector instead.',
  },
  {
    value: 'QR',
    label: 'Query or Response Capture',
    description: 'Query or Response Capture (−40% QPS)',
    impactPercent: 40,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'QR2',
    label: 'Query and Response Capture',
    description: 'Query and Response Capture (−10% QPS)',
    impactPercent: 10,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'DNS-DC',
    label: 'DNS Reporting',
    description: 'DNS Reporting / Data Connector (−15% QPS)',
    impactPercent: 15,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'RPZ',
    label: 'RPZ',
    description: 'DNS Firewall / RPZ (−15% QPS)',
    impactPercent: 15,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'NSIP',
    label: 'RPZ NSDNAME/NSIP',
    description: 'RPZ NSDNAME/NSIP (−30% QPS)',
    impactPercent: 30,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'ADP',
    label: 'Advanced DNS Protection',
    description: 'Advanced DNS Protection (−20% QPS)',
    impactPercent: 20,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'TI',
    label: 'RPZ Threat Insight',
    description: 'RPZ Threat Insight (−30% QPS)',
    impactPercent: 30,
    impactType: 'qps',
    allowedRoles: ['DNS', 'DNS/DHCP', 'GM+DNS', 'GM+DNS/DHCP', 'GMC+DNS', 'GMC+DNS/DHCP'],
    warning: null,
  },
  // ── DHCP LPS Features ─────────────────────────────────
  {
    value: 'DHCP-FO',
    label: 'DHCP FO',
    description: 'DHCP Failover (−50% LPS)',
    impactPercent: 50,
    impactType: 'lps',
    allowedRoles: ['DHCP', 'DNS/DHCP', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    warning: null,
    autoApply: true,   // Auto-applied when DHCP partner is selected
  },
  {
    value: 'DDNS',
    label: 'DDNS',
    description: 'Dynamic DNS Updates (−20% LPS)',
    impactPercent: 20,
    impactType: 'lps',
    allowedRoles: ['DHCP', 'DNS/DHCP', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'DHCP-FP',
    label: 'Fingerprinting',
    description: 'DHCP Fingerprinting (−10% LPS)',
    impactPercent: 10,
    impactType: 'lps',
    allowedRoles: ['DHCP', 'DNS/DHCP', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    warning: null,
  },
  {
    value: 'DHCP-DC',
    label: 'DHCP Rpt',
    description: 'DHCP Reporting / Data Connector (−15% LPS)',
    impactPercent: 15,
    impactType: 'lps',
    allowedRoles: ['DHCP', 'DNS/DHCP', 'GM+DHCP', 'GM+DNS/DHCP', 'GMC+DHCP', 'GMC+DNS/DHCP'],
    warning: null,
  },
];

// Helper: Get available Performance Features for a role (manual toggles only, excludes autoApply)
export function getAvailablePerfFeatures(role: string): PerformanceFeature[] {
  if (!role) return [];
  return PERFORMANCE_FEATURES.filter(f => {
    if (f.autoApply) return false; // autoApply features are not manual toggles
    if (!f.allowedRoles) return true;
    return f.allowedRoles.includes(role);
  });
}

// Helper: Calculate the net performance multiplier from enabled perf features
// Returns { qpsMultiplier, lpsMultiplier, appliedLabels }
// enabledFeatures: array of feature codes including auto-applied ones
export function calculatePerfImpact(enabledFeatures: string[] = [], role: string): PerfImpactResult & { appliedLabels: { type: 'qps' | 'lps', label: string, percent: number }[] } {
  // Check ALL features (including autoApply) — the caller is responsible for
  // injecting auto-applied feature codes (like DHCP-FO) into enabledFeatures
  const relevant = PERFORMANCE_FEATURES.filter(f => {
    if (!f.allowedRoles) return true;
    return f.allowedRoles.includes(role);
  });
  let qpsMult = 1.0;
  let lpsMult = 1.0;
  const appliedLabels: { type: 'qps' | 'lps', label: string, percent: number }[] = [];

  for (const feat of relevant) {
    if (enabledFeatures.includes(feat.value)) {
      if (feat.impactType === 'qps') {
        qpsMult *= (1 - feat.impactPercent / 100);
        appliedLabels.push({ type: 'qps', label: feat.label, percent: feat.impactPercent });
      } else if (feat.impactType === 'lps') {
        lpsMult *= (1 - feat.impactPercent / 100);
        appliedLabels.push({ type: 'lps', label: feat.label, percent: feat.impactPercent });
      }
    }
  }

  return { qpsMultiplier: qpsMult, lpsMultiplier: lpsMult, appliedLabels };
}

// Helper: Check if platform is physical (has hardware)
export function isPlatformPhysical(platform: string): boolean {
  return platform === 'NIOS' || platform === 'NX-P';
}

// Helper to get available SW Add-ons for a given role and platform
export function getAvailableSwAddons(role: string, platform: string): SwAddon[] {
  const isPhysical = isPlatformPhysical(platform);
  
  return SW_ADDONS.filter(addon => {
    if (addon.allowedRoles && !addon.allowedRoles.includes(role)) return false;
    if (addon.excludedRoles && addon.excludedRoles.includes(role)) return false;
    if (addon.platformRestriction === 'physical' && !isPhysical) return false;
    return true;
  });
}

// Helper to get available HW Add-ons for a given hardware SKU
export function getAvailableHwAddons(hardwareSku: string, platform: string): HwAddon[] {
  if (!isPlatformPhysical(platform)) return [];
  
  return HW_ADDONS.filter(addon => {
    if (!addon.allowedModels) return true;
    return addon.allowedModels.some(allowed => 
      allowed === hardwareSku ||
      allowed.startsWith(hardwareSku + '-') ||
      hardwareSku?.startsWith(allowed.split('-HW')[0])
    );
  });
}
