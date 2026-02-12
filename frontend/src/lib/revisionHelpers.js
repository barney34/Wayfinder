/**
 * Revision Storage Helpers
 * localStorage-based revision management for discovery data
 */

// Format revision date
export function formatRevisionDate(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

// Get revision storage from localStorage
export function getRevisionStorage(customerId) {
  try {
    const stored = localStorage.getItem(`discovery-${customerId}-revisions`);
    if (!stored) return { dynamic: [], personal: [] };
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return { dynamic: parsed.map(r => ({ ...r, name: r.name || `Save ${formatRevisionDate(new Date(r.exportedAt))}` })), personal: [] };
    return parsed;
  } catch { return { dynamic: [], personal: [] }; }
}

// Save revision storage to localStorage
export function saveRevisionStorage(customerId, storage) {
  localStorage.setItem(`discovery-${customerId}-revisions`, JSON.stringify(storage));
}

// Add a dynamic (auto-save) revision
export function addDynamicRevision(customerId, revision) {
  const storage = getRevisionStorage(customerId);
  storage.dynamic.unshift({ ...revision, id: crypto.randomUUID() });
  storage.dynamic = storage.dynamic.slice(0, 10);
  saveRevisionStorage(customerId, storage);
}

// Promote an auto-save to a named personal revision
export function promoteToPersonal(customerId, revisionId, newName) {
  const storage = getRevisionStorage(customerId);
  const idx = storage.dynamic.findIndex(r => r.id === revisionId);
  if (idx === -1) return;
  storage.personal.unshift({ ...storage.dynamic[idx], id: crypto.randomUUID(), name: newName });
  storage.dynamic.splice(idx, 1);
  storage.personal = storage.personal.slice(0, 5);
  saveRevisionStorage(customerId, storage);
}

// Rename a personal revision
export function renamePersonalRevision(customerId, revisionId, newName) {
  const storage = getRevisionStorage(customerId);
  const idx = storage.personal.findIndex(r => r.id === revisionId);
  if (idx !== -1) { 
    storage.personal[idx].name = newName; 
    saveRevisionStorage(customerId, storage); 
  }
}
