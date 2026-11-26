// 휴대폰 본인 확인 (문자 인증번호) - 2026-11-26
// action: 'status' -> 문자 발송 준비 여부 / 'send' -> 인증번호 문자 보내기 / 'check' -> 번호 확인 후 profiles.phone, phone_verified_at 저장
// 문자 발송: 솔라피(SOLAPI) API. 비밀값 SOLAPI_KEY, SOLAPI_SECRET, SOLAPI_FROM(등록된 발신번호)은 함수 비밀값에만 둔다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (k: string) => Deno.env.get(k) || '';
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(s: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
const configured = () => !!(env('SOLAPI_KEY') && env('SOLAPI_SECRET') && env('SOLAPI_FROM'));
const fmt = (d: string) => d.length === 11 ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

async function sendSms(to: string, text: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, '');
  const sig = await hmac(env('SOLAPI_SECRET'), date + salt);
  const r = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `HMAC-SHA256 apiKey=${env('SOLAPI_KEY')}, date=${date}, salt=${salt}, signature=${sig}` },
    body: JSON.stringify({ message: { to, from: env('SOLAPI_FROM').replace(/\D/g, ''), text } }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, detail: r.ok ? '' : (j.errorMessage || j.errorCode || String(r.status)) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out({ error: 'method' }, 405);
  try {
    const body = await req.json();
    if (body.action === 'status') return out({ configured: configured() });

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: ud } = await admin.auth.getUser(token);
    const user = ud && ud.user;
    if (!user) return out({ error: 'login' }, 401);

    const digits = String(body.phone || '').replace(/\D/g, '');
    if (!/^01[016789]\d{7,8}$/.test(digits)) return out({ error: 'phone' }, 400);

    if (body.action === 'send') {
      if (!configured()) return out({ error: 'not_configured' }, 503);
      const since = new Date(Date.now() - 24 * 3600e3).toISOString();
      const { data: recent } = await admin.from('phone_otps').select('created_at').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false });
      if (recent && recent.length >= 5) return out({ error: 'too_many' }, 429);
      if (recent && recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60e3) return out({ error: 'wait' }, 429);
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
      await admin.from('phone_otps').insert({ user_id: user.id, phone: digits, code_hash: await sha256(code + ':' + user.id), expires_at: new Date(Date.now() + 5 * 60e3).toISOString() });
      const s = await sendSms(digits, `[파크골프세계] 인증번호 ${code} (5분 안에 입력해 주세요)`);
      if (!s.ok) return out({ error: 'sms', detail: s.detail }, 502);
      return out({ ok: true });
    }

    if (body.action === 'check') {
      const code = String(body.code || '').replace(/\D/g, '');
      const { data: rows } = await admin.from('phone_otps').select('id,phone,code_hash,expires_at,attempts').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      const o = rows && rows[0];
      if (!o || o.phone !== digits) return out({ error: 'no_code' }, 400);
      if (new Date(o.expires_at).getTime() < Date.now()) return out({ error: 'expired' }, 400);
      if (o.attempts >= 5) return out({ error: 'too_many' }, 429);
      if (o.code_hash !== await sha256(code + ':' + user.id)) {
        await admin.from('phone_otps').update({ attempts: o.attempts + 1 }).eq('id', o.id);
        return out({ error: 'wrong' }, 400);
      }
      const now = new Date().toISOString();
      const up = await admin.from('profiles').update({ phone: fmt(digits), phone_verified_at: now }).eq('id', user.id);
      if (up.error) return out({ error: 'save', detail: up.error.message }, 500);
      await admin.from('phone_otps').delete().eq('user_id', user.id);
      return out({ ok: true, phone: fmt(digits) });
    }
    return out({ error: 'action' }, 400);
  } catch (e) {
    return out({ error: 'server', detail: String(e) }, 500);
  }
});
