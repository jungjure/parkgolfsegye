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

  // 화면별 목록 불러오기 (Supabase 연결 뒤에 작동)
  var body = document.getElementById('page-body');
  function list(rows, href){
    if (!rows || !rows.length) return '<p class="muted">아직 글이 없습니다.</p>';
    return '<ul class="list">' + rows.map(function(r){ return '<li><a href="' + href(r) + '">' + esc(r.title) + '</a></li>'; }).join('') + '</ul>';
  }
  if (window.sb && body) {
    if (page === 'column' || page === 'board') {
      sb.from('posts').select('id,title,created_at').eq('board', page === 'column' ? 'column' : 'free').order('created_at', { ascending: false }).limit(30)
        .then(function(r){ body.innerHTML = list(r.data, function(p){ return page + '.html?id=' + p.id; }); });
    }
  }

})();
