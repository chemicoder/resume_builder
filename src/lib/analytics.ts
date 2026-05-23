import { ResumeData } from '../types';

const visitorKey = 'resume_builder_visitor_id';
const sessionKey = 'resume_builder_session_id';

export type AnalyticsEvent =
  | 'page_view'
  | 'shared_open'
  | 'share_created'
  | 'export_pdf'
  | 'export_docx'
  | 'template_change'
  | 'ai_summary'
  | 'ai_project'
  | 'ai_tailor'
  | 'ai_import';

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getVisitorId() {
  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = createId();
    localStorage.setItem(visitorKey, visitorId);
  }
  return visitorId;
}

function getSessionId() {
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = createId();
    sessionStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
}

export function trackEvent(eventType: AnalyticsEvent, options: { template?: string; metadata?: Record<string, unknown> } = {}) {
  try {
    const payload = {
      eventType,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      path: window.location.pathname + window.location.search,
      referrer: document.referrer,
      template: options.template,
      metadata: options.metadata || {},
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics should never block the resume builder.
  }
}

export async function createSharedResume(data: ResumeData, template: string) {
  const response = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeData: data,
      template,
      visitorId: getVisitorId(),
    }),
  });

  if (!response.ok) {
    throw new Error('Could not create a server share link.');
  }

  return response.json() as Promise<{ slug: string | null; url: string; id?: string; mode?: string; warning?: string }>;
}

export async function loadSharedResume(slug: string) {
  const response = await fetch(`/api/share?slug=${encodeURIComponent(slug)}`);

  if (!response.ok) {
    throw new Error('Shared resume was not found.');
  }

  return response.json() as Promise<{ slug: string; template: string; data: Partial<ResumeData> }>;
}
