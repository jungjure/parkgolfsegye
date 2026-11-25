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

  // 머리글: parkgolfnews.org 머리글을 본뜬 모양 (로고 + 이름, 초록 메뉴 띠, 날짜·밴드·전화·검색·뉴스레터 줄)
  var TALK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var WD = ['일','월','화','수','목','금','토'];
  function kst(d){ return new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); }
  var today = kst(new Date());
  var todayTxt = today.getFullYear() + '년 ' + (today.getMonth()+1) + '월 ' + today.getDate() + '일 ' + WD[today.getDay()] + '요일';
  var NAV = [['home','홈','index.html']].concat(MENU.filter(function(m){ return m[0] !== 'talk'; }));

  var head = document.getElementById('site-header');
  if (head) head.innerHTML = '<div class="mast"><div class="mast-in">'
    + '<a class="mast-logo" href="' + root + 'index.html" title="홈"><img src="' + root + 'assets/img/logo.png" alt=""><span class="nm">' + esc(C.SITE_NAME) + '</span></a>'
    + '<div class="sl"><span class="ed" id="pgs-ed"></span><span class="slogan">' + esc(C.SITE_NAME) + '는 오늘의 소식을 전합니다.</span>'
    + '<a class="talk-pill' + (page === 'talk' ? ' on' : '') + '" href="' + root + 'talk.html" title="파크톡">' + TALK_SVG + '파크톡</a></div>'
    + '</div></div>'
    + '<header class="site-header"><div class="inner">'
    + '<nav class="nav" aria-label="메뉴">' + NAV.map(function(m){ return '<a href="' + root + m[2] + '"' + (m[0] === page ? ' class="on"' : '') + '>' + m[1] + '</a>'; }).join('') + '</nav>'
    + '<div class="user-box" id="user-box"></div>'
    + '</div>'
    + '<div class="menu-info"><time>' + todayTxt + '</time>'
    + '<a class="mi-x" href="https://band.us/@parkgolfnews1">네이버 밴드</a>'
    + '<a class="mi-x" href="tel:' + String((C.COMPANY || {}).tel || '').replace(/[^0-9]/g, '') + '">' + esc((C.COMPANY || {}).tel || '') + '</a>'
    + '<form class="msearch" action="' + root + 'news.html" method="get" role="search"><input type="search" name="q" placeholder="기사 검색" aria-label="기사 검색어" maxlength="40" value="' + (page === 'news' ? esc(new URLSearchParams(location.search).get('q') || '') : '') + '">'
    + '<button type="submit" aria-label="검색"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></button></form>'
    + '<a class="nl-btn" id="nl-btn" href="' + root + 'signup.html">뉴스레터 받기</a>'
    + '</div></header>';

  // 최근 편집: 가장 최근에 실린 기사 시각
  if (window.sb && head) {
    sb.from('articles').select('created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(1).then(function(r){
      var a = r.data && r.data[0]; var el = document.getElementById('pgs-ed');
      if (!a || !el) return;
      var d = kst(a.created_at);
      el.textContent = '최근 편집 ' + d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0') + '(' + WD[d.getDay()] + ') ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    });
  }

  var co = C.COMPANY || {};
  var foot = document.getElementById('site-footer');
  function fi(k, v){ return v ? '<span class="fi"><b>' + k + '</b> ' + esc(v) + '</span>' : ''; }
  if (foot) foot.innerHTML = '<footer class="site-footer"><div class="inner">'
    + '<div class="frow">' + fi('명칭', co.name) + fi('주사무소', co.office) + fi('전화', co.tel) + '</div>'
    + '<div class="frow">' + fi('등록번호', co.pressNo) + fi('등록연월일', co.pressDate) + fi('제호', co.title) + fi('발행인', co.publisher) + fi('편집인', co.editor) + fi('청소년보호책임자', co.youthOfficer) + '</div>'
    + '<div class="frow">' + fi('발행소', co.pubOffice) + fi('발행연월일', co.pubDate) + '</div>'
    + '<div class="frow">' + fi('대표이사', co.ceo) + fi('사업자등록번호', co.bizNo) + fi('팩스', co.fax) + fi('이메일', co.email) + '</div>'
    + '<div class="frow"><a href="' + root + 'privacy.html"><b>개인정보처리방침</b></a><span class="fi">Copyright © 파크골프세계 주식회사. All rights reserved.</span></div>'
    + '</div></footer>';

  // 로그인 상태 표시: 로그인 전 = 로그인·회원가입, 로그인 후 = 별명·마이페이지·(관리자)·로그아웃
  var ub = document.getElementById('user-box');
  function onp(k){ return page === k ? ' on' : ''; }
  if (ub) ub.innerHTML = '<a class="ab' + onp('login') + '" href="' + root + 'login.html">로그인</a><a class="ab' + onp('signup') + '" href="' + root + 'signup.html">회원가입</a>';
  if (window.sb && window.PGS_AUTH) {
    PGS_AUTH.user().then(function(u){
      if (!u) return;
      sb.from('profiles').select('nickname,role').eq('id', u.id).maybeSingle().then(function(r){
        var p = r.data || {};
        ub.innerHTML = '<span class="nick">' + esc(p.nickname || '회원') + '님</span><a class="ab' + onp('mypage') + '" href="' + root + 'mypage.html">마이페이지</a>'
          + (p.role === 'admin' ? '<a class="ab' + (/\/admin\//.test(location.pathname) ? ' on' : '') + '" href="' + root + 'admin/index.html">관리자</a>' : '')
          + '<a class="ab" href="#" id="logout">로그아웃</a>';
        var nb = document.getElementById('nl-btn'); if (nb) nb.href = root + 'mypage.html';
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
