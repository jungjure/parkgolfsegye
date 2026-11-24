// 메뉴, 머리글, 바닥글 등 모든 화면 공통
(function(){
  var C = window.PGS_CONFIG || {};
  var root = document.body.getAttribute('data-root') || '';
  var page = document.body.getAttribute('data-page') || '';
  var MENU = [
    ['schedule','대회 일정','schedule.html'],
    ['venues','구장 정보','venues.html'],
    ['news','뉴스','news.html'],
    ['column','독자칼럼','column.html'],
    ['board','자유게시판','board.html'],
    ['join','조인게시판','join.html'],
    ['talk','파크톡','talk.html']
  ];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  var head = document.getElementById('site-header');
  if (head) head.innerHTML = '<header class="site-header"><div class="inner">'
    + '<a class="logo" href="' + root + 'index.html">' + esc(C.SITE_NAME) + '</a>'
    + '<nav class="nav">' + MENU.map(function(m){ return '<a href="' + root + m[2] + '"' + (m[0] === page ? ' class="on"' : '') + '>' + m[1] + '</a>'; }).join('') + '</nav>'
    + '<div class="user-box" id="user-box"><a href="' + root + 'login.html">로그인</a></div>'
    + '</div></header>';

  var co = C.COMPANY || {};
  var foot = document.getElementById('site-footer');
  if (foot) foot.innerHTML = '<footer class="site-footer"><div class="inner">'
    + esc(co.name) + ' | 대표 ' + esc(co.ceo) + ' | ' + esc(co.address) + '<br>'
    + '전화 ' + esc(co.tel) + ' | 팩스 ' + esc(co.fax) + ' | ' + esc(co.email) + '<br>'
    + '사업자등록번호 ' + esc(co.bizNo) + ' | 인터넷신문 등록번호 ' + esc(co.pressNo) + '<br>'
    + '<a href="' + root + 'privacy.html"><b>개인정보처리방침</b></a>'
    + '</div></footer>';

  // 로그인 상태 표시: 로그인 전 = 로그인·회원가입, 로그인 후 = 별명·마이페이지·(관리자)·로그아웃
  var ub = document.getElementById('user-box');
  if (ub) ub.innerHTML = '<a href="' + root + 'login.html">로그인</a> · <a href="' + root + 'signup.html">회원가입</a>';
  if (window.sb && window.PGS_AUTH) {
    PGS_AUTH.user().then(function(u){
      if (!u) return;
      sb.from('profiles').select('nickname,role').eq('id', u.id).maybeSingle().then(function(r){
        var p = r.data || {};
        ub.innerHTML = '<span class="nick">' + esc(p.nickname || '회원') + '님</span> · <a href="' + root + 'mypage.html">마이페이지</a>'
          + (p.role === 'admin' ? ' · <a href="' + root + 'admin/index.html">관리자</a>' : '')
          + ' · <a href="#" id="logout">로그아웃</a>';
        document.getElementById('logout').onclick = function(e){ e.preventDefault(); PGS_AUTH.signOut(); };
      });
    });
  }

  // 여러 화면에서 같이 쓰는 도구
  var _me = null, _nick = {};
  window.PGS = {
    root: root, esc: esc,
    me: function(){
      if (!_me) _me = !window.sb ? Promise.resolve({}) : sb.auth.getUser().then(function(u){
        var user = u.data && u.data.user;
        if (!user) return {};
        return sb.from('profiles').select('id,nickname,role').eq('id', user.id).maybeSingle().then(function(r){ return { user: user, profile: r.data || {} }; });
      });
      return _me;
    },
    nicks: function(ids){
      var need = ids.filter(function(i){ return i && !(i in _nick); }).filter(function(v, i, a){ return a.indexOf(v) === i; });
      if (!need.length || !window.sb) return Promise.resolve(_nick);
      return sb.from('public_profiles').select('id,nickname').in('id', need).then(function(r){ (r.data || []).forEach(function(p){ _nick[p.id] = p.nickname; }); need.forEach(function(i){ if (!(i in _nick)) _nick[i] = '탈퇴한 회원'; }); return _nick; });
    },
    when: function(iso){
      var d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      var diff = (now - d) / 60000;
      if (diff < 1) return '방금';
      if (diff < 60) return Math.floor(diff) + '분 전';
      if (diff < 1440 && d.getDate() === now.getDate()) return Math.floor(diff / 60) + '시간 전';
      return d.getFullYear() + '.' + (d.getMonth()+1) + '.' + d.getDate() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    },
    text: function(s){ return esc(s).replace(/\n/g, '<br>'); }
  };

  // 맨 위 공지 띠 (관리자 화면 > 설정에서 적으면 모든 화면에 보임)
  if (window.sb && head) {
    sb.from('site_settings').select('key,value').in('key', ['notice','notice_link']).then(function(r){
      var s = {}; (r.data || []).forEach(function(x){ s[x.key] = x.value; });
      if (!s.notice) return;
      var t = esc(s.notice);
      head.insertAdjacentHTML('afterbegin', '<div class="notice-bar">' + (s.notice_link ? '<a href="' + esc(s.notice_link) + '">' + t + '</a>' : t) + '</div>');
    });
  }

  // 방문 기록 (통계용): IP·회원 번호는 남기지 않음. 브라우저에 임의의 방문자 값만 저장
  if (window.sb && !/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)) {
    try {
      var vid = localStorage.getItem('pgs_vid');
      if (!vid) { vid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem('pgs_vid', vid); }
      var ua = navigator.userAgent;
      var dev = /iPad|Tablet/i.test(ua) ? '태블릿' : /Mobi|Android|iPhone/i.test(ua) ? '휴대폰' : 'PC';
      var br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER/i.test(ua) ? '네이버앱' : /SamsungBrowser/i.test(ua) ? '삼성인터넷' : /Edg\//.test(ua) ? '엣지' : /Chrome\//.test(ua) ? '크롬' : /Safari\//.test(ua) ? '사파리' : '기타';
      var ref = document.referrer && document.referrer.indexOf(location.origin) !== 0 ? document.referrer : null;
      setTimeout(function(){
        sb.from('page_views').insert({ path: location.pathname + location.search, referrer: ref, visitor: vid, device: dev, browser: br, screen_w: screen.width, title: document.title }).then(function(){});
      }, 1500);
    } catch (e) {}
  }

  // 화면별 목록 불러오기 (Supabase 연결 뒤에 작동)

})();
