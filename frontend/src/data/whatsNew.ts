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
    title: 'Major Platform Updates & UX Overhaul',
    description: '• **Sizing Comparison Overhaul**: Complete redesign of the sizing comparison pop-out with a stacked vertical layout, clearer capacity math, and exact max user limits.\n• **Real-time Chat Mirroring**: The Value Discovery AI chat now syncs instantly across multiple users viewing the same project via WebSockets.\n• **Auto/Manual Row Numbering**: Added a toggle to switch between automatic contiguous unit numbering and custom manual ordering in the sizing table.\n• **Network Discovery Standardization**: Redesigned the Network Discovery sizing table columns to perfectly match the Sites and Data Centers layout.\n• **Smart Service Toggles**: Changing a site\'s role now automatically clears any incompatible add-ons or features (e.g., stripping RPZ when DNS is disabled).\n• **Single-Service Architecture**: Merged the React frontend and FastAPI backend into a unified deployment to eliminate CORS issues and improve speed.\n• **NIOS-X HA Safeguard**: Disabled the High Availability toggle for all NIOS-X platform types to accurately reflect product capabilities.\n• **Dedicated Staging Environment**: Deployed a separate staging URL and database to allow for safe testing of new features before production.\n• **Global Release Notes**: Added this dedicated What\'s New page to keep track of new features and fixes.\n• **System Fonts Optimization**: Reverted to system default fonts for improved UI load times and cleaner text rendering.',
    category: 'feature',
  }
];
