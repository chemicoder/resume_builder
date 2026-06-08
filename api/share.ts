import { randomBytes } from 'node:crypto';
import LZString from 'lz-string';

export const config = {
  runtime: 'nodejs',
};

const shareTables = ['rb_shared_resumes', 'shared_resumes'];

// Cap the stored resume payload. A resume with an embedded base64 profile
// photo is realistically well under this; anything larger is almost certainly
// abuse (using the share table as free storage) and is rejected.
const MAX_RESUME_BYTES = 2 * 1024 * 1024; // 2 MB

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

function setCors(response: any) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createSlug() {
  return randomBytes(12).toString('base64url');
}

function publicShareUrl(request: any, slug: string) {
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/?share=${encodeURIComponent(slug)}`;
}

function legacyHashShareUrl(request: any, resumeData: unknown, template: string) {
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const payload = { data: resumeData, template };
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  return `${protocol}://${host}/#${compressed}`;
}

function readBody(request: any) {
  return new Promise<any>((resolve, reject) => {
    if (request.body) {
      resolve(typeof request.body === 'string' ? JSON.parse(request.body) : request.body);
      return;
    }

    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function supabaseRest(table: string, query = '', init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new Error('Supabase server environment variables are not configured.');
  }

  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.hint || response.statusText;
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }

  return body;
}

function isMissingTable(error: unknown) {
  const typed = error as { status?: number; code?: string; message?: string };
  return typed.status === 404 || typed.code === '42P01' || /schema cache|does not exist|not found/i.test(typed.message || '');
}

async function insertSharedResume(row: Record<string, unknown>) {
  let lastError: unknown;

  for (const table of shareTables) {
    try {
      const rows = await supabaseRest(table, '', {
        method: 'POST',
        body: JSON.stringify(row),
      });
      return { table, rows };
    } catch (error) {
      lastError = error;
      if (!isMissingTable(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No shared resume table exists.');
}

async function findSharedResume(slug: string) {
  let lastError: unknown;

  for (const table of shareTables) {
    try {
      const rows = await supabaseRest(
        table,
        `?slug=eq.${encodeURIComponent(slug)}&select=id,slug,template,resume_data,views`,
        { method: 'GET' },
      );
      return { table, row: rows?.[0] };
    } catch (error) {
      lastError = error;
      if (!isMissingTable(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No shared resume table exists.');
}

export default async function handler(request: any, response: any) {
  setCors(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (!getSupabaseConfig().url || !getSupabaseConfig().key) {
    response.status(503).json({ error: 'Sharing is not configured.' });
    return;
  }

  try {
    if (request.method === 'POST') {
      const body = await readBody(request);
      const resumeData = body.resumeData;
      const template = String(body.template || 'minimal').slice(0, 64);
      const visitorId = body.visitorId ? String(body.visitorId).slice(0, 128) : null;

      if (!resumeData || typeof resumeData !== 'object') {
        response.status(400).json({ error: 'Missing resume data.' });
        return;
      }

      // Reject oversized payloads so the share table can't be abused as
      // unbounded free storage.
      const serializedSize = Buffer.byteLength(JSON.stringify(resumeData), 'utf8');
      if (serializedSize > MAX_RESUME_BYTES) {
        response.status(413).json({ error: 'Resume is too large to share. Try removing or shrinking the profile photo.' });
        return;
      }

      const slug = createSlug();
      try {
        const { table, rows } = await insertSharedResume({
          slug,
          visitor_id: visitorId,
          template,
          resume_data: resumeData,
        });

        response.status(200).json({
          slug,
          url: publicShareUrl(request, slug),
          id: rows?.[0]?.id,
          table,
          mode: 'database',
        });
      } catch (error) {
        if (!isMissingTable(error)) {
          throw error;
        }

        response.status(200).json({
          slug: null,
          url: legacyHashShareUrl(request, resumeData, template),
          mode: 'legacy_hash',
          warning: 'Supabase share table is not installed yet.',
        });
      }
      return;
    }

    if (request.method === 'GET') {
      const slug = String(request.query?.slug || '').slice(0, 128);
      if (!slug) {
        response.status(400).json({ error: 'Missing share slug.' });
        return;
      }

      const { table, row } = await findSharedResume(slug);
      if (!row) {
        response.status(404).json({ error: 'Shared resume not found.' });
        return;
      }

      supabaseRest(table, `?slug=eq.${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          views: Number(row.views || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        }),
      }).catch((error) => console.warn('share view increment failed', error));

      response.status(200).json({
        slug: row.slug,
        template: row.template,
        data: row.resume_data,
      });
      return;
    }

    response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('share error', error);
    response.status(500).json({
      error: 'Failed to process shared resume.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
