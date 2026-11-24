// 구장 정보 화면 (venues.html) + 일정 장소 좌표 보강에 쓰는 구장 목록
(function(){
  if (!window.sb) return;
  var root = document.body.getAttribute('data-root') || '';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var box = document.getElementById('venues');
  if (!box) return;
  var q = new URLSearchParams(location.search);
  var st = { s: q.get('s') || '', g: q.get('g') || '', k: q.get('q') || '' }, rows = [];
  function won(v){ var n = String(v).replace(/[^\d]/g,''); return /^\d+$/.test(String(v).trim()) ? Number(n).toLocaleString('ko-KR') + '원' : esc(v); }
  function card(v){
    var addr = v.address || v.map_address || '';
    var links = '';
    if (v.lat && v.lng) {
      var base = root + 'place.html?n=' + encodeURIComponent(v.name) + '&lat=' + v.lat + '&lng=' + v.lng;
      links = '<a class="mapbtn nv" href="' + base + '&go=naver">네이버</a><a class="mapbtn kk" href="' + base + '&go=kakao">카카오</a>';
    } else {
      var b2 = root + 'place.html?n=' + encodeURIComponent(v.name) + '&a=' + encodeURIComponent(v.sigungu + ' ' + v.name);
      links = '<a class="mapbtn nv" href="' + b2 + '&go=naver">네이버</a><a class="mapbtn kk" href="' + b2 + '&go=kakao">카카오</a>';
    }
    var fees = v.fees && Object.keys(v.fees).length ? '<details><summary>사용료 보기</summary><ul class="fees">' + Object.keys(v.fees).map(function(k){
      return '<li><span>' + esc(k.replace('한생군인청소년','학생·군인·청소년')) + '</span><b>' + won(v.fees[k]) + '</b></li>'; }).join('') + '</ul><small class="muted">시·군 자료 기준이며 바뀔 수 있습니다.</small></details>' : '';
    return '<div class="ev vn"><div class="ev-top"><span class="tag">' + esc(v.sido) + '</span><span class="reg">' + esc(v.sigungu) + '</span>'
      + (v.note ? '<span class="ev-date">' + esc(v.note) + '</span>' : '') + '</div>'
      + '<strong class="ev-title">' + esc(v.name) + '</strong>'
      + (addr ? '<div class="ev-place">' + esc(addr) + '</div>' : '')
      + '<div class="ev-place">' + links + (v.phone ? ' <a class="pgtel" href="tel:' + v.phone.replace(/[^\d]/g,'') + '">' + esc(v.phone) + '</a>' : '') + '</div>'
      + ((v.operator || v.built) ? '<div class="vn-meta">' + (v.operator ? '관리 ' + esc(v.operator) : '') + (v.operator && v.built ? ' · ' : '') + (v.built ? '준공 ' + esc(v.built) : '') + '</div>' : '')
      + fees + '</div>';
  }
  function render(){
    var sidos = [], gus = [];
    rows.forEach(function(v){ if (sidos.indexOf(v.sido) < 0) sidos.push(v.sido); if (v.sido === st.s && gus.indexOf(v.sigungu) < 0) gus.push(v.sigungu); });
    sidos.sort(); gus.sort();
    var k = st.k.trim();
    var list = rows.filter(function(v){ return (!st.s || v.sido === st.s) && (!st.g || v.sigungu === st.g) && (!k || (v.name + ' ' + v.sigungu + ' ' + (v.address || v.map_address || '')).indexOf(k) >= 0); });
    var h = '<div class="vn-search"><input id="vq" type="search" placeholder="구장 이름이나 지역으로 찾기" value="' + esc(st.k) + '"></div>';
    h += '<div class="chips">' + [''].concat(sidos).map(function(s){ return '<button data-s="' + esc(s) + '"' + (st.s === s ? ' class="on"' : '') + '>' + (s ? esc(s) : '전국') + '</button>'; }).join('') + '</div>';
    if (gus.length) h += '<div class="chips reg-chips">' + [''].concat(gus).map(function(g){ return '<button data-g="' + esc(g) + '"' + (st.g === g ? ' class="on"' : '') + '>' + (g ? esc(g) : '전체') + '</button>'; }).join('') + '</div>';
    h += '<p class="muted small">' + list.length + '곳</p>';
    h += list.length ? '<div class="evs">' + list.slice(0, 300).map(card).join('') + '</div>' : '<p class="muted card">찾는 구장이 없습니다.</p>';
    if (list.length > 300) h += '<p class="muted small">300곳까지 보여 드립니다. 지역을 골라 주세요.</p>';
    box.innerHTML = h;
    var p = new URLSearchParams(); if (st.s) p.set('s', st.s); if (st.g) p.set('g', st.g); if (k) p.set('q', k);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  box.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-s')) { st.s = b.getAttribute('data-s'); st.g = ''; render(); }
    if (b.hasAttribute('data-g')) { st.g = b.getAttribute('data-g'); render(); }
  });
  var tm = 0;
  box.addEventListener('input', function(e){
    if (e.target.id !== 'vq') return;
    clearTimeout(tm);
    tm = setTimeout(function(){ st.k = e.target.value; var pos = e.target.selectionStart; render(); var i = document.getElementById('vq'); i.focus(); i.setSelectionRange(pos, pos); }, 250);
  });
  box.innerHTML = '<p class="muted">구장 정보를 불러오는 중입니다…</p>';
  sb.from('venues').select('id,name,sido,sigungu,address,map_address,phone,operator,built,note,fees,lat,lng').order('sido').order('sigungu').order('name').limit(2000)
    .then(function(r){ if (r.error) { box.innerHTML = '<p class="muted">불러오지 못했습니다.</p>'; return; } rows = r.data || []; render(); });
})();
