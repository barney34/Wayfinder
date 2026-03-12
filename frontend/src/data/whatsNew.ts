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
    title: 'Sizing UI & Performance Math Updates',
    description: '• Complete redesign of the Sizing Comparison pop-out using a stacked vertical layout\n• Added exact Max Users calculations derived from target capacity limits\n• Capacity math formulas now explicitly call out which performance feature triggered a penalty (e.g. "× 0.8 (DNSSEC)")\n• Selected model progress bars explicitly label Current Demand vs Target Limit vs Max Rated capacity\n• Fixed floating point precision bugs in the math formulas (no more long decimals)\n• Automatically clears incompatible add-ons/services when changing a site\'s role (e.g. strips RPZ if DNS is toggled off)',
    category: 'improvement',
  },
  {
    date: 'Mar 11, 2025',
    title: 'Network Discovery & Real-Time Sync',
    description: '• The AI Chat in Value Discovery now syncs instantly across multiple users viewing the same project via WebSockets\n• Added a toggle to switch between automatic contiguous unit numbering and custom manual ordering in the sizing table\n• Improved the unit number input field to select-all on focus so you can just type over it\n• Manual unit number editing now automatically triggers a row reorder\n• Standardized the Network Discovery sizing table columns to perfectly match the Sites and Data Centers layout',
    category: 'feature',
  },
  {
    date: 'Mar 10, 2025',
    title: 'Global Release Notes',
    description: '• Added this dedicated What\'s New page to track recent platform updates and changes\n• Retroactively applied automatic numbering fix to all existing project drawings',
    category: 'feature',
  },
  {
    date: 'Mar 9, 2025',
    title: 'UI Optimization & NIOS-X Fixes',
    description: '• Reverted to system default fonts for a cleaner, faster-loading UI\n• Disabled the High Availability toggle for all NIOS-X platform types (NXVS, NX-P, NXaaS) to accurately reflect product capabilities\n• Added detailed logging and a health check endpoint to diagnose Gemini AI connectivity issues',
    category: 'improvement',
  },
  {
    date: 'Mar 8, 2025',
    title: 'Architecture & Staging Environment',
    description: '• Migrated to a single-service architecture where FastAPI serves both the API and the React frontend, eliminating CORS issues\n• Deployed a dedicated staging environment with its own database for safely testing features before pushing to production',
    category: 'feature',
  }
];
