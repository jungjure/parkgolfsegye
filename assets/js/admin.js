// 관리자 화면: 오늘 요약 / 승인 대기 / 댓글 관리 / 회원
(function(){
  if (!window.sb) return;
  var root = PGS.root, esc = PGS.esc, box = document.getElementById('admin');
  var TABS = [['home','오늘 요약'],['pending','승인 대기'],['comments','댓글 관리'],['members','회원']];
  function todayStart(){ var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - 9 * 3600 * 1000).toISOString(); }
  function cnt(q){ return q.then(function(r){ return r.count || 0; }); }
  var me = {};

  function shell(tab){
    box.innerHTML = '<div class="sch-tabs adm-tabs">' + TABS.map(function(t){ return '<button data-tab="' + t[0] + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + t[1] + '<span class="badge" id="b-' + t[0] + '"></span></button>'; }).join('') + '</div><div id="adm-body"><p class="muted">불러오는 중입니다…</p></div>';
    badges();
  }
  function badges(){
    cnt(sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending')).then(function(n){ var b = document.getElementById('b-pending'); if (b) b.textContent = n ? n : ''; });
  }
  function go(tab){ location.hash = tab; }
  function body(){ return document.getElementById('adm-body'); }

  /* 오늘 요약 */
  function home(){
    var t0 = todayStart();
    Promise.all([
      cnt(sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      cnt(sb.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', t0)),
      cnt(sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', t0)),
      cnt(sb.from('joins').select('id', { count: 'exact', head: true }).gte('created_at', t0)),
      cnt(sb.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', t0)),
      cnt(sb.from('profiles').select('id', { count: 'exact', head: true })),
      cnt(sb.from('articles').select('id', { count: 'exact', head: true })),
      cnt(sb.from('venues').select('id', { count: 'exact', head: true }).is('lat', null)),
      sb.from('sync_log').select('kind,note,rows_upserted,created_at').in('kind', ['apply','news_apply']).order('id', { ascending: false }).limit(2)
    ]).then(function(v){
      var cards = [['승인 대기 칼럼', v[0], 'pending', v[0] > 0], ['오늘 새 댓글', v[1], 'comments'], ['오늘 새 회원', v[2], 'members'], ['오늘 새 조인글', v[3], ''], ['오늘 새 게시글', v[4], '']];
      var sync = (v[8].data || []).map(function(s){ return (s.kind === 'apply' ? '일정' : '기사') + ' ' + PGS.when(s.created_at) + ' (' + esc(s.note) + (s.rows_upserted != null ? ', ' + s.rows_upserted + '건' : '') + ')'; }).join(' / ');
      body().innerHTML = '<div class="adm-cards">' + cards.map(function(c){
        return '<a class="adm-card' + (c[3] ? ' warn' : '') + '" href="' + (c[2] ? '#' + c[2] : (c[0].indexOf('조인') >= 0 ? root + 'join.html' : root + 'board.html')) + '"><span>' + c[0] + '</span><b>' + c[1] + '</b></a>'; }).join('') + '</div>'
        + '<div class="card small"><p>전체 회원 <b>' + v[5] + '</b>명 · 기사 <b>' + v[6] + '</b>건 · 좌표 없는 구장 <b>' + v[7] + '</b>곳</p>'
        + '<p class="muted">최근 자동 가져오기: ' + (sync || '기록 없음') + '</p></div>';
    });
  }

  /* 승인 대기 (독자칼럼) */
  function pending(){
    sb.from('posts').select('id,title,body,author_id,created_at,image_url,status,admin_note').eq('board', 'column').in('status', ['pending','rejected']).order('created_at', { ascending: false }).then(function(r){
      var rows = r.data || [];
      PGS.nicks(rows.map(function(p){ return p.author_id; })).then(function(nk){
        var pend = rows.filter(function(p){ return p.status === 'pending'; }), rej = rows.filter(function(p){ return p.status === 'rejected'; });
        var h = pend.length ? pend.map(function(p){
          return '<div class="card adm-post" data-id="' + p.id + '"><div class="ev-top"><span class="tag pend">승인 대기</span><span class="muted small">' + esc(nk[p.author_id]) + ' · ' + PGS.when(p.created_at) + '</span></div>'
            + '<h3>' + esc(p.title) + '</h3><div class="adm-preview">' + (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="">' : '') + PGS.text(p.body) + '</div>'
            + '<div class="post-act"><button class="btn" data-pub="' + p.id + '">싣기</button><button class="btn line" data-rej="' + p.id + '">돌려보내기</button><a class="btn line" href="' + root + 'post.html?id=' + p.id + '">글 화면에서 보기</a></div><div class="rej-box"></div></div>'; }).join('')
          : '<p class="card muted">승인을 기다리는 칼럼이 없습니다.</p>';
        if (rej.length) h += '<h2 class="sec">돌려보낸 칼럼 <span>' + rej.length + '건</span></h2><ul class="posts">' + rej.map(function(p){ return '<li><a href="' + root + 'post.html?id=' + p.id + '"><strong>' + esc(p.title) + '</strong><span class="muted small">' + esc(nk[p.author_id]) + ' · ' + PGS.when(p.created_at) + (p.admin_note ? ' · 사유: ' + esc(p.admin_note) : '') + '</span></a></li>'; }).join('') + '</ul>';
        body().innerHTML = h;
      });
    });
  }

  /* 댓글 관리 */
  function comments(){
    sb.from('comments').select('id,target_type,target_id,body,author_id,created_at,is_hidden').order('created_at', { ascending: false }).limit(100).then(async function(r){
      var rows = r.data || [];
      var aIds = rows.filter(function(c){ return c.target_type === 'article'; }).map(function(c){ return c.target_id; });
      var pIds = rows.filter(function(c){ return c.target_type === 'post'; }).map(function(c){ return c.target_id; });
      var res = await Promise.all([PGS.nicks(rows.map(function(c){ return c.author_id; })),
        aIds.length ? sb.from('articles').select('id,title').in('id', aIds) : { data: [] },
        pIds.length ? sb.from('posts').select('id,title').in('id', pIds) : { data: [] }]);
      var nk = res[0], T = {};
      (res[1].data || []).forEach(function(a){ T['article' + a.id] = a.title; });
      (res[2].data || []).forEach(function(p){ T['post' + p.id] = p.title; });
      body().innerHTML = '<p class="muted small">최근 댓글 100개까지 보여 드립니다. 숨긴 댓글은 다른 사람에게 보이지 않습니다.</p>' + (rows.length ? '<ul class="cmts">' + rows.map(function(c){
        var href = root + (c.target_type === 'article' ? 'article.html' : 'post.html') + '?id=' + c.target_id;
        return '<li class="cmt' + (c.is_hidden ? ' hidden-c' : '') + '"><div class="cmt-top"><b>' + esc(nk[c.author_id]) + '</b><span class="muted small">' + PGS.when(c.created_at) + (c.is_hidden ? ' · 숨김' : '') + '</span>'
          + '<span class="cmt-act"><button data-hide="' + c.id + '" data-v="' + (c.is_hidden ? '0' : '1') + '">' + (c.is_hidden ? '보이기' : '숨기기') + '</button><button data-cdel="' + c.id + '">지우기</button></span></div>'
          + '<div class="cmt-body">' + PGS.text(c.body) + '</div><a class="small" href="' + href + '">' + (c.target_type === 'article' ? '기사' : '게시글') + ': ' + esc(T[c.target_type + c.target_id] || '(지워진 글)') + '</a></li>'; }).join('') + '</ul>' : '<p class="card muted">아직 댓글이 없습니다.</p>');
    });
  }

  /* 회원 */
  var MEM = [];
  function members(){
    sb.rpc('admin_members').then(function(r){
      if (r.error) { body().innerHTML = '<p class="form-msg err">회원 목록을 불러오지 못했습니다. (' + esc(r.error.message) + ')</p>'; return; }
      MEM = r.data || [];
      body().innerHTML = '<div class="board-top"><input id="mq" type="search" class="adm-search" placeholder="별명·이메일·휴대폰·지역으로 찾기"><span class="row"><button class="btn line" data-csv="email">뉴스레터 이메일 명단</button><button class="btn line" data-csv="kakao">뉴스레터 카카오톡 명단</button></span></div><div id="mlist"></div>';
      drawMembers('');
    });
  }
  function drawMembers(k){
    var L = MEM.filter(function(m){ return !k || [m.nickname, m.email, m.phone, m.region_sido, m.region_sigungu].join(' ').indexOf(k) >= 0; });
    var RN = { member: '일반', editor: '편집자', admin: '관리자' };
    document.getElementById('mlist').innerHTML = '<p class="muted small">' + L.length + '명 (전체 ' + MEM.length + '명)</p><div class="evs">' + L.map(function(m){
      var self = me.user && m.id === me.user.id;
      return '<div class="ev mem"><div class="ev-top"><span class="tag' + (m.role === 'member' ? ' pend' : '') + '">' + RN[m.role] + '</span>' + (m.confirmed ? '' : '<span class="reg">메일 확인 전</span>') + '<span class="ev-date">가입 ' + PGS.when(m.created_at) + '</span></div>'
        + '<strong>' + esc(m.nickname) + '</strong><div class="small">' + esc(m.email) + '</div>'
        + '<div class="small">' + (m.phone ? '<a class="pgtel" href="tel:' + m.phone.replace(/\D/g,'') + '">' + esc(m.phone) + '</a> · ' : '') + esc((m.region_sido || '') + ' ' + (m.region_sigungu || '')) + '</div>'
        + '<div class="small muted">뉴스레터 ' + ([m.newsletter_email ? '이메일' : '', m.newsletter_kakao ? '카카오톡' : ''].filter(Boolean).join('·') || '안 받음') + ' · 최근 로그인 ' + (m.last_sign_in_at ? PGS.when(m.last_sign_in_at) : '없음') + '</div>'
        + (self ? '<div class="small muted">본인 계정 (등급 변경 불가)</div>' : '<div class="row role-row">' + ['member','editor','admin'].map(function(r){ return '<button class="btn small-btn' + (m.role === r ? '' : ' line') + '" data-role="' + r + '" data-uid="' + m.id + '"' + (m.role === r ? ' disabled' : '') + '>' + RN[r] + '</button>'; }).join('') + '</div>')
        + '</div>'; }).join('') + '</div>';
  }
  function csv(kind){
    var L = MEM.filter(function(m){ return kind === 'email' ? m.newsletter_email : m.newsletter_kakao; });
    var head = kind === 'email' ? ['별명','이메일','지역','가입일'] : ['별명','휴대폰','지역','가입일'];
    var lines = [head].concat(L.map(function(m){ return [m.nickname, kind === 'email' ? m.email : (m.phone || ''), (m.region_sido || '') + ' ' + (m.region_sigungu || ''), (m.created_at || '').slice(0,10)]; }))
      .map(function(r){ return r.map(function(x){ return '"' + String(x == null ? '' : x).replace(/"/g,'""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8' }));
    a.download = '파크골프세계_뉴스레터_' + (kind === 'email' ? '이메일' : '카카오톡') + '_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  box.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) go(b.dataset.tab);
    if (b.dataset.pub) sb.from('posts').update({ status: 'published', admin_note: null }).eq('id', b.dataset.pub).then(function(){ pending(); badges(); });
    if (b.dataset.rej) {
      var rb = b.closest('.adm-post').querySelector('.rej-box');
      rb.innerHTML = '<div class="form wide"><label>돌려보내는 이유 (글쓴이에게만 보임)<textarea rows="2" maxlength="300" id="rj-' + b.dataset.rej + '"></textarea></label><span class="row"><button class="btn danger" data-rejok="' + b.dataset.rej + '">돌려보내기</button><button class="btn line" data-rejno="1">취소</button></span></div>';
    }
    if (b.dataset.rejno) b.closest('.rej-box').innerHTML = '';
    if (b.dataset.rejok) { var note = document.getElementById('rj-' + b.dataset.rejok).value.trim();
      sb.from('posts').update({ status: 'rejected', admin_note: note || null }).eq('id', b.dataset.rejok).then(function(){ pending(); badges(); }); }
    if (b.dataset.hide) sb.from('comments').update({ is_hidden: b.dataset.v === '1' }).eq('id', b.dataset.hide).then(comments);
    if (b.dataset.cdel) { var li = b.closest('li'); if (!li.querySelector('.cmt-ask')) li.insertAdjacentHTML('beforeend', '<div class="cmt-ask">이 댓글을 지울까요? <button data-cdelok="' + b.dataset.cdel + '">지우기</button><button data-cdelno="1">취소</button></div>'); }
    if (b.dataset.cdelno) b.closest('.cmt-ask').remove();
    if (b.dataset.cdelok) sb.from('comments').delete().eq('id', b.dataset.cdelok).then(comments);
    if (b.dataset.role) sb.rpc('admin_set_role', { uid: b.dataset.uid, r: b.dataset.role }).then(function(r){ if (r.error) { b.closest('.mem').insertAdjacentHTML('beforeend', '<p class="form-msg err">' + esc(r.error.message) + '</p>'); return; } members(); });
    if (b.dataset.csv) csv(b.dataset.csv);
  });
  box.addEventListener('input', function(e){ if (e.target.id === 'mq') drawMembers(e.target.value.trim()); });

  function route(){
    var tab = (location.hash || '#home').slice(1);
    if (!TABS.some(function(t){ return t[0] === tab; })) tab = 'home';
    shell(tab);
    ({ home: home, pending: pending, comments: comments, members: members })[tab]();
  }
  PGS.me().then(function(m){
    me = m || {};
    if (!me.user) { location.href = root + 'login.html?next=' + encodeURIComponent('admin/index.html'); return; }
    if (!me.profile || me.profile.role !== 'admin') { box.innerHTML = '<p class="card muted">관리자만 볼 수 있는 화면입니다.</p>'; return; }
    window.addEventListener('hashchange', route);
    route();
  });
})();
