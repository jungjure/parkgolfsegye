// 카카오·네이버 간편 로그인 (2026-11-26)
// 브라우저가 받은 인가 코드(code)를 여기서 토큰으로 바꾸고, 회원 계정을 찾거나 새로 만든 뒤
// 한 번 쓰는 로그인 토큰(token_hash)을 돌려준다. 브라우저는 sb.auth.verifyOtp 로 로그인한다.
// 비밀값(KAKAO_REST_KEY, KAKAO_SECRET, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)은 Supabase 함수 비밀값에만 있다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const REDIRECTS = ['https://parkgolfsegye.co.kr/oauth.html', 'https://www.parkgolfsegye.co.kr/oauth.html'];
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (k: string) => Deno.env.get(k) || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out({ error: 'method' }, 405);
  try {
    const { provider, code, state, redirect_uri } = await req.json();
    if (!code || !REDIRECTS.includes(redirect_uri)) return out({ error: 'bad_request' }, 400);
    let pid = '', nick = '';
    if (provider === 'kakao') {
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: env('KAKAO_REST_KEY'), redirect_uri, code });
      if (env('KAKAO_SECRET')) body.set('client_secret', env('KAKAO_SECRET'));
      const t = await (await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body })).json();
      if (!t.access_token) return out({ error: 'kakao_token', detail: t.error_description || t.error || '' }, 400);
      const u = await (await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
      pid = u.id ? String(u.id) : '';
      nick = (u.properties && u.properties.nickname) || (u.kakao_account && u.kakao_account.profile && u.kakao_account.profile.nickname) || '';
    } else if (provider === 'naver') {
      const q = new URLSearchParams({ grant_type: 'authorization_code', client_id: env('NAVER_CLIENT_ID'), client_secret: env('NAVER_CLIENT_SECRET'), code, state: state || '' });
      const t = await (await fetch('https://nid.naver.com/oauth2.0/token?' + q.toString())).json();
      if (!t.access_token) return out({ error: 'naver_token', detail: t.error_description || t.error || '' }, 400);
      const u = await (await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
      const r = u.response || {};
      pid = r.id ? String(r.id) : '';
      nick = r.nickname || r.name || '';
    } else {
      return out({ error: 'provider' }, 400);
    }
    if (!pid) return out({ error: 'no_id' }, 400);

    const email = (provider + '_' + pid.replace(/[^A-Za-z0-9_-]/g, '') + '@social.parkgolfsegye.co.kr').toLowerCase();
    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    nick = String(nick).trim().slice(0, 12);
    if (nick.length < 2) nick = provider === 'kakao' ? '카카오회원' : '네이버회원';
    let isNew = false;
    const cr = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nickname: nick, provider, social: true } });
    if (!cr.error) isNew = true;
    else if (!/already|registered|exists/i.test(cr.error.message)) return out({ error: 'create', detail: cr.error.message }, 500);
    const gl = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (gl.error || !gl.data || !gl.data.properties) return out({ error: 'link', detail: gl.error ? gl.error.message : '' }, 500);
    return out({ token_hash: gl.data.properties.hashed_token, isNew });
  } catch (e) {
    return out({ error: 'server', detail: String(e) }, 500);
  }
});
