// Editor autosave. The resume in progress lives in React state, so a refresh
// would otherwise wipe it. We persist a single draft (data + template) to
// localStorage, debounced, and restore it on next load. This is intentionally
// local-only — no server, no account sync — so it works offline and never
// blocks editing.

import { ResumeData } from '../types';

const DRAFT_KEY = 'resume_builder_draft_v1';

export interface SavedDraft {
  data: ResumeData;
  template: string;
  savedAt: number;
}

export function loadDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** Persist the draft, debounced so rapid edits don't thrash localStorage. */
export function saveDraftDebounced(data: ResumeData, template: string, delay = 600) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      const payload: SavedDraft = { data, template, savedAt: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // localStorage can be full or blocked (private mode) — autosave is a
      // best-effort convenience, never a hard requirement.
    }
  }, delay);
}

export function clearDraft() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
