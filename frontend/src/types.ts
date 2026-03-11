// ─── Core shared types for the Wayfinder frontend ────────────────────────────

// ── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  opportunity?: string;
  seName?: string;
  psar?: 'not-submitted' | 'submitted' | 'approved' | 'not-relevant';
  arb?: 'not-submitted' | 'submitted' | 'approved' | 'not-relevant';
  design?: 'not-started' | 'in-progress' | 'complete' | 'reviewed' | 'not-relevant';
  createdAt: string;
  updatedAt: string;
}

// ── Discovery answers / notes ────────────────────────────────────────────────
export type AnswerMap = Record<string, string>;
export type NoteMap = Record<string, string>;
export type ContextFieldMap = Record<string, string>;
export type EnabledSectionMap = Record<string, boolean>;
export type LeaseTimeUnitMap = Record<string, string>;

// ── Site & DataCenter ────────────────────────────────────────────────────────
export interface DataCenter {
  id: string;
  name: string;
  knowledgeWorkers?: number;
}

export interface Site {
  id: string;
  name: string;
  dataCenterId?: string;
  knowledgeWorkers?: number;
  role?: string;
  platform?: string;
  numIPs?: number;
  numIPsOverride?: boolean;
}

// ── Drawing / per-drawing config ─────────────────────────────────────────────
export interface DrawingConfig {
  featureNIOS?: boolean;
  featureUDDI?: boolean;
  featureSecurity?: boolean;
  platformMode?: PlatformMode;
  siteOverrides?: Record<string, SiteOverride>;
  siteOrder?: string[];
  sortMode?: 'auto' | 'manual';
  dhcpAssociations?: unknown[];
}

export interface SiteOverride {
  name?: string;
  role?: string;
  platform?: string;
  numIPs?: number;
  numIPsOverride?: boolean;
  dhcpPercent?: number;
  dhcpPartner?: string | null;
  serverCount?: number;
  haEnabled?: boolean;
  hwCount?: number;
  swAddons?: string[];
  hwAddons?: string[];
  sfpAddons?: Record<string, number>;
  perfFeatures?: string[];
  services?: string[];
  rptQuantity?: number | null;
  addToReport?: boolean;
  addToBom?: boolean;
  unitLetterOverride?: string | null;
  unitNumberOverride?: number;
  groupingMode?: 'individual' | 'grouped' | 'combined' | 'custom';
  customGroups?: unknown[];
  description?: string;
  modelOverride?: string | null;
  hardwareSku?: string;
  servers?: Record<number, Record<string, unknown>>;
}

export interface Drawing {
  id: string;
  name: string;
}

export type PlatformMode = 'NIOS' | 'UDDI' | 'Hybrid';

// ── Sizing summary (passed from TokenCalculatorSummary → Discovery QPS) ──────
export interface SizingSummary {
  totalTokens: number;
  totalIPs: number;
  partnerSku: string;
  siteCount?: number;
  infraTokens?: number;
  securityTokens?: number;
  uddiMgmtTokens?: number;
  tokenPack?: string | null;
  platformMode?: PlatformMode;
  dnsSiteCount?: number;
  externalDnsSiteCount?: number;
  totalObjects?: number;
}

// ── Discovery question definition ────────────────────────────────────────────
export interface Question {
  id: string;
  section: string;
  subsection?: string;
  group?: string;
  question: string;
  technicalOnly: boolean;
  fieldType?: string;
  options?: string[];
  allowFreeform?: boolean;
  defaultValue?: string;
  conditionalOn?: { questionId: string; value: string };
  hidden?: boolean;
  tooltip?: string;
  prefix?: string;
  valueDiscovery?: boolean;
  warningCondition?: { questionId: string; value: string; message: string };
}

// ── Revision (version history) ───────────────────────────────────────────────
export interface RevisionEntry {
  id: string;
  name: string;
  exportedAt: string;
  format: string;
  payload: string;
}

export interface RevisionStorage {
  customerId: string;
  dynamic: RevisionEntry[];
  personal: RevisionEntry[];
}

// ── UDS Member ───────────────────────────────────────────────────────────────
export interface UDSMember {
  id: string;
  name: string;
  role?: string;
  [key: string]: unknown;
}

// ── Context fields (meeting notes context) ───────────────────────────────────
export interface ContextFields {
  summary?: string;
  painPoints?: string;
  nextSteps?: string;
  [key: string]: string | undefined;
}

// ── Value Discovery Chat ─────────────────────────────────────────────────────
export type VFCategoryId = 'optimize' | 'accelerate' | 'protect';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  topic?: string;
}

export interface RequiredTopic {
  id: string;
  label: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
