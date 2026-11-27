// 전체 검색 (search.html?q=검색어)
// 2026-11-27 사용자 "기사검색에서 전체페이지를 검색할 수 있게 해줘. 예를 들어 대부도를 검색하면 맛집뿐만이 아니고 대회일정에 구장정보 뉴스에
// 전체메뉴에서 들어가 있는 것은 다 검색되게 해줘 항상": 머리글 검색창은 이 화면으로 오고, 모든 메뉴(대회 일정, 구장 정보, 뉴스, 맛집,
// 입문강좌, 오늘일정 뉴스 영상, 독자칼럼, 자유게시판, 조인게시판)에서 찾는다. 새 메뉴를 만들면 아래 SECTIONS에 꼭 같이 넣는다.
// 띄어쓴 낱말이 여러 개면 모두 들어간 것만 보여 줌. 유튜브는 홈페이지에 올리지 않고 재생목록 목록(json)의 링크만 씀.
(function(){
  var box = document.getElementById('search');
  if (!box || !window.sb) return;
  var root = document.body.getAttribute('data-root') || '';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var raw = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 40);
  var words = raw.split(/\s+/).map(function(w){ return w.replace(/[,()"'\\%_*:.]/g, ''); }).filter(function(w){ return w.length; }).slice(0, 4);
  var input = document.getElementById('sq'); if (input) input.value = raw;
  if (!words.length) { box.innerHTML = '<p class="card muted">찾을 낱말을 넣어 주세요. 예: 대부도, 접수, 맛집, 규칙</p>'; return; }
  document.title = raw + ' 검색 - 파크골프세계';

  var WD = ['일','월','화','수','목','금','토'];
  function kst(){ return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); }
  function ymd(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function md(s){ if (!s) return ''; var p = s.slice(0,10).split('-'); var d = new Date(+p[0], +p[1]-1, +p[2]); return (+p[1]) + '/' + (+p[2]) + '(' + WD[d.getDay()] + ')'; }
  function plain(h){ var t = document.createElement('div'); t.innerHTML = String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' '); return (t.textContent || '').replace(/\s+/g, ' ').trim(); }
  var RE = new RegExp('(' + words.map(function(w){ return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
  function hl(s){ return esc(s).replace(RE, '<mark>$1</mark>'); }
  function snip(text){
    text = String(text || ''); if (!text) return '';
    var i = text.search(RE); if (i < 0) return hl(text.slice(0, 90)) + (text.length > 90 ? '…' : '');
    var s = Math.max(0, i - 40), e = Math.min(text.length, i + 80);
    return (s > 0 ? '…' : '') + hl(text.slice(s, e)) + (e < text.length ? '…' : '');
  }
  function hasAll(s){ s = String(s || '').toLowerCase(); return words.every(function(w){ return s.indexOf(w.toLowerCase()) >= 0; }); }
  // 낱말마다 (열1 ilike 또는 열2 ilike …), 낱말끼리는 모두 만족
  function q(table, sel, cols){ var x = sb.from(table).select(sel); words.forEach(function(w){ x = x.or(cols.map(function(c){ return c + '.ilike.%' + w + '%'; }).join(',')); }); return x; }
  function js(u){ return fetch(root + u + '?t=' + Date.now()).then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; }); }
  function safe(p){ return Promise.resolve(p).then(function(r){ return r && r.error ? { data: [] } : r; }, function(){ return { data: [] }; }); }

  box.innerHTML = '<p class="muted">\'' + esc(raw) + '\' 찾는 중입니다…</p>';
  var today = ymd(kst());
  Promise.all([
    safe(q('events', 'id,kind,title,starts_on,ends_on,region,place,detail', ['title','place','detail','region']).order('starts_on', { ascending: false }).limit(300)),
    safe(q('venues', 'id,name,address,sido,sigungu,phone,note', ['name','address','sido','sigungu','note']).order('name').limit(300)),
    safe(q('articles', 'id,title,summary,category,published_at,body_html', ['title','summary','body_html','category']).eq('is_published', true).order('published_at', { ascending: false }).limit(300)),
    safe(q('posts', 'id,board,title,body,created_at,status', ['title','body']).eq('status', 'published').order('created_at', { ascending: false }).limit(200)),
    safe(q('joins', 'id,title,place,note,play_date,play_time', ['title','place','note']).order('play_date', { ascending: false }).limit(200)),
    js('assets/course.json'), js('assets/newsvideo.json')
  ]).then(function(v){
    var S = [];
    // 대회 일정: 다가오는(진행 중) 것 먼저 가까운 날 순, 지난 것은 최근 순
    var ev = (v[0].data || []).slice();
    var up = ev.filter(function(e){ return (e.ends_on || e.starts_on) >= today; }).sort(function(a, b){ return a.starts_on < b.starts_on ? -1 : 1; });
    var past = ev.filter(function(e){ return (e.ends_on || e.starts_on) < today; });
    S.push({ id: 'events', name: '대회 일정', more: root + 'schedule.html', items: up.concat(past).map(function(e){
      var d = md(e.starts_on) + (e.ends_on && e.ends_on !== e.starts_on ? ' ~ ' + md(e.ends_on) : '');
      return { href: root + 'schedule.html?d=' + e.starts_on + '&e=' + e.id, tag: e.kind || '일정', title: e.title, meta: d + (e.region ? ' · ' + e.region : '') + (e.place ? ' · ' + e.place : '') + ((e.ends_on || e.starts_on) < today ? ' · 지난 일정' : ''), sn: hasAll(e.title) ? '' : snip(e.detail || e.place) }; }) });
    S.push({ id: 'venues', name: '구장 정보', more: root + 'venues.html', items: (v[1].data || []).map(function(x){
      return { href: root + 'venues.html?q=' + encodeURIComponent(x.name), tag: '구장', title: x.name, meta: [x.sido, x.sigungu].filter(Boolean).join(' ') + (x.address ? ' · ' + x.address : '') + (x.phone ? ' · ' + x.phone : ''), sn: x.note && !hasAll(x.name + ' ' + (x.address || '')) ? snip(x.note) : '' }; }) });
    var arts = v[2].data || [];
    function artItem(a){ return { href: root + 'article.html?id=' + a.id, tag: a.category || '기사', title: a.title, meta: a.published_at ? md(a.published_at.slice(0,10)) + ' ' + a.published_at.slice(0,4) : '', sn: hasAll(a.title) ? (a.summary ? snip(a.summary) : '') : snip(plain(a.summary) + ' ' + plain(a.body_html)) }; }
    S.push({ id: 'news', name: '뉴스', more: root + 'news.html', items: arts.filter(function(a){ return a.category !== '맛집'; }).map(artItem) });
    S.push({ id: 'matjip', name: '맛집', more: root + 'news.html?c=' + encodeURIComponent('맛집'), items: arts.filter(function(a){ return a.category === '맛집'; }).map(artItem) });
    function vids(d, name, href){ return ((d && d.videos) || []).filter(function(x){ return hasAll(x.title + ' ' + (x.desc || '')); }).map(function(x){ return { href: href ? href + '?v=' + encodeURIComponent(x.id) : null, yt: x.id, tag: name, title: String(x.title || '').replace(/^\[[^\]]*\]\s*/, ''), meta: (String(x.title).match(/^\[[^\]]*\]/) || [''])[0] + (x.published ? ' · ' + md(x.published.slice(0,10)) : ''), sn: snip(x.desc) }; }); }
    S.push({ id: 'course', name: '입문강좌', more: root + 'course.html', items: vids(v[5], '입문강좌', root + 'course.html') });
    S.push({ id: 'nvideo', name: '오늘일정 뉴스 영상', more: root + 'news.html', items: vids(v[6], '영상', null) });
    var posts = v[3].data || [];
    function postItem(p){ return { href: root + 'post.html?id=' + p.id, tag: p.board === 'column' ? '칼럼' : '자유', title: p.title, meta: md(p.created_at.slice(0,10)), sn: snip(String(p.body || '').replace(/^\[\[img:[^\]]*\]\]\s*$/gm, ' ')) }; }
    S.push({ id: 'column', name: '독자칼럼', more: root + 'column.html', items: posts.filter(function(p){ return p.board === 'column'; }).map(postItem) });
    S.push({ id: 'board', name: '자유게시판', more: root + 'board.html', items: posts.filter(function(p){ return p.board !== 'column'; }).map(postItem) });
    S.push({ id: 'join', name: '조인게시판', more: root + 'join.html', items: (v[4].data || []).map(function(j){ return { href: root + 'join.html?id=' + j.id, tag: '조인', title: j.title || j.place, meta: md(j.play_date) + (j.play_time ? ' ' + String(j.play_time).slice(0,5) : '') + (j.place ? ' · ' + j.place : ''), sn: j.note ? snip(j.note) : '' }; }) });

    var total = S.reduce(function(n, s){ return n + s.items.length; }, 0);
    var h = '<p class="srch-sum">\'<b>' + esc(raw) + '</b>\' 전체 검색 결과 <b>' + total + '</b>건</p>';
    h += '<div class="chips srch-chips">' + S.filter(function(s){ return s.items.length; }).map(function(s){ return '<a href="#s-' + s.id + '">' + s.name + ' ' + s.items.length + '</a>'; }).join('') + '</div>';
    if (!total) h += '<p class="card muted">찾는 낱말이 들어간 글이 없습니다. 낱말을 줄이거나 다른 말로 찾아 보세요.</p>';
    S.forEach(function(s){
      if (!s.items.length) return;
      h += '<section class="srch-sec" id="s-' + s.id + '"><h2 class="sec">' + s.name + ' <span>' + s.items.length + '건</span></h2><ul class="srch-list">'
        + s.items.map(function(it, i){
          var href = it.href || ('https://youtu.be/' + it.yt);
          return '<li' + (i >= 5 ? ' class="srch-more" hidden' : '') + '><a href="' + esc(href) + '">'
            + (it.yt ? '<img src="https://i.ytimg.com/vi/' + esc(it.yt) + '/mqdefault.jpg" alt="" loading="lazy">' : '')
            + '<span class="srch-txt"><span class="tag">' + esc(it.tag) + '</span> <strong>' + hl(it.title || '(제목 없음)') + '</strong>'
            + (it.meta ? '<span class="srch-meta">' + hl(it.meta) + '</span>' : '')
            + (it.sn ? '<span class="srch-sn">' + it.sn + '</span>' : '') + '</span></a></li>'; }).join('') + '</ul>'
        + (s.items.length > 5 ? '<button class="btn line srch-btn" data-sec="' + s.id + '">' + s.name + ' ' + (s.items.length - 5) + '건 더 보기</button>' : '')
        + '</section>';
    });
    box.innerHTML = h;
    box.addEventListener('click', function(ev){
      var b = ev.target.closest('.srch-btn'); if (!b) return;
      document.querySelectorAll('#s-' + b.getAttribute('data-sec') + ' .srch-more').forEach(function(li){ li.hidden = false; });
      b.remove();
    });
  });
})();
