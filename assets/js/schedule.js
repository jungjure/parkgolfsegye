// 대회 일정 화면 (schedule.html) + 첫 화면 오늘 일정 요약 (index.html)
// 데이터: Supabase events 표 (parkgolfnews.org 일정에서 매시간 자동으로 가져옴)
(function(){
  var box = document.getElementById('sched');
  if (!box || !window.sb) { if (box) box.innerHTML = '<p class="muted">일정을 불러올 수 없습니다.</p>'; return; }
  var compact = box.getAttribute('data-compact') === '1';
  var root = document.body.getAttribute('data-root') || '';
  var KINDS = ['대회','연습라운딩','접수'];
  var WD = ['일','월','화','수','목','금','토'];

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function kst(){ return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); }
  function ymd(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function parse(s){ var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function add(d, n){ var x = new Date(d); x.setDate(x.getDate()+n); return x; }
  function label(s){ var d = parse(s); return (d.getMonth()+1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')'; }
  function short(s){ var d = parse(s); return (d.getMonth()+1) + '/' + d.getDate(); }

  var q = new URLSearchParams(location.search);
  var st = { v: compact ? 'today' : (q.get('v') || 'today'), d: q.get('d') || ymd(kst()), k: q.get('k') || '', r: q.get('r') || '' };

  function range(){
    var d = parse(st.d);
    if (st.v === 'week') { var mon = add(d, -((d.getDay()+6)%7)); return [ymd(mon), ymd(add(mon,6))]; }
    if (st.v === 'month') { return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(new Date(d.getFullYear(), d.getMonth()+1, 0))]; }
    return [st.d, st.d];
  }
  function title(){
    var r = range(), d = parse(st.d);
    if (st.v === 'week') return label(r[0]) + ' ~ ' + label(r[1]);
    if (st.v === 'month') return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월';
    return label(st.d) + (st.d === ymd(kst()) ? ' 오늘' : '');
  }
  function move(n){
    var d = parse(st.d);
    if (st.v === 'week') d = add(d, 7*n);
    else if (st.v === 'month') d = new Date(d.getFullYear(), d.getMonth()+n, 1);
    else d = add(d, n);
    st.d = ymd(d); load();
  }
  function saveUrl(){
    if (compact) return;
    var p = new URLSearchParams();
    if (st.v !== 'today') p.set('v', st.v);
    if (st.d !== ymd(kst())) p.set('d', st.d);
    if (st.k) p.set('k', st.k);
    if (st.r) p.set('r', st.r);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  // 해외 장소는 구글 지도로 보여 줌 (2026-11-27 사용자 "해외는 구글지도를 연결해서 보여줘")
  var ABROAD = /중국|일본|태국|베트남|하이난|웨이하이|오키나와|해외|필리핀|라오스|캄보디아|몽골|대만|타이완|말레이시아|인도네시아|싱가포르|괌|사이판|호주|뉴질랜드|미국|캐나다|하와이|홋카이도|후쿠오카|오사카|도쿄|규슈|큐슈|다낭|나트랑|하노이|호치민|푸꾸옥|파타야|방콕|치앙마이|나콘사완|칭다오|청도|상하이|베이징|대련|다롄|하얼빈|연태|옌타이|세부|클락|마닐라|비엔티안|울란바토르/;
  function googleMap(place){
    var parts = place.split(/\s*\/\s*/), q = parts.filter(function(s){ return ABROAD.test(s); })[0] || place;
    q = q.replace(/\s*[(（][^)）]*(출발|집결|공항|터미널|이용|훼리|카운터)[^)）]*[)）]/g, '').replace(/\s*(출발|도착|일원|일대)\s*$/, '').trim();
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  function placeLinks(e){
    if (!e.place) return '';
    if (/온라인|전화 ?접수|홈페이지/.test(e.place)) return '<div class="ev-place">' + esc(e.place) + '</div>';
    if (ABROAD.test(e.place)) return '<div class="ev-place">' + esc(e.place)
      + ' <a class="mapbtn gg" href="' + esc(googleMap(e.place)) + '">구글 지도</a></div>';
    var m = e.place.match(/^(.+?)\s*\((.+)\)\s*$/);
    var vv = venueOf(e.place);
    var base = vv ? root + 'place.html?n=' + encodeURIComponent(vv.name) + '&lat=' + vv.lat + '&lng=' + vv.lng
      : root + 'place.html?n=' + encodeURIComponent(m ? m[1] : e.place) + (m ? '&a=' + encodeURIComponent(m[2]) : '');
    return '<div class="ev-place">' + esc(e.place)
      + ' <a class="mapbtn nv" href="' + base + '&go=naver">네이버</a>'
      + '<a class="mapbtn kk" href="' + base + '&go=kakao">카카오</a></div>';
  }
  function dateText(e){
    if (e.ends_on && e.ends_on !== e.starts_on) return short(e.starts_on) + ' ~ ' + short(e.ends_on);
    return short(e.starts_on);
  }
  function card(e){
    var tag = e.kind === '연습라운딩' ? '연습' : e.kind;
    var right = e.kind === '접수' ? ('마감 ' + short(e.ends_on || e.starts_on)) : dateText(e);
    return '<div class="ev k-' + esc(e.kind) + '">'
      + '<div class="ev-top"><span class="tag">' + esc(tag) + '</span>'
      + (e.region ? '<span class="reg">' + esc(e.region) + '</span>' : '')
      + '<span class="ev-date">' + right + '</span></div>'
      + '<a href="#" class="ev-title" data-id="' + e.id + '">' + esc(e.title) + '</a>'
      + placeLinks(e)
      + '</div>';
  }

  var rows = [], VEN = [];
  var OPEN = compact ? null : q.get('e');   // search.html 등에서 schedule.html?d=날짜&e=일정번호 로 오면 그 일정 자세히 보기 창을 바로 엶 (2026-11-27)
  // 구장 표의 좌표: 장소 글자에 구장 이름이 들어 있으면 그 좌표로 길안내
  function norm(s){ return String(s || '').replace(/\s+/g, ''); }
  function venueOf(place){
    var p = norm(place), best = null;
    VEN.forEach(function(v){ var n = norm(v.name); if (n.replace(/(파크골프장|파크골프구장|파크골프|구장)$/, '').length < 2) return;   // '파크골프장'처럼 이름만 흔한 구장은 엉뚱한 곳으로 가므로 제외 (2026-11-27)
      if (n.length >= 4 && p.indexOf(n) >= 0 && (!best || n.length > norm(best.name).length)) best = v; });
    return best;
  }
  function render(){
    var list = rows.filter(function(e){ return (!st.k || e.kind === st.k) && (!st.r || e.region === st.r); });
    var regions = [];
    rows.forEach(function(e){ if (e.region && regions.indexOf(e.region) < 0) regions.push(e.region); });
    regions.sort();
    var h = '';
    if (!compact) {
      h += '<div class="sch-tabs">' + [['today','하루'],['week','주간'],['month','월간']].map(function(t){
        return '<button data-v="' + t[0] + '"' + (st.v === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div>';
      h += '<div class="sch-nav"><button data-m="-1">◀</button><strong>' + title() + '</strong><button data-m="1">▶</button>'
        + (st.d !== ymd(kst()) ? '<button data-today="1" class="small">오늘로</button>' : '') + '</div>';
      h += '<div class="chips">' + [''].concat(KINDS).map(function(k){
        return '<button data-k="' + k + '"' + (st.k === k ? ' class="on"' : '') + '>' + (k || '전체') + '</button>'; }).join('') + '</div>';
      if (regions.length) h += '<div class="chips reg-chips">' + [''].concat(regions).map(function(r){
        return '<button data-r="' + esc(r) + '"' + (st.r === r ? ' class="on"' : '') + '>' + (r ? esc(r) : '전 지역') + '</button>'; }).join('') + '</div>';
    }
    var games = list.filter(function(e){ return e.kind !== '접수'; });
    var regs = list.filter(function(e){ return e.kind === '접수'; })
      .sort(function(a,b){ return (a.ends_on || a.starts_on) < (b.ends_on || b.starts_on) ? -1 : 1; });
    if (!list.length) h += '<p class="muted card">이 기간에 등록된 일정이 없습니다.</p>';
    if (games.length) {
      if (st.v === 'today' || compact) {
        h += '<h2 class="sec">대회·연습 <span>' + games.length + '건</span></h2><div class="evs">' + games.map(card).join('') + '</div>';
      } else {
        var byDay = {};
        games.forEach(function(e){
          var s = e.starts_on < range()[0] ? range()[0] : e.starts_on;
          (byDay[s] = byDay[s] || []).push(e);
        });
        Object.keys(byDay).sort().forEach(function(d){
          h += '<h2 class="sec">' + label(d) + ' <span>' + byDay[d].length + '건</span></h2><div class="evs">' + byDay[d].map(card).join('') + '</div>';
        });
      }
    }
    if (regs.length && !compact) h += '<h2 class="sec">접수 중 <span>' + regs.length + '건, 마감 빠른 순</span></h2><div class="evs">' + regs.map(card).join('') + '</div>';
    if (compact) {
      if (regs.length) h += '<p class="muted">접수 중인 대회 ' + regs.length + '건</p>';
      h += '<p><a class="btn line" href="' + root + 'schedule.html">전체 일정 보기</a></p>';
    }
    box.innerHTML = h;
    saveUrl();
    if (OPEN) { var oe = rows.filter(function(x){ return String(x.id) === String(OPEN); })[0]; OPEN = null; if (oe) popup(oe); }
  }

  function load(){
    var r = range();
    box.innerHTML = '<p class="muted">일정을 불러오는 중입니다…</p>';
    sb.from('events').select('id,kind,title,starts_on,ends_on,region,place,link,detail')
      .lte('starts_on', r[1])
      .or('ends_on.gte.' + r[0] + ',and(ends_on.is.null,starts_on.gte.' + r[0] + ')')
      .order('starts_on').limit(1000)
      .then(function(res){
        if (res.error) { box.innerHTML = '<p class="muted">일정을 불러오지 못했습니다.</p>'; return; }
        rows = res.data || [];
        render();
      });
  }

  // 자세히 보기 창
  function popup(e){
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="modal-box"><button class="modal-x" aria-label="닫기">×</button>'
      + '<div class="ev-top"><span class="tag">' + esc(e.kind) + '</span>' + (e.region ? '<span class="reg">' + esc(e.region) + '</span>' : '') + '</div>'
      + '<h3>' + esc(e.title) + '</h3>'
      + '<p><b>날짜</b> ' + label(e.starts_on) + (e.ends_on && e.ends_on !== e.starts_on ? ' ~ ' + label(e.ends_on) : '') + '</p>'
      + (e.place ? '<p><b>장소</b></p>' + placeLinks(e) : '')
      + (e.detail ? '<p class="detail">' + esc(e.detail).replace(/\n/g,'<br>') + '</p>' : '')
      + (e.link ? '<p><a class="btn" href="' + esc(e.link) + '">접수·안내 페이지</a></p>' : '')
      + '</div>';
    m.addEventListener('click', function(ev){ if (ev.target === m || ev.target.classList.contains('modal-x')) m.remove(); });
    document.body.appendChild(m);
    if (window.PGS_AUTOLINK) PGS_AUTOLINK(m.querySelector('.modal-box'));
  }

  box.addEventListener('click', function(ev){
    var t = ev.target.closest('button,a.ev-title');
    if (!t) return;
    if (t.classList.contains('ev-title')) {
      ev.preventDefault();
      var e = rows.filter(function(x){ return String(x.id) === t.getAttribute('data-id'); })[0];
      if (e) popup(e);
      return;
    }
    if (t.hasAttribute('data-v')) { st.v = t.getAttribute('data-v'); load(); }
    else if (t.hasAttribute('data-m')) move(+t.getAttribute('data-m'));
    else if (t.hasAttribute('data-today')) { st.d = ymd(kst()); load(); }
    else if (t.hasAttribute('data-k')) { st.k = t.getAttribute('data-k'); render(); }
    else if (t.hasAttribute('data-r')) { st.r = t.getAttribute('data-r'); render(); }
  });

  sb.from('venues').select('name,lat,lng').not('lat', 'is', null).limit(2000).then(function(r){ VEN = r.data || []; load(); }, load);
})();
