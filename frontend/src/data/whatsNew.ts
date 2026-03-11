export interface WhatsNewEntry {
  date: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement';
}

// Newest first
export const whatsNewEntries: WhatsNewEntry[] = [
  {
    date: 'Mar 11, 2025',
    title: 'Auto/Manual Sort Toggle & Unit Numbering',
    description: 'Added Auto/Manual sort mode toggle for the sizing table. Auto mode ensures contiguous numbering (1,2,3...) within each unit group with automatic renumbering after drag/delete operations. Manual mode preserves custom order and allows gaps. Improved unit number input field with select-all on focus and proper type-to-replace behavior. When editing a number in Auto mode, rows automatically reorder and renumber. All existing drawings retroactively fixed to show proper sequential numbering.',
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
