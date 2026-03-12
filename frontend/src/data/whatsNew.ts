export interface WhatsNewEntry {
  date: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement';
}

// Newest first
export const whatsNewEntries: WhatsNewEntry[] = [
  {
    date: 'Mar 12, 2025',
    title: 'Sizing Comparison Pop-out Overhaul',
    description: '• Changed from a 3-column layout to a much cleaner vertically stacked layout (Size Down, Selected, Size Up)\n• Added exact Max Users calculation supported by the Target Limit for each individual metric\n• Sizing math formulas now explicitly label which performance feature caused a penalty (e.g. "× 0.8 (DNSSEC)")\n• Selected model progress bars explicitly label "Current Demand", "Target Limit", and "Max Rated" values\n• Fixed floating point precision bugs in the math formulas\n• Automatically clears incompatible add-ons/services when changing a site\'s role (e.g. removes RPZ if DNS is toggled off)',
    category: 'improvement',
  },
  {
    date: 'Mar 11, 2025',
    title: 'Auto/Manual Sort Toggle & Unit Numbering',
    description: '• Auto/Manual sort mode toggle for sizing table with visual indicator\n• Auto mode: ensures contiguous numbering (1,2,3...) within each unit group\n• Automatic renumbering after drag/delete operations\n• Manual mode: preserves custom order and allows gaps\n• Improved unit number input field (select-all on focus, type-to-replace)\n• Manual number editing triggers automatic row reordering\n• Retroactive fix applied to all existing drawings',
    category: 'feature',
  },
  {
    date: 'Mar 10, 2025',
    title: 'What\'s New Page',
    description: 'Added a global What\'s New section to track recent updates and changes.',
    category: 'feature',
  },
  {
    date: 'Mar 9, 2025',
    title: 'System Fonts',
    description: 'Reverted to system default fonts for a cleaner, faster-loading UI.',
    category: 'improvement',
  },
  {
    date: 'Mar 9, 2025',
    title: 'Gemini Health Check',
    description: 'Added /api/ai-health endpoint and detailed logging for diagnosing AI connectivity issues.',
    category: 'feature',
  },
  {
    date: 'Mar 9, 2025',
    title: 'NIOS-X HA Disabled',
    description: 'HA toggle now shows N/A for all NIOS-X platform types (NXVS, NX-P, NXaaS) since NIOS-X does not support traditional HA.',
    category: 'fix',
  },
  {
    date: 'Mar 8, 2025',
    title: 'Single-Service Architecture',
    description: 'Migrated to a single-service deployment where FastAPI serves both the API and the React frontend. No more separate public backend URL.',
    category: 'improvement',
  },
  {
    date: 'Mar 8, 2025',
    title: 'Staging Environment',
    description: 'Added a dedicated staging environment with its own database and Render service for testing changes before production.',
    category: 'feature',
  },
];
