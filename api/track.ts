import { allowCors, getClientIp, getRequestBody, isSupabaseConfigured, supabaseRest } from './_supabase';

const allowedEvents = new Set([
  'page_view',
  'shared_open',
  'share_created',
  'export_pdf',
  'export_docx',
  'template_change',
  'ai_summary',
  'ai_project',
  'ai_tailor',
  'ai_import',
]);

export default async function handler(request: any, response: any) {
  allowCors(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isSupabaseConfigured()) {
    response.status(503).json({ error: 'Analytics is not configured.' });
    return;
  }

  try {
    const body = await getRequestBody(request);
    const eventType = String(body.eventType || '');
    const visitorId = String(body.visitorId || '');
    const sessionId = String(body.sessionId || '');

    if (!allowedEvents.has(eventType) || !visitorId || !sessionId) {
      response.status(400).json({ error: 'Invalid analytics event.' });
      return;
    }

    // Cap visitor/session ids and metadata so the events table can't be used
    // to store arbitrary large blobs.
    if (visitorId.length > 128 || sessionId.length > 128) {
      response.status(400).json({ error: 'Invalid analytics event.' });
      return;
    }
    let metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    if (Buffer.byteLength(JSON.stringify(metadata), 'utf8') > 4096) {
      metadata = {};
    }

    const now = new Date().toISOString();
    const userAgent = String(request.headers['user-agent'] || '').slice(0, 512);
    const ip = getClientIp(request);

    await supabaseRest('rb_visitors?on_conflict=visitor_id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        visitor_id: visitorId,
        first_seen_at: now,
        last_seen_at: now,
        user_agent: userAgent,
      }),
    });

    await supabaseRest('rb_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        visitor_id: visitorId,
        session_id: sessionId,
        event_type: eventType,
        path: String(body.path || '').slice(0, 1024),
        referrer: String(body.referrer || '').slice(0, 1024),
        template: body.template ? String(body.template).slice(0, 64) : null,
        metadata,
        ip_address: ip,
        user_agent: userAgent,
      }),
    });

    response.status(204).end();
  } catch (error) {
    console.error('track error', error);
    response.status(500).json({ error: 'Failed to record analytics event.' });
  }
}
