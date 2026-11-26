// 관리자 화면: 오늘 요약 / 승인 대기 / 댓글 관리 / 회원
(function(){
  if (!window.sb) return;
  var root = PGS.root, esc = PGS.esc, box = document.getElementById('admin');
  var TABS = [['home','오늘 요약'],['pending','승인 대기'],['comments','댓글 관리'],['members','회원'],['venues','구장'],['stats','통계'],['settings','설정']];
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
            + '<h3>' + esc(p.title) + '</h3><div class="adm-preview">' + (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="">' : '') + PGS.postHtml(p.body) + '</div>'
            + '<div class="post-act"><button class="btn" data-pub="' + p.id + '">싣기</button><button class="btn line" data-rej="' + p.id + '">돌려보내기</button><a class="btn line" href="' + root + 'post.html?id=' + p.id + '">글 화면에서 보기</a></div><div class="rej-box"></div></div>'; }).join('')
          : '<p class="card muted">승인을 기다리는 칼럼이 없습니다.</p>';
        if (rej.length) h += '<h2 class="sec">돌려보낸 칼럼 <span>' + rej.length + '건</span></h2><ul class="posts">' + rej.map(function(p){ return '<li><a href="' + root + 'post.html?id=' + p.id + '"><strong>' + esc(p.title) + '</strong><span class="muted small">' + esc(nk[p.author_id]) + ' · ' + PGS.when(p.created_at) + (p.admin_note ? ' · 사유: ' + esc(p.admin_note) : '') + '</span></a></li>'; }).join('') + '</ul>';
        body().innerHTML = h;
      });
    });
  }

  /* 댓글 관리 */
  function comments(){
    sb.from('comments').select('id,target_type,target_id,body,author_id,author_name,created_at,is_hidden').order('created_at', { ascending: false }).limit(100).then(async function(r){
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
        return '<li class="cmt' + (c.is_hidden ? ' hidden-c' : '') + '"><div class="cmt-top"><b>' + esc(c.author_name || nk[c.author_id]) + '</b><span class="muted small">' + PGS.when(c.created_at) + (c.is_hidden ? ' · 숨김' : '') + '</span>'
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
    if (b.dataset.vonly) { vst.only = b.dataset.vonly; venues(); }
    if (b.dataset.vnew) editVenue(null);
    if (b.dataset.vedit) editVenue(VEN.filter(function(v){ return String(v.id) === b.dataset.vedit; })[0]);
    if (b.dataset.days) { sdays = Number(b.dataset.days); stats(); }
  });
  box.addEventListener('input', function(e){ if (e.target.id === 'mq') drawMembers(e.target.value.trim()); if (e.target.id === 'vq2') { vst.k = e.target.value; drawVenues(); } });

  /* ---- 구장 ---- */
  var GEO = 'https://rzteighnvqroxuqqwhov.supabase.co/functions/v1/geo';
  var SIDO = ['강원','경기','경남','경북','광주','대구','대전','부산','서울','세종','울산','인천','전남','전북','제주','충남','충북'];
  function geo(qs){ return fetch(GEO, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'geo', q: qs }) }).then(function(r){ return r.json(); }).catch(function(){ return {}; }); }
  // 지도에서 눌러 위치 고르기 (OpenStreetMap 지도 조각, 직접 그림)
  function pickMap(el, lat, lng, onPick){
    var z = lat ? 16 : 7, c = { lat: lat || 36.3, lng: lng || 127.8 }, pin = lat ? { lat: lat, lng: lng } : null;
    function X(o, zz){ return (o + 180) / 360 * 256 * Math.pow(2, zz); }
    function Y(a, zz){ var s = Math.sin(a * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, zz); }
    function LNG(x, zz){ return x / (256 * Math.pow(2, zz)) * 360 - 180; }
    function LAT(y, zz){ var n = Math.PI - 2 * Math.PI * y / (256 * Math.pow(2, zz)); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
    el.innerHTML = '<div class="pm-zoom"><button type="button" data-z="1">+</button><button type="button" data-z="-1">−</button></div><div class="pm-attr">© OpenStreetMap contributors</div><div class="pm-tiles"></div>';
    var tl = el.querySelector('.pm-tiles');
    function draw(){
      var W = el.clientWidth, H = el.clientHeight, cx = X(c.lng, z), cy = Y(c.lat, z), L = cx - W / 2, T = cy - H / 2, n = Math.pow(2, z), h = '';
      for (var tx = Math.floor(L / 256); tx <= Math.floor((L + W) / 256); tx++) for (var ty = Math.floor(T / 256); ty <= Math.floor((T + H) / 256); ty++) {
        if (ty < 0 || ty >= n) continue;
        h += '<img src="https://tile.openstreetmap.org/' + z + '/' + (((tx % n) + n) % n) + '/' + ty + '.png" style="left:' + (tx * 256 - L) + 'px;top:' + (ty * 256 - T) + 'px" alt="">';
      }
      if (pin) h += '<div class="pm-pin" style="left:' + (X(pin.lng, z) - L) + 'px;top:' + (Y(pin.lat, z) - T) + 'px"></div>';
      tl.innerHTML = h;
    }
    var drag = null;
    el.addEventListener('pointerdown', function(e){ if (e.target.closest('.pm-zoom')) return; drag = { x: e.clientX, y: e.clientY, cx: X(c.lng, z), cy: Y(c.lat, z), moved: false }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function(e){ if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { c = { lng: LNG(drag.cx - dx, z), lat: LAT(drag.cy - dy, z) }; draw(); } });
    el.addEventListener('pointerup', function(e){
      if (!drag) return; var d = drag; drag = null; if (d.moved) return;
      var r = el.getBoundingClientRect(), L = X(c.lng, z) - el.clientWidth / 2, T = Y(c.lat, z) - el.clientHeight / 2;
      pin = { lng: +LNG(L + e.clientX - r.left, z).toFixed(7), lat: +LAT(T + e.clientY - r.top, z).toFixed(7) }; draw(); onPick(pin);
    });
    el.addEventListener('wheel', function(e){ e.preventDefault(); z = Math.max(5, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))); draw(); }, { passive: false });
    el.querySelector('.pm-zoom').addEventListener('click', function(e){ var b = e.target.closest('button'); if (!b) return; z = Math.max(5, Math.min(19, z + Number(b.dataset.z))); draw(); });
    draw();
    return { set: function(a, o, keepZoom){ pin = { lat: a, lng: o }; c = { lat: a, lng: o }; if (!keepZoom) z = 16; draw(); }, center: function(a, o, zz){ c = { lat: a, lng: o }; z = zz || 12; draw(); } };
  }
  var VEN = [], vst = { only: 'nocoord', s: '', k: '' };
  function venues(){
    sb.from('venues').select('id,name,sido,sigungu,address,map_address,phone,operator,built,note,lat,lng,source').order('sido').order('sigungu').order('name').limit(2000).then(function(r){
      VEN = r.data || [];
      body().innerHTML = '<div class="board-top"><span class="row"><button class="btn small-btn' + (vst.only === 'nocoord' ? '' : ' line') + '" data-vonly="nocoord">좌표 없음 ' + VEN.filter(function(v){ return !v.lat; }).length + '</button><button class="btn small-btn' + (vst.only === 'all' ? '' : ' line') + '" data-vonly="all">전체 ' + VEN.length + '</button></span>'
        + '<input id="vq2" type="search" class="adm-search" placeholder="구장 이름·지역 찾기" value="' + esc(vst.k) + '"><button class="btn" data-vnew="1">새 구장 추가</button></div><div id="vedit"></div><div id="vlist" class="card"></div>';
      drawVenues();
    });
  }
  function drawVenues(){
    var k = vst.k.trim();
    var L = VEN.filter(function(v){ return (vst.only === 'all' || !v.lat) && (!k || (v.name + ' ' + v.sido + ' ' + v.sigungu).indexOf(k) >= 0); });
    document.getElementById('vlist').innerHTML = '<p class="muted small">' + L.length + '곳</p>' + L.slice(0, 200).map(function(v){
      return '<div class="vrow"><span><b>' + esc(v.name) + '</b> <span class="muted small">' + esc(v.sido + ' ' + v.sigungu) + (v.lat ? ' · 좌표 있음' : ' · <span style="color:#c0392b">좌표 없음</span>') + '</span></span><button class="btn line small-btn" data-vedit="' + v.id + '">고치기</button></div>'; }).join('')
      + (L.length > 200 ? '<p class="muted small">200곳까지 보여 드립니다. 검색으로 좁혀 주세요.</p>' : '');
  }
  function editVenue(v){
    v = v || { id: null, name: '', sido: '', sigungu: '', address: '', phone: '', operator: '', built: '', note: '', lat: null, lng: null };
    var ed = document.getElementById('vedit');
    ed.innerHTML = '<form class="card form wide" id="vf"><b>' + (v.id ? '구장 고치기' : '새 구장 추가') + '</b>'
      + '<label>구장 이름<input name="name" required maxlength="80"></label>'
      + '<div class="grid2"><label>시·도<select name="sido" required><option value="">선택</option>' + SIDO.map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></label><label>시·군·구<input name="sigungu" required maxlength="30"></label></div>'
      + '<label>주소<input name="address" maxlength="150"></label>'
      + '<div class="grid2"><label>전화<input name="phone" maxlength="20"></label><label>관리주체<input name="operator" maxlength="60"></label></div>'
      + '<div class="grid2"><label>준공<input name="built" maxlength="20"></label><label>비고<input name="note" maxlength="60"></label></div>'
      + '<b>위치</b><div class="row"><input name="gq" placeholder="찾을 이름이나 주소"><button type="button" class="btn line" id="vfind">위치 찾기</button></div><p class="muted small" id="vfmsg">지도를 끌어 옮기고, 구장 자리를 한 번 누르면 빨간 표시가 찍힙니다. 바퀴나 +, − 로 확대합니다.</p>'
      + '<div class="pick-map" id="pm"></div>'
      + '<div class="grid2"><label>위도<input name="lat" inputmode="decimal"></label><label>경도<input name="lng" inputmode="decimal"></label></div>'
      + '<div class="row"><button class="btn" type="submit">저장</button><a class="btn line" id="vnaver" href="#">네이버 지도에서 확인</a><button type="button" class="btn line" id="vclose">닫기</button>' + (v.id ? '<button type="button" class="btn danger" id="vdel">지우기</button>' : '') + '</div><div id="vmsg"></div></form>';
    var f = document.getElementById('vf');
    ['name','sido','sigungu','address','phone','operator','built','note','lat','lng'].forEach(function(k){ if (v[k] != null) f[k].value = v[k]; });
    f.gq.value = (v.sigungu ? v.sigungu + ' ' : '') + v.name;
    function naverHref(){ document.getElementById('vnaver').href = f.lat.value && f.lng.value ? 'https://map.naver.com/p/search/' + encodeURIComponent(f.name.value) + '?c=' + f.lng.value + ',' + f.lat.value + ',17,0,0,0,dh' : 'https://map.naver.com/p/search/' + encodeURIComponent((f.sigungu.value + ' ' + f.name.value).trim()); }
    naverHref(); f.name.oninput = naverHref;
    var map = pickMap(document.getElementById('pm'), v.lat, v.lng, function(p){ f.lat.value = p.lat; f.lng.value = p.lng; naverHref(); });
    if (!v.lat && v.sigungu) geo(v.sido + ' ' + v.sigungu).then(function(j){ if (j && j.lat) map.center(j.lat, j.lng, 12); });
    function setLL(){ var a = parseFloat(f.lat.value), o = parseFloat(f.lng.value); if (isFinite(a) && isFinite(o)) { map.set(a, o, true); naverHref(); } }
    f.lat.onchange = setLL; f.lng.onchange = setLL;
    document.getElementById('vfind').onclick = function(){
      var m = document.getElementById('vfmsg'); m.textContent = '찾는 중입니다…';
      geo(f.gq.value.trim()).then(function(j){
        if (j && j.ok && !j.none && j.lat) { f.lat.value = j.lat; f.lng.value = j.lng; map.set(j.lat, j.lng); naverHref(); if (!f.address.value && j.addr) f.address.value = j.addr; m.textContent = '찾았습니다: ' + (j.n || '') + ' ' + (j.addr || '') + ' (자리가 맞는지 지도로 확인해 주세요)'; }
        else m.textContent = '찾지 못했습니다. 다른 이름이나 주소로 찾거나, 지도에서 직접 눌러 주세요.';
      });
    };
    document.getElementById('vclose').onclick = function(){ ed.innerHTML = ''; };
    var del = document.getElementById('vdel');
    if (del) del.onclick = function(){ document.getElementById('vmsg').innerHTML = '<p class="form-msg err">이 구장을 지울까요? (조인글에 연결된 구장은 지울 수 없습니다)</p><button type="button" class="btn danger" id="vdelok">지우기</button>';
      document.getElementById('vdelok').onclick = function(){ sb.from('venues').delete().eq('id', v.id).then(function(r){ if (r.error) document.getElementById('vmsg').innerHTML = '<p class="form-msg err">지우지 못했습니다. (' + esc(r.error.message) + ')</p>'; else venues(); }); }; };
    f.onsubmit = function(e){
      e.preventDefault();
      var a = parseFloat(f.lat.value), o = parseFloat(f.lng.value);
      var row = { name: f.name.value.trim(), sido: f.sido.value, sigungu: f.sigungu.value.trim(), address: f.address.value.trim() || null, phone: f.phone.value.trim() || null,
        operator: f.operator.value.trim() || null, built: f.built.value.trim() || null, note: f.note.value.trim() || null,
        lat: isFinite(a) ? a : null, lng: isFinite(o) ? o : null, updated_at: new Date().toISOString() };
      if (row.lat !== null && (row.lat < 33 || row.lat > 39 || row.lng < 124 || row.lng > 132)) { document.getElementById('vmsg').innerHTML = '<p class="form-msg err">좌표가 대한민국 밖입니다. 다시 확인해 주세요.</p>'; return; }
      var p = v.id ? sb.from('venues').update(row).eq('id', v.id) : sb.from('venues').insert(Object.assign({ source: 'manual' }, row));
      p.then(function(r){ if (r.error) { document.getElementById('vmsg').innerHTML = '<p class="form-msg err">저장하지 못했습니다. (' + esc(r.error.message) + ')</p>'; return; } document.getElementById('vmsg').innerHTML = '<p class="form-msg ok">저장했습니다.</p>';
        sb.from('venues').select('id,name,sido,sigungu,address,map_address,phone,operator,built,note,lat,lng,source').order('sido').order('sigungu').order('name').limit(2000).then(function(x){ VEN = x.data || VEN; drawVenues(); }); });
    };
    ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---- 통계 ---- */
  var sdays = 7;
  function stats(){
    sb.rpc('admin_stats', { days: sdays }).then(async function(r){
      if (r.error) { body().innerHTML = '<p class="form-msg err">통계를 불러오지 못했습니다.</p>'; return; }
      var s = r.data, daily = s.daily || [], max = Math.max.apply(null, daily.map(function(d){ return d.uv; }).concat([1]));
      var h = '<div class="chips">' + [[7,'7일'],[30,'30일'],[90,'90일']].map(function(d){ return '<button data-days="' + d[0] + '"' + (sdays === d[0] ? ' class="on"' : '') + '>' + d[1] + '</button>'; }).join('') + '</div>';
      // 2026-11-27 사용자 "날짜별 방문은 한사람이 두번들어와도 한번으로": 날짜별·들어온 곳·기기를 모두 '한 사람 하루 1번' 방문으로 셈 (admin_stats 014)
      var visits = s.total.visits != null ? s.total.visits : s.total.pv;
      h += '<div class="adm-cards"><div class="adm-card"><span>방문</span><b>' + visits + '</b></div><div class="adm-card"><span>방문자 (기기)</span><b>' + s.total.uv + '</b></div><div class="adm-card"><span>화면 열람</span><b>' + s.total.pv + '</b></div></div>';
      // 2026-11-27 사용자 "날짜별 방문은 페이지뷰옆에 실방문자챠트를 추가로": 날짜별 페이지뷰 차트와 실방문자(한 사람 하루 1번) 차트를 나란히 (휴대폰은 위아래)
      function vchart(id, key, title, note, unit, cls){
        var mx = Math.max.apply(null, daily.map(function(d){ return d[key]; }).concat([1]));
        var bw = Math.max(26, String(mx).length * 9 + 10); // 칸 너비를 숫자 자릿수에 맞춰 겹치지 않게
        return '<div class="card"><b>' + title + '</b> <span class="muted small">' + note + '</span>' + (daily.length ? '<div class="vbars' + (cls ? ' ' + cls : '') + '" id="' + id + '">' + daily.map(function(d, i){ var dd = d.d.slice(8), lab = (i === 0 || dd === '01') ? (+d.d.slice(5, 7)) + '/' + (+dd) : String(+dd);
          return '<div class="vcol" style="min-width:' + bw + 'px" title="' + d.d + ' ' + title.replace('날짜별 ', '') + ' ' + d[key] + unit + '"><em>' + d[key] + '</em><i style="height:' + Math.max(2, Math.round(d[key] / mx * 150)) + 'px"></i><span>' + lab + '</span></div>'; }).join('') + '</div>' : '<p class="muted small">아직 기록이 없습니다.</p>') + '</div>';
      }
      h += '<div class="grid2 vgrid">' + vchart('vbars-pv', 'pv', '날짜별 페이지뷰', '누른 화면 수', '번', 'pv') + vchart('vbars', 'uv', '날짜별 실방문자', '한 사람이 그날 여러 번 들어와도 1명', '명', '') + '</div>';
      h += '<div class="grid2"><div class="card"><b>많이 본 화면</b> <span class="muted small">화면 열람 수</span><table class="stat-tbl">' + (s.pages || []).map(function(p){ return '<tr><td><a href="' + root.replace(/\/$/, '') + p.path + '">' + esc((p.title || p.path).replace(/ - 파크골프세계$/, '')) + '</a></td><td class="n">' + p.pv + '</td></tr>'; }).join('') + '</table></div>'
        + '<div class="card"><b>들어온 곳</b> <span class="muted small">방문 기준 (그날 처음 들어온 곳)</span><table class="stat-tbl">' + (s.refs || []).map(function(x){ return '<tr><td>' + esc(x.host) + '</td><td class="n">' + x.n + '</td></tr>'; }).join('') + '</table><b>기기</b> <span class="muted small">방문 기준</span><table class="stat-tbl">' + (s.devices || []).map(function(x){ return '<tr><td>' + esc(x.device) + '</td><td class="n">' + x.n + '</td></tr>'; }).join('') + '</table></div></div>';
      h += '<p class="muted small">방문 = 한 사람(기기)이 하루에 여러 번 들어와도 1번. 방문자 = 기간 중 같은 사람은 1명. 화면 열람 = 누른 화면 수.</p>';
      h += '<p class="muted small">IP 주소와 회원 정보는 남기지 않습니다. 방문 기록은 1년 뒤 자동으로 지워집니다.</p>';
      body().innerHTML = h;
      if (!document.getElementById('vbars-css2')) { var st = document.createElement('style'); st.id = 'vbars-css2';
        st.textContent = '.vbars{display:flex;align-items:flex-end;gap:4px;overflow-x:auto;padding:24px 2px 2px;margin-top:8px}'
          + '.vbars .vcol{flex:1 0 auto;display:flex;flex-direction:column;align-items:stretch;text-align:center}'
          + '.vbars .vcol em{font-style:normal;font-size:12px;line-height:16px;color:var(--text,#222);font-weight:600;white-space:nowrap;margin-bottom:3px}'
          + '.vbars .vcol i{display:block;background:var(--main);border-radius:3px 3px 0 0}.vbars.pv .vcol i{opacity:.45}.vgrid{align-items:start}.vgrid>.card{margin:0}'
          + '.vbars .vcol span{font-size:11px;line-height:20px;color:var(--sub);border-top:1px solid var(--line);white-space:nowrap}';
        document.head.appendChild(st); }
      ['vbars', 'vbars-pv'].forEach(function(id){ var vb = document.getElementById(id); if (vb) vb.scrollLeft = vb.scrollWidth; }); // 가장 최근 날짜가 보이게
    });
  }

  /* ---- 설정 ---- */
  function settings(){
    sb.from('site_settings').select('key,value').then(function(r){
      var s = {}; (r.data || []).forEach(function(x){ s[x.key] = x.value || ''; });
      body().innerHTML = '<form class="card form wide" id="sf"><b>맨 위 공지 띠</b><p class="muted small">적으면 모든 화면 맨 위에 노란 띠로 보입니다. 비우면 사라집니다.</p>'
        + '<label>공지 문구<input name="notice" maxlength="120"></label><label>누르면 갈 주소 (선택)<input name="notice_link" maxlength="300" placeholder="예: https://parkgolfsegye.co.kr/news.html"></label>'
        + '<button class="btn" type="submit">저장</button><div id="sfm"></div></form>';
      var f = document.getElementById('sf'); f.notice.value = s.notice || ''; f.notice_link.value = s.notice_link || '';
      f.onsubmit = function(e){ e.preventDefault();
        sb.from('site_settings').upsert([{ key: 'notice', value: f.notice.value.trim(), updated_at: new Date().toISOString() }, { key: 'notice_link', value: f.notice_link.value.trim(), updated_at: new Date().toISOString() }]).then(function(x){
          document.getElementById('sfm').innerHTML = x.error ? '<p class="form-msg err">저장하지 못했습니다.</p>' : '<p class="form-msg ok">저장했습니다. 다른 화면을 새로 열면 보입니다.</p>'; }); };
    });
  }

  function route(){
    var tab = (location.hash || '#home').slice(1);
    if (!TABS.some(function(t){ return t[0] === tab; })) tab = 'home';
    shell(tab);
    ({ home: home, pending: pending, comments: comments, members: members, venues: venues, stats: stats, settings: settings })[tab]();
  }
  PGS.me().then(function(m){
    me = m || {};
    if (!me.user) { location.href = root + 'login.html?next=' + encodeURIComponent('admin/index.html'); return; }
    if (!me.profile || me.profile.role !== 'admin') { box.innerHTML = '<p class="card muted">관리자만 볼 수 있는 화면입니다.</p>'; return; }
    window.addEventListener('hashchange', route);
    route();
  });
})();
