// 메뉴, 머리글, 바닥글 등 모든 화면 공통
(function(){
  var C = window.PGS_CONFIG || {};
  var root = document.body.getAttribute('data-root') || '';
  var page = document.body.getAttribute('data-page') || '';
  var EMBED = /[?&]embed=1/.test(location.search) && window.parent !== window;
  if (EMBED) { document.body.classList.add('embed'); var bt = document.createElement('base'); bt.target = '_top'; document.head.appendChild(bt); }
  var MENU = [
    ['schedule','대회 일정','schedule.html'],
    ['venues','구장 정보','venues.html'],
    ['news','뉴스','news.html'],
    ['course','입문강좌','course.html'],
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

  var head = EMBED ? null : document.getElementById('site-header');
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
    + '<a class="mi-x" href="https://band.us/band/102127754">네이버 밴드</a>'
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
  var foot = EMBED ? null : document.getElementById('site-footer');
  function fi(k, v){ return v ? '<span class="fi"><b>' + k + '</b> ' + esc(v) + '</span>' : ''; }
  if (foot) foot.innerHTML = '<footer class="site-footer"><div class="inner">'
    + '<div class="frow">' + fi('명칭', co.name) + fi('주사무소', co.office) + fi('전화', co.tel) + '</div>'
    + '<div class="frow">' + fi('등록번호', co.pressNo) + fi('등록연월일', co.pressDate) + fi('제호', co.title) + fi('발행인', co.publisher) + fi('편집인', co.editor) + fi('청소년보호책임자', co.youthOfficer) + '</div>'
    + '<div class="frow">' + fi('발행소', co.pubOffice) + fi('발행연월일', co.pubDate) + '</div>'
    + '<div class="frow">' + fi('대표이사', co.ceo) + fi('사업자등록번호', co.bizNo) + fi('팩스', co.fax) + fi('이메일', co.email) + '</div>'
    + '<div class="frow"><a href="' + root + 'privacy.html"><b>개인정보처리방침</b></a><span class="fi">Copyright © 파크골프세계 주식회사. All rights reserved.</span></div>'
    + '</div></footer>';

  // 로그인 상태 표시: 로그인 전 = 로그인·회원가입, 로그인 후 = 별명·마이페이지·(관리자)·로그아웃
  // 파크톡: 누르면 화면 오른쪽에 반쯤 덮는 창으로 열림 (파크톡 화면 안에서는 그냥 이동)
  function openTalk(){
    var ov = document.getElementById('tk-ov');
    if (!ov) {
      document.body.insertAdjacentHTML('beforeend', '<div id="tk-ov" class="tk-ov"><aside class="tk" role="dialog" aria-modal="true" aria-label="파크톡">'
        + '<div class="tk-hd"><b>' + TALK_SVG + '파크톡</b><a class="tk-full" href="' + root + 'talk.html">크게 보기</a><button type="button" class="tk-x" aria-label="닫기">×</button></div>'
        + '<iframe class="tk-fr" title="파크톡" src="' + root + 'talk.html?embed=1"></iframe></aside></div>');
      ov = document.getElementById('tk-ov');
      ov.addEventListener('click', function(e){ if (e.target === ov || e.target.closest('.tk-x')) closeTalk(); });
    }
    document.documentElement.classList.add('tk-lock');
    requestAnimationFrame(function(){ ov.classList.add('on'); });
  }
  function closeTalk(){ var ov = document.getElementById('tk-ov'); if (ov) ov.classList.remove('on'); document.documentElement.classList.remove('tk-lock'); }
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeTalk(); });
  if (head && page !== 'talk') head.addEventListener('click', function(e){
    var a = e.target.closest('a.talk-pill'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); openTalk();
  });
  window.PGS_TALK = { open: openTalk, close: closeTalk };

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
    text: function(s){ return esc(s).replace(/\n/g, '<br>'); },
    // 게시글 본문: [[img:https://…]] 줄은 그 자리에 사진, 나머지는 글
    postImgs: function(s){ var o = [], re = /^\[\[img:(https:\/\/[^\]\s]+)\]\]\s*$/gm, m; while ((m = re.exec(s || ''))) o.push(m[1]); return o; },
    postPlain: function(s){ return String(s || '').replace(/^\[\[img:[^\]]*\]\]\s*$/gm, ' ').replace(/\s+/g, ' ').trim(); },
    postHtml: function(s){
      return String(s || '').split(/^(\[\[img:https:\/\/[^\]\s]+\]\])\s*$/m).map(function(part){
        var m = /^\[\[img:(https:\/\/[^\]\s]+)\]\]$/.exec(part);
        if (m) return '<figure class="pimg"><img src="' + esc(m[1]) + '" alt="첨부 사진" loading="lazy"></figure>';
        part = part.replace(/^\n+|\s+$/g, '');
        return part ? '<div class="ptxt">' + esc(part).replace(/\n/g, '<br>') + '</div>' : '';
      }).join('');
    }
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


  // 공유 (2026-11-25): 각 화면 제목 옆 [공유] → 카카오톡 공유 / 밴드 공유 / 주소 복사
  var KAKAO_JS = '329814625fa8441db2871c2b10da8efa';
  var SHARE_PAGES = /^(home|schedule|venues|news|course|article|column|board|post|join|talk|privacy)$/;
  var SHARE_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  var isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  function loadKakao(){
    if (window.Kakao || document.getElementById('kakao-sdk')) return;
    var s = document.createElement('script'); s.id = 'kakao-sdk'; s.async = true;
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'; s.crossOrigin = 'anonymous';
    s.onload = function(){ try { if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS); } catch (e) {} };
    document.head.appendChild(s);
  }
  function shareInfo(){
    // 2026-11-26 사용자: 모든 화면의 카톡 공유는 정사각 그림(로고·이름·주소 띠) 하나를 기본으로, 그림 아래에 한 줄 설명.
    var h1 = document.querySelector('main h1'), t = (h1 && h1.textContent.trim()) || document.title;
    var title = (t === C.SITE_NAME || !t) ? C.SITE_NAME : t + ' - ' + C.SITE_NAME;
    var key = page;
    if (page === 'article') key = 'news';
    if (page === 'post') { var cat = document.querySelector('main .nw-cat'); key = cat && /자유/.test(cat.textContent) ? 'board' : 'column'; }
    var IMG_KEYS = /^(schedule|venues|news|course|column|board|join|talk)$/;
    // 2026-11-26 사용자 "로고밑의 메뉴표시는 없애줘": 모든 화면이 같은 그림(share.jpg)을 쓰고, 메뉴는 제목과 아래 한 줄로만 구분
    var img = (C.SITE_URL || location.origin) + '/assets/img/share.jpg?v=5'; // 그림을 바꾸면 v 숫자를 올려 카톡 그림 캐시를 새로 받게 함
    // 그림 아래 한 줄 설명 (2026-11-26 사용자 "하단에는 글 하나를 기술해줘"): 메뉴별 소개, 기사·글은 본문 첫 부분
    var LINE = { home: '파크골프 대회 일정·구장 정보·소식을 한곳에서', schedule: '전국 파크골프 대회·접수 일정을 한눈에', venues: '전국 파크골프장 위치와 이용 정보',
      news: '오늘의 파크골프 소식', course: '처음 시작하는 분을 위한 파크골프 입문강좌', column: '독자가 쓰는 파크골프 이야기', board: '파크골프 동호인 자유게시판',
      join: '함께 칠 분을 찾는 조인게시판', talk: '파크골프 동호인 실시간 대화방', privacy: '파크골프세계 개인정보처리방침' };
    var desc = LINE[key] || LINE.home;
    if (page === 'article' || page === 'post') {
      var body = document.querySelector('main #post-body, main #article .art-body, main .art-body');
      var bt = body ? body.textContent.replace(/\s+/g, ' ').trim() : '';
      if (bt) desc = bt.length > 48 ? bt.slice(0, 47) + '…' : bt;
    }
    return { title: title, desc: desc, img: img, og: true, url: location.href.split('#')[0] };
  }
  function toast(t){
    var el = document.getElementById('pgs-toast');
    if (!el) { el = document.createElement('div'); el.id = 'pgs-toast'; el.className = 'pgs-toast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('on'); }, 2200);
  }
  function copyUrl(u){
    var done = function(){ toast('주소를 복사했습니다. 붙여 넣어 공유하세요.'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(u).then(done, function(){ prompt('주소를 복사하세요', u); });
    else prompt('주소를 복사하세요', u);
  }
  function shareKakao(){
    var i = shareInfo();
    if (!(window.Kakao && Kakao.isInitialized && Kakao.isInitialized() && Kakao.Share)) { loadKakao(); copyUrl(i.url); return; }
    try {
      Kakao.Share.sendDefault({ objectType: 'feed',
        content: { title: i.title, description: i.desc || undefined, imageUrl: i.img, imageWidth: i.og ? 1080 : undefined, imageHeight: i.og ? 1037 : undefined, link: { mobileWebUrl: i.url, webUrl: i.url } }, // 카톡 공유 그림 1080x1037 (2026-11-26 사용자: 높이 80% 뒤 다시 20% 키움)
        buttons: [{ title: '자세히 보기', link: { mobileWebUrl: i.url, webUrl: i.url } }] });
    } catch (e) { copyUrl(i.url); }
  }
  function shareBand(){
    var i = shareInfo(), body = i.title + '\n' + i.url, route = location.host;
    var web = 'https://band.us/plugin/share?body=' + encodeURIComponent(body) + '&route=' + encodeURIComponent(route);
    if (isPhone && !/KAKAOTALK/i.test(navigator.userAgent)) {
      var t0 = Date.now();
      location.href = 'bandapp://create/post?text=' + encodeURIComponent(body) + '&route=' + encodeURIComponent(route);
      setTimeout(function(){ if (!document.hidden && Date.now() - t0 < 2600) location.href = web; }, 1500);
    } else if (isPhone) location.href = web;
    else { var w = window.open(web, 'bandshare', 'width=480,height=640,resizable=yes,scrollbars=yes'); if (!w) location.href = web; }
  }
  function shareBox(){
    if (EMBED || !SHARE_PAGES.test(page) || /\/admin\//.test(location.pathname)) return;
    var h1 = document.querySelector('main h1'); if (!h1 || h1.parentNode.classList.contains('ptitle')) return;
    var wrap = document.createElement('div'); wrap.className = 'ptitle';
    h1.parentNode.insertBefore(wrap, h1); wrap.appendChild(h1);
    wrap.insertAdjacentHTML('beforeend', '<div class="share"><button type="button" class="share-btn" aria-haspopup="true" aria-expanded="false">' + SHARE_SVG + '공유</button>'
      + '<div class="share-menu" hidden><button type="button" data-sh="kakao"><span class="si kk">K</span>카카오톡 공유</button>'
      + '<button type="button" data-sh="band"><span class="si bd">b</span>밴드 공유</button>'
      + '<button type="button" data-sh="copy"><span class="si cp"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></span>주소 복사</button></div></div>');
    var btn = wrap.querySelector('.share-btn'), menu = wrap.querySelector('.share-menu');
    function close(){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('mouseenter', loadKakao); btn.addEventListener('touchstart', loadKakao, { passive: true });
    btn.addEventListener('click', function(e){ e.stopPropagation(); loadKakao(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
    menu.addEventListener('click', function(e){
      var b = e.target.closest('button[data-sh]'); if (!b) return; close();
      if (b.dataset.sh === 'kakao') shareKakao(); else if (b.dataset.sh === 'band') shareBand(); else copyUrl(shareInfo().url);
    });
    document.addEventListener('click', function(e){ if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    setTimeout(loadKakao, 2500);
  }
  shareBox();
  window.PGS_SHARE = { kakao: shareKakao, band: shareBand, copy: function(){ copyUrl(shareInfo().url); } };

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

// 간편 로그인 단추·지역 선택 안내 (2026-11-26, assets/js/social.js)
(function(){ if (document.getElementById('pgs-social-js')) return; var s = document.createElement('script'); s.id = 'pgs-social-js'; s.src = (document.body.getAttribute('data-root') || '') + 'assets/js/social.js?v=20261126a'; document.head.appendChild(s); })();
