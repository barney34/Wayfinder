/**
 * Revision API Helpers
 * MongoDB-backed revision management via REST API
 */

import { apiRequest } from "./queryClient";
import type { RevisionEntry, RevisionStorage } from "@/types";

export function formatRevisionDate(date: Date = new Date()): string {
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export async function getRevisionStorage(customerId: string): Promise<RevisionStorage> {
  const res = await apiRequest('GET', `/api/customers/${customerId}/revisions`);
  return res.json();
}

export async function addDynamicRevision(customerId: string, revision: Omit<RevisionEntry, 'id'>): Promise<RevisionEntry> {
  const res = await apiRequest('POST', `/api/customers/${customerId}/revisions`, {
    name: revision.name,
    exportedAt: revision.exportedAt,
    format: revision.format || 'save',
    payload: revision.payload,
  });
  return res.json();
}

export async function promoteToPersonal(customerId: string, revisionId: string, newName: string): Promise<RevisionEntry> {
  const res = await apiRequest('PUT', `/api/customers/${customerId}/revisions/${revisionId}/promote`, { name: newName });
  return res.json();
}

export async function renamePersonalRevision(customerId: string, revisionId: string, newName: string): Promise<RevisionEntry> {
  const res = await apiRequest('PUT', `/api/customers/${customerId}/revisions/${revisionId}/rename`, { name: newName });
  return res.json();
}

export async function deleteRevision(customerId: string, revisionId: string): Promise<{ ok: boolean }> {
  const res = await apiRequest('DELETE', `/api/customers/${customerId}/revisions/${revisionId}`);
  return res.json();
}
