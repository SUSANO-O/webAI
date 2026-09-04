import { NextRequest, NextResponse } from 'next/server';

const OMNI_API =
  process.env.OMNI_API_URL || process.env.NEXT_PUBLIC_OMNI_API_URL || 'http://127.0.0.1:4010';
const BRIDGE = process.env.OMNI_BRIDGE_SECRET || 'omni-bridge-dev';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name || email.split('@')[0] || 'WebAI';
    if (!email) {
      return NextResponse.json({ ok: false, error: 'email requerido' }, { status: 400 });
    }

    const res = await fetch(`${OMNI_API}/api/auth/ensure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Omni-Bridge': BRIDGE,
      },
      body: JSON.stringify({ email, name, source: 'webai' }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || `Omni HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error bridge Omni';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
