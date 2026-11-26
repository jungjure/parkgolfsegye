// 간편 로그인(카카오·네이버·구글) 단추 + 로그인 뒤 지역·휴대폰(문자 인증) 안내 (2026-11-26)
// 불러오는 곳: app.js 끝에서 모든 화면에 자동으로 넣음. 글꼴은 부모(Pretendard)를 그대로 씀.
(function(){
  if (window.__pgsSocial) return; window.__pgsSocial = 1;
  var KAKAO_REST = '37a816e2fd44b04bb2f29b65e243b448';          // 카카오 REST 키 (인가 주소에 원래 드러나는 공개 값)
  var NAVER_ID = '6k3CxRUrmkKprj09zDMH';            // 네이버 로그인 Client ID (공개 값)
  var FN = 'https://rzteighnvqroxuqqwhov.supabase.co/functions/v1/social-login';
  var ORIGIN = location.origin.indexOf('parkgolfsegye.co.kr') > -1 ? location.origin : 'https://parkgolfsegye.co.kr';
  var REDIRECT = ORIGIN + '/oauth.html';
  var root = document.body.getAttribute('data-root') || '';
  var page = document.body.getAttribute('data-page') || '';

  function css(){
    if (document.getElementById('pgs-social-css')) return;
    var s = document.createElement('style'); s.id = 'pgs-social-css';
    s.textContent = '.sns-box{max-width:420px;margin-top:14px}.sns-or{display:flex;align-items:center;gap:10px;color:var(--sub,#666);font-size:13px;margin:4px 0 10px}.sns-or:before,.sns-or:after{content:"";flex:1;height:1px;background:var(--line,#ddd)}'
      + '.sbtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:46px;border-radius:8px;border:1px solid transparent;font:inherit;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:8px}'
      + '.sbtn svg{width:20px;height:20px;flex:none}.sbtn.kakao{background:#FEE500;color:#191919}.sbtn.naver{background:#03C75A;color:#fff}.sbtn.google{background:#fff;color:#1f1f1f;border-color:#dadce0}'
      + '.sns-note{font-size:12px;color:var(--sub,#666);line-height:1.5;margin:4px 0 0}'
      + '#pgs-pp{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}'
      + '#pgs-pp .pp{background:#fff;border-radius:12px;max-width:420px;width:100%;padding:22px 20px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-height:92vh;overflow:auto;box-sizing:border-box}'
      + '#pgs-pp h2{margin:0 0 6px;font-size:20px}#pgs-pp p{margin:0 0 14px;font-size:14px;color:var(--sub,#555);line-height:1.6}'
      + '#pgs-pp label{display:block;font-size:14px;margin-bottom:10px}#pgs-pp input[type=text],#pgs-pp select{width:100%;box-sizing:border-box;height:42px;border:1px solid var(--line,#ccc);border-radius:8px;padding:0 10px;font:inherit;font-size:15px;margin-top:4px;background:#fff}'
      + '#pgs-pp .two{display:flex;gap:8px}#pgs-pp .two select{flex:1;min-width:0}#pgs-pp .ck{display:flex;align-items:flex-start;gap:6px;font-size:14px}#pgs-pp .ck input{margin-top:3px}'
      + '#pgs-pp .acts{display:flex;gap:8px;margin-top:14px}#pgs-pp .acts button{flex:1;height:44px;border-radius:8px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;border:1px solid var(--line,#ccc);background:#fff;color:#1a1a1a}#pgs-pp .acts .ok{background:var(--main,#0b5d3b);color:#fff;border-color:transparent}'
      + '#pgs-pp .msg{font-size:13px;color:#c62828;min-height:18px;margin:6px 0 0}';
    document.head.appendChild(s);
  }
  var ICON = {
    kakao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3C6.48 3 2 6.55 2 10.93c0 2.83 1.88 5.31 4.71 6.71l-1.2 4.36c-.1.38.33.68.66.46l5.2-3.45c.21.02.42.03.63.03 5.52 0 10-3.55 10-7.93S17.52 3 12 3z"/></svg>',
    naver: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M15.56 12.84 8.17 2H2v20h6.44V11.16L15.83 22H22V2h-6.44z"/></svg>',
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.73z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.29V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l3.98-3.11z"/><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.29 6.6l3.98 3.11C6.22 6.86 8.87 4.75 12 4.75z"/></svg>'
  };
  function rand(){ var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.prototype.map.call(a, function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function safeNext(n){ return n && /^(admin\/)?[\w\-]+\.html(\?[\w=&%\-]*)?$/.test(n) ? n : 'index.html'; }

  // 1) 로그인·회원가입 화면에 간편 로그인 단추
  function buttons(){
    var host = document.getElementById('social-login');
    if (!host) return;
    css();
    host.className = 'sns-box';
    host.innerHTML = '<div class="sns-or">간편 로그인</div>'
      + '<button type="button" class="sbtn kakao" data-p="kakao">' + ICON.kakao + '카카오로 시작하기</button>'
      + '<button type="button" class="sbtn naver" data-p="naver">' + ICON.naver + '네이버로 시작하기</button>'
      + '<button type="button" class="sbtn google" data-p="google">' + ICON.google + '구글로 시작하기</button>'
      + '<p class="sns-note">처음이시면 바로 회원가입이 됩니다. 가입 뒤 사는 지역(시·도, 시·군·구)과 휴대폰 번호를 적어 주시면 우리 지역 대회와 소식을 먼저 알려 드립니다.</p>';
    host.addEventListener('click', function(e){
      var b = e.target.closest('.sbtn'); if (!b) return;
      start(b.getAttribute('data-p'));
    });
  }
  async function start(p){
    var next = safeNext(new URLSearchParams(location.search).get('next'));
    var st = p.charAt(0) + rand();
    sessionStorage.setItem('pgs_oauth', JSON.stringify({ p: p, st: st, next: next }));
    if (p === 'kakao') {
      location.href = 'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=' + KAKAO_REST + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + st + '&scope=profile_nickname';
    } else if (p === 'naver') {
      location.href = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + NAVER_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + st;
    } else if (p === 'google') {
      var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT + '?p=google', queryParams: { prompt: 'select_account' } } });
      if (r.error) alert('구글 로그인을 시작하지 못했습니다. 잠시 뒤 다시 해 주세요.');
    }
  }

  // 2) oauth.html: 돌아온 코드로 로그인 마무리
  async function callback(){
    var box = document.getElementById('oauth-msg');
    function say(t, err){ if (box) { box.textContent = t; box.className = 'form-msg' + (err ? ' err' : ''); } }
    var q = new URLSearchParams(location.search);
    var saved = {}; try { saved = JSON.parse(sessionStorage.getItem('pgs_oauth') || '{}'); } catch (e) {}
    var next = safeNext(saved.next);
    if (q.get('error')) { say('로그인이 취소되었습니다. 로그인 화면에서 다시 시도해 주세요.', true); return; }
    try {
      if (saved.p === 'kakao' || saved.p === 'naver') {
        if (!q.get('code') || q.get('state') !== saved.st) { say('로그인 정보가 맞지 않습니다. 로그인 화면에서 다시 시도해 주세요.', true); return; }
        say('로그인하는 중입니다...');
        var C = window.PGS_CONFIG || {};
        var r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.SUPABASE_ANON_KEY }, body: JSON.stringify({ provider: saved.p, code: q.get('code'), state: q.get('state'), redirect_uri: REDIRECT }) });
        var j = await r.json();
        if (!j.token_hash) { say('로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', true); return; }
        var v = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' });
        if (v.error) v = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'magiclink' });
        if (v.error) { say('로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', true); return; }
      } else {
        // 구글: Supabase가 주소에 담아 준 정보로 로그인됨
        if (q.get('code')) { try { await sb.auth.exchangeCodeForSession(q.get('code')); } catch (e) {} }
        var s = null;
        for (var i = 0; i < 20 && !s; i++) { s = (await sb.auth.getSession()).data.session; if (!s) await new Promise(function(ok){ setTimeout(ok, 300); }); }
        if (!s) { say('로그인하지 못했습니다. 로그인 화면에서 다시 시도해 주세요.', true); return; }
      }
      sessionStorage.removeItem('pgs_oauth');
      say('로그인되었습니다. 이동합니다...');
      location.replace(root + next);
    } catch (e) { say('로그인 중 문제가 생겼습니다. 다시 시도해 주세요.', true); }
  }

  // 3) 로그인한 회원에게 지역(시·도, 시·군·구)·휴대폰 번호가 없으면 안내 (간편 가입은 가입 마무리 + 휴대폰 문자 인증)
  var PFN = 'https://rzteighnvqroxuqqwhov.supabase.co/functions/v1/phone-verify';
  async function pcall(body, s){
    var C = window.PGS_CONFIG || {};
    var h = { 'Content-Type': 'application/json', apikey: C.SUPABASE_ANON_KEY };
    if (s) h.Authorization = 'Bearer ' + s.access_token;
    try { var r = await fetch(PFN, { method: 'POST', headers: h, body: JSON.stringify(body) }); return await r.json(); } catch (e) { return { error: 'net' }; }
  }
  function pOk(p){ return /^01[016789]\d{7,8}$/.test(String(p || '').replace(/\D/g, '')); }
  function pFmt(p){ var d = String(p || '').replace(/\D/g, ''); return d.length === 11 ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : d.length === 10 ? d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : String(p || '').trim(); }
  var PERR = { phone: '휴대폰 번호를 확인해 주세요.', wait: '1분 뒤에 다시 받을 수 있습니다.', too_many: '오늘은 더 받을 수 없습니다. 내일 다시 해 주세요.', sms: '문자를 보내지 못했습니다. 번호를 확인해 주세요.', wrong: '인증번호가 맞지 않습니다.', expired: '인증번호 시간이 지났습니다. 다시 받아 주세요.', no_code: '먼저 인증번호를 받아 주세요.', login: '다시 로그인해 주세요.' };

  async function prompt(){
    if (/^(login|signup|find|reset|oauth)$/.test(page)) return;
    var s = (await sb.auth.getSession()).data.session; if (!s) return;
    var r = await sb.from('profiles').select('nickname,region_sido,region_sigungu,agreed_at,phone,phone_verified_at').eq('id', s.user.id).maybeSingle();
    var p = r.data; if (!p) return;
    var social = /@social\.parkgolfsegye\.co\.kr$/.test(s.user.email || '') || ((s.user.app_metadata || {}).provider && s.user.app_metadata.provider !== 'email');
    var needAgree = !p.agreed_at, needRegion = !p.region_sido || !p.region_sigungu;
    var needPhone = !p.phone || (social && !p.phone_verified_at);
    if (!needAgree && !needRegion && !needPhone) return;
    if (!needAgree && sessionStorage.getItem('pgs_pp_later')) return;
    var st = await pcall({ action: 'status' });
    var smsOn = !!(st && st.configured);
    if (!needAgree && !needRegion && p.phone && !smsOn) return; // 문자 인증 준비 전에는 번호가 있으면 다시 묻지 않음
    css();
    var R = window.PGS_REGIONS;
    if (!R) { await new Promise(function(ok){ var x = document.createElement('script'); x.src = root + 'assets/js/regions.js'; x.onload = ok; x.onerror = ok; document.head.appendChild(x); }); R = window.PGS_REGIONS || {}; }
    var d = document.createElement('div'); d.id = 'pgs-pp';
    d.innerHTML = '<div class="pp" role="dialog" aria-modal="true" aria-labelledby="pgs-pp-t">'
      + '<h2 id="pgs-pp-t">' + (needAgree ? '가입을 마무리해 주세요' : '회원 정보를 채워 주세요') + '</h2>'
      + '<p>사는 지역과 휴대폰 번호를 적어 주시면 우리 지역 파크골프 대회와 소식을 먼저 알려 드리고, 조인게시판에서 함께 칠 분과 연락할 수 있습니다.</p>'
      + (needAgree ? '<label>별명 (글·댓글에 보임, 2~12자)<input type="text" name="nick" maxlength="12"></label>' : '')
      + '<label>지역<span class="two"><select name="s1" aria-label="시·도"></select><select name="s2" aria-label="시·군·구" disabled></select></span></label>'
      + '<label>휴대폰 번호<span class="two"><input type="text" name="ph" inputmode="numeric" maxlength="13" placeholder="010-1234-5678" autocomplete="tel">'
      + (smsOn ? '<button type="button" class="pbtn snd">인증번호 받기</button>' : '') + '</span></label>'
      + (smsOn ? '<label class="codebox" style="display:none">인증번호 6자리<span class="two"><input type="text" name="cd" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button type="button" class="pbtn chk">확인</button></span></label>' : '')
      + '<p class="pmsg" style="margin:-4px 0 10px;font-size:13px"></p>'
      + (needAgree ? '<label class="ck"><input type="checkbox" name="ag"> <span>개인정보 수집·이용에 동의합니다 (필수) <a href="' + root + 'privacy.html" target="_blank">보기</a></span></label><label class="ck"><input type="checkbox" name="age"> <span>만 14세 이상입니다 (필수)</span></label>' : '')
      + '<p class="msg"></p><div class="acts">' + (needAgree ? '<button type="button" class="out">로그아웃</button>' : '<button type="button" class="later">나중에</button>') + '<button type="button" class="ok">저장</button></div></div>';
    document.body.appendChild(d);
    if (!document.getElementById('pgs-pp-css2')) { var s2c = document.createElement('style'); s2c.id = 'pgs-pp-css2'; s2c.textContent = '#pgs-pp .pbtn{flex:none;height:42px;margin-top:4px;padding:0 12px;border-radius:8px;border:1px solid var(--main,#0b5d3b);background:#fff;color:var(--main,#0b5d3b);font:inherit;font-size:14px;font-weight:700;cursor:pointer}#pgs-pp .two input{flex:1;min-width:0}#pgs-pp .pmsg.ok{color:#1b7a3a}#pgs-pp .pmsg.err{color:#c62828}'; document.head.appendChild(s2c); }
    var $ = function(n){ return d.querySelector('[name="' + n + '"]'); }, m = d.querySelector('.msg'), pm = d.querySelector('.pmsg');
    function pmsg(t, ok){ pm.textContent = t; pm.className = 'pmsg ' + (ok ? 'ok' : 'err'); }
    if ($('nick')) $('nick').value = p.nickname || '';
    $('ph').value = p.phone || '';
    var verified = !!p.phone_verified_at, vPhone = verified ? String(p.phone || '').replace(/\D/g, '') : '';
    if (verified) pmsg('인증된 번호입니다.', true);
    $('ph').addEventListener('input', function(){ if (verified && $('ph').value.replace(/\D/g, '') !== vPhone) { verified = false; pmsg('', true); } });
    var s1 = $('s1'), s2 = $('s2');
    s1.innerHTML = '<option value="">시·도 선택</option>' + Object.keys(R).map(function(k){ return '<option' + (k === p.region_sido ? ' selected' : '') + '>' + k + '</option>'; }).join('');
    function fill(v){ var l = R[s1.value] || []; s2.innerHTML = '<option value="">시·군·구 선택</option>' + l.map(function(k){ return '<option' + (k === v ? ' selected' : '') + '>' + k + '</option>'; }).join(''); s2.disabled = !l.length; }
    s1.addEventListener('change', function(){ fill(''); }); fill(p.region_sigungu || '');
    var snd = d.querySelector('.snd'), chk = d.querySelector('.chk');
    if (snd) snd.onclick = async function(){
      if (!pOk($('ph').value)) return pmsg('휴대폰 번호를 확인해 주세요.');
      snd.disabled = true; pmsg('문자를 보내는 중입니다...', true);
      var j = await pcall({ action: 'send', phone: $('ph').value }, s);
      snd.disabled = false;
      if (!j.ok) return pmsg(PERR[j.error] || '문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.');
      d.querySelector('.codebox').style.display = ''; snd.textContent = '다시 받기'; $('cd').focus();
      pmsg('인증번호를 문자로 보냈습니다. 5분 안에 입력해 주세요.', true);
    };
    if (chk) chk.onclick = async function(){
      var c = $('cd').value.replace(/\D/g, '');
      if (c.length !== 6) return pmsg('인증번호 6자리를 입력해 주세요.');
      chk.disabled = true;
      var j = await pcall({ action: 'check', phone: $('ph').value, code: c }, s);
      chk.disabled = false;
      if (!j.ok) return pmsg(PERR[j.error] || '확인하지 못했습니다. 다시 해 주세요.');
      verified = true; vPhone = $('ph').value.replace(/\D/g, ''); $('ph').value = j.phone || pFmt($('ph').value);
      d.querySelector('.codebox').style.display = 'none'; pmsg('휴대폰 번호가 확인되었습니다.', true);
    };
    var later = d.querySelector('.later'); if (later) later.onclick = function(){ sessionStorage.setItem('pgs_pp_later', '1'); d.remove(); };
    var out = d.querySelector('.out'); if (out) out.onclick = async function(){ await sb.auth.signOut(); location.href = root + 'index.html'; };
    d.querySelector('.ok').onclick = async function(){
      var up = { region_sido: s1.value, region_sigungu: s2.value };
      if (!up.region_sido || !up.region_sigungu) { m.textContent = '시·도와 시·군·구를 골라 주세요.'; return; }
      if (!pOk($('ph').value)) { m.textContent = '휴대폰 번호를 적어 주세요.'; return; }
      if (smsOn && !verified) { m.textContent = '휴대폰 인증을 마쳐 주세요. (인증번호 받기 → 확인)'; return; }
      if (!verified) up.phone = pFmt($('ph').value); // 문자 인증 준비 전: 번호만 저장(인증 안 됨)
      if (needAgree) {
        var nk = $('nick').value.trim();
        if (nk.length < 2 || nk.length > 12) { m.textContent = '별명은 2~12자로 정해 주세요.'; return; }
        if (!$('ag').checked || !$('age').checked) { m.textContent = '필수 항목에 동의해 주세요.'; return; }
        up.nickname = nk; up.agreed_at = new Date().toISOString();
      }
      var w = await sb.from('profiles').update(up).eq('id', s.user.id);
      if (w.error) { m.textContent = '저장하지 못했습니다. 잠시 뒤 다시 해 주세요.'; return; }
      d.remove(); location.reload();
    };
  }

  function go(){
    if (!window.sb) return;
    buttons();
    if (page === 'oauth') callback(); else prompt();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
