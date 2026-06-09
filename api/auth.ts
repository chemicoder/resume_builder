import { allowCors, getRequestBody } from './_supabase';

export const config = {
  runtime: 'nodejs',
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAlreadyRegistered(body: any, status: number) {
  const text = `${body?.message || ''} ${body?.error_description || ''} ${body?.msg || ''}`;
  return status === 400 || status === 409 || status === 422
    ? /already|registered|exists|duplicate/i.test(text)
    : false;
}

async function createConfirmedUser(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        source: 'resume_builder',
      },
    }),
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

  if (response.ok) {
    return { created: true };
  }

  if (isAlreadyRegistered(body, response.status)) {
    return { created: false };
  }

  const message = body?.message || body?.error_description || response.statusText;
  const error = new Error(message) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

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

  if (!supabaseUrl || !serviceRoleKey) {
    response.status(503).json({ error: 'Password signup is not configured on the server.' });
    return;
  }

  try {
    const body = await getRequestBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!EMAIL_RE.test(email) || email.length > 320) {
      response.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    if (password.length < 6 || password.length > 128) {
      response.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
      return;
    }

    const result = await createConfirmedUser(email, password);
    response.status(200).json(result);
  } catch (error) {
    console.error('auth signup error', error);
    response.status(500).json({ error: 'Could not create the account. Please try again.' });
  }
}
