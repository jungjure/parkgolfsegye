/* 홈페이지 잠금 (2026-11-25 사용자 지시 "일단 인터넷으로 다른사람들이 접속하지못하게 막아주고 나혼자 수정할 수 있게 해줘")
   LOCKED = true 이면 관리자(profiles.role = 'admin')로 로그인한 사람만 화면을 봅니다.
   다른 사람(로그인 안 한 사람, 일반 회원)에게는 '준비 중' 화면만 보입니다.
   관리자가 로그인할 수 있게 로그인·비밀번호 찾기·비밀번호 재설정 화면만 열어 둡니다.
   잠금을 풀려면 아래 LOCKED 를 false 로 바꾸고 robots.txt 를 원래대로 되돌립니다.
   불러오는 곳: config.js(홈페이지 모든 화면), nlwin.js(뉴스레터 화면). */
(function(){
  var LOCKED = true;
  if (window.__pgsLock) return; window.__pgsLock = 1;
  var SB_URL = 'https://rzteighnvqroxuqqwhov.supabase.co';
  var SB_KEY = 'sb_publishable_DV2c-2cLZQN3gdBzCKzHpg_VHyTMCtc';
  var OPEN = /^\/(login|find|reset)\.html$/;
  var FONT = "'Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif";

  function unhide(){ var h = document.getElementById('pgs-lock-hide'); if (h) h.parentNode.removeChild(h); }
  if (!LOCKED || OPEN.test(location.pathname)) { unhide(); return; }

  function showLock(){
    if (document.getElementById('pgs-lock')) return;
    var st = document.createElement('style');
    st.textContent = 'body>*:not(#pgs-lock){display:none!important}'
      + '#pgs-lock{position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:' + FONT + ';color:#1a1a1a;text-align:center}'
      + '#pgs-lock img{width:72px;height:auto;margin-bottom:14px}'
      + '#pgs-lock h1{font-size:26px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px}'
      + '#pgs-lock p{font-size:16px;line-height:1.6;margin:0;color:#333}'
      + '#pgs-lock a{display:inline-block;margin-top:28px;font-size:13px;color:#888;text-decoration:underline}';
    document.head.appendChild(st);
    var p = location.pathname.replace(/^\//, '') + location.search;
    var next = /^(admin\/)?[\w\-]+\.html(\?[\w=&%\-]*)?$/.test(p) ? '?next=' + encodeURIComponent(p) : '';
    var d = document.createElement('div');
    d.id = 'pgs-lock';
    d.innerHTML = '<div><img src="/assets/img/logo.png" alt=""><h1>파크골프세계</h1>'
      + '<p>홈페이지를 준비하고 있습니다.<br>곧 새 모습으로 찾아뵙겠습니다.</p>'
      + '<a href="/login.html' + next + '">관리자 로그인</a></div>';
    document.body.appendChild(d);
    try { document.title = '파크골프세계 - 준비 중'; } catch (e) {}
    unhide();
  }

  function isAdmin(){
    if (window.sb && window.sb.auth) {
      return window.sb.auth.getSession().then(function(r){
        var ses = r && r.data && r.data.session;
        if (!ses || !ses.user) return false;
        return window.sb.from('profiles').select('role').eq('id', ses.user.id).maybeSingle().then(function(p){
          return !!(p && p.data && p.data.role === 'admin');
        });
      });
    }
    var s = null;
    try { s = JSON.parse(localStorage.getItem('sb-rzteighnvqroxuqqwhov-auth-token') || 'null'); } catch (e) {}
    if (!s || !s.access_token || !s.user || (s.expires_at && s.expires_at * 1000 < Date.now())) return Promise.resolve(false);
    return fetch(SB_URL + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(s.user.id), {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token }
    }).then(function(res){ return res.ok ? res.json() : []; }).then(function(j){ return !!(j && j[0] && j[0].role === 'admin'); });
  }

  function start(){
    var done = false;
    var t = setTimeout(function(){ if (!done) { done = true; showLock(); } }, 10000);
    Promise.resolve().then(isAdmin).then(function(ok){
      if (done) { if (ok) location.reload(); return; }
      done = true; clearTimeout(t);
      if (ok) unhide(); else showLock();
    }).catch(function(){ if (!done) { done = true; clearTimeout(t); showLock(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
