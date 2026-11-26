// 뉴스 목록 (news.html), 기사 보기 (article.html), 첫 화면 최신 뉴스 (index.html)
// 데이터: Supabase articles 표 (parkgolfnews.org 기사에서 매시간 자동으로 가져옴)
(function(){
  if (!window.sb) return;
  var page = document.body.getAttribute('data-page');
  var root = document.body.getAttribute('data-root') || '';
  var FONT = "'Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif";
  var PRET = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
  var CATS = ['뉴스','오늘일정','맛집'];
  var WD = ['일','월','화','수','목','금','토'];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function kdate(iso){
    if (!iso) return '';
    var d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return d.getFullYear() + '.' + (d.getMonth()+1) + '.' + d.getDate() + ' (' + WD[d.getDay()] + ')';
  }
  function item(a){
    return '<li class="nw"><a href="' + root + 'article.html?id=' + a.id + '">'
      + (a.cover_url ? '<img class="nw-img" src="' + esc(a.cover_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '')
      + '<div class="nw-txt"><span class="nw-cat">' + esc(a.category) + '</span>'
      + '<strong>' + esc(a.title) + '</strong>'
      + (a.summary ? '<p>' + esc(a.summary) + '</p>' : '')
      + '<span class="nw-date">' + kdate(a.published_at) + '</span></div></a></li>';
  }

  /* ---- 목록 ---- */
  var listBox = document.getElementById('news');
  if (listBox) {
    var compact = listBox.getAttribute('data-compact') === '1';
    var size = compact ? 5 : 20;
    var q = new URLSearchParams(location.search);
    var st = { c: compact ? '뉴스' : (q.get('c') || ''), q: compact ? '' : (q.get('q') || '').trim().slice(0, 40), n: 0, rows: [] };
    function load(more){
      if (!more) { st.n = 0; st.rows = []; }
      var qr = sb.from('articles').select('id,title,summary,category,published_at,cover_url')
        .eq('is_published', true).order('published_at', { ascending: false }).order('sort_no', { ascending: false })
        .range(st.n, st.n + size - 1);
      if (st.c) qr = qr.eq('category', st.c);
      if (st.q) qr = qr.ilike('title', '%' + st.q.replace(/[%_\\]/g, function(c){ return '\\' + c; }) + '%');
      qr.then(function(r){
        if (r.error) { listBox.innerHTML = '<p class="muted">뉴스를 불러오지 못했습니다.</p>'; return; }
        st.rows = st.rows.concat(r.data || []); st.n += (r.data || []).length;
        var h = '';
        if (!compact) h += '<div class="chips">' + [''].concat(CATS).map(function(c){
          return '<button data-c="' + c + '"' + (st.c === c ? ' class="on"' : '') + '>' + (c || '전체') + '</button>'; }).join('') + '</div>';
        if (st.q) h += '<p class="muted">\'' + esc(st.q) + '\' 검색 결과' + (st.rows.length ? '' : '가 없습니다') + ' · <a href="' + root + 'news.html">검색 지우기</a></p>';
        h += st.rows.length ? '<ul class="nws">' + st.rows.map(item).join('') + '</ul>' : '<p class="muted card">아직 글이 없습니다.</p>';
        if (!compact && (r.data || []).length === size) h += '<p class="center"><button class="btn line" data-more="1">더 보기</button></p>';
        if (compact) h += '<p><a class="btn line" href="' + root + 'news.html">뉴스 더 보기</a></p>';
        listBox.innerHTML = h;
        if (!compact) { var qs = []; if (st.c) qs.push('c=' + encodeURIComponent(st.c)); if (st.q) qs.push('q=' + encodeURIComponent(st.q)); history.replaceState(null, '', location.pathname + (qs.length ? '?' + qs.join('&') : '')); }
      });
    }
    listBox.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-c')) { st.c = b.getAttribute('data-c'); load(false); }
      if (b.hasAttribute('data-more')) load(true);
    });
    load(false);
  }

  /* ---- 기사 보기 ---- */
  var art = document.getElementById('article');
  if (art) {
    if (window.PGS_COMMENTS) PGS_COMMENTS('article', new URLSearchParams(location.search).get('id'));
    var id = new URLSearchParams(location.search).get('id');
    if (!id) { art.innerHTML = '<p class="muted">기사를 찾을 수 없습니다.</p>'; return; }
    sb.from('articles').select('*').eq('id', id).maybeSingle().then(function(r){
      var a = r.data;
      if (!a) { art.innerHTML = '<p class="muted">기사를 찾을 수 없습니다.</p>'; return; }
      document.title = a.title + ' - 파크골프세계';
      document.querySelector('h1').textContent = a.title;
      var h = '<div class="art-meta"><span class="nw-cat">' + esc(a.category) + '</span> ' + kdate(a.published_at)
        + (a.author_name ? ' · ' + esc(a.author_name) : '') + '</div>';
      h += '<div class="art-body" id="art-body"></div>';
      var body = a.body_html || '';
      var imgs = (a.images || []).filter(function(u){ return u && body.indexOf(u) < 0; });
      if (imgs.length) h += '<div class="art-imgs">' + imgs.map(function(u){ return '<img src="' + esc(u) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'; }).join('') + '</div>';
      if (a.embed_url) h += '<p><a class="btn" href="' + esc(a.embed_url) + '">전체 화면으로 보기</a></p><iframe class="art-embed" src="' + esc(a.embed_url) + '" loading="lazy"></iframe>';
      if (a.source_name) h += '<p class="muted small">출처: ' + (a.source_url ? '<a href="' + esc(a.source_url) + '">' + esc(a.source_name) + '</a>' : esc(a.source_name)) + '</p>';
      h += '<p><a class="btn line" href="' + root + 'news.html">목록으로</a></p>';
      art.innerHTML = h;
      // 2026-11-26 사용자 지시 "이 뉴스레터 기사는 새홈페이지에 있는 기사로 대체해주고 앞으로도 계속 그렇게 해줘":
      // 기사 속 뉴스레터(iframe.art-embed)에서 링크를 누르면 작은 창 안이 아니라 바깥 화면 전체가 그 새 홈페이지 기사·화면으로 바뀜(모든 호에 적용)
      var ef = art.querySelector('iframe.art-embed');
      if (ef) ef.addEventListener('load', function(){
        try {
          var d = ef.contentDocument; if (!d || d.__pgsTop) return; d.__pgsTop = 1;
          d.addEventListener('click', function(ev){
            if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
            var a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
            var hr = a.getAttribute('href') || '';
            if (!hr || hr.charAt(0) === '#' || /^(javascript|tel|sms|mailto):/i.test(hr)) return;
            ev.preventDefault(); ev.stopPropagation();
            window.location.href = a.href;
          }, true);
        } catch (e) {}
      });
      renderBody(document.getElementById('art-body'), body);
    });
  }

  function renderBody(el, html){
    if (/<html|<!doctype/i.test(html)) {   // 완전한 html 문서(인포그래픽 등)는 따로 떨어진 창(iframe) 안에
      var f = document.createElement('iframe');
      f.className = 'art-frame';
      f.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      var inject = '<link rel="stylesheet" href="' + PRET + '"><style>*{font-family:' + FONT + ' !important}</style>'
        + '<script>function h(){parent.postMessage({pgsFrame:1,h:document.documentElement.scrollHeight},"*")}addEventListener("load",h);addEventListener("resize",h);setTimeout(h,800);setTimeout(h,2500);<\/script>';
      f.srcdoc = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, inject + '</head>') : inject + html;
      window.addEventListener('message', function(ev){ if (ev.source === f.contentWindow && ev.data && ev.data.pgsFrame) f.style.height = (ev.data.h + 8) + 'px'; });
      el.appendChild(f);
      return;
    }
    var t = document.createElement('template');
    t.innerHTML = html;
    t.content.querySelectorAll('script,style,link,meta,object,embed').forEach(function(n){ n.remove(); });
    t.content.querySelectorAll('*').forEach(function(n){
      [].slice.call(n.attributes).forEach(function(at){
        if (/^on/i.test(at.name) || (/^(href|src)$/i.test(at.name) && /^\s*javascript:/i.test(at.value))) n.removeAttribute(at.name);
      });
      if (n.tagName === 'IFRAME' && !/^https:/.test(n.getAttribute('src') || '')) n.remove();
      if (n.tagName === 'IMG') n.setAttribute('referrerpolicy', 'no-referrer');
    });
    // 밴드 주소만 있는 안내 줄은 숨김
    t.content.querySelectorAll('p,div,li').forEach(function(n){ if (!n.children.length && /band\.us\//.test(n.textContent) && n.textContent.length < 120) n.remove(); });
    el.appendChild(t.content);
    linkify(el);
    if (window.PGS_AUTOLINK) PGS_AUTOLINK(el);   // 인터넷 주소·그 밖의 전화번호 모양도 연결
  }

  // 본문 속 구장 이름 -> 길안내(place.html), 전화번호 -> 전화 걸기
  var PLC = /(?<![가-힣A-Za-z0-9·])(?:([가-힣A-Za-z0-9·]{1,15})\s)?([가-힣A-Za-z0-9·]*(?:파크골프장|파크골프\s?구장|파크골프리조트|파크골프센터)(?:\s?제?\d{1,2}구장)?)/g;
  var STOP = /^(오는|지난|이번|이날|올해|내년|인근|주변|근처|전국|지역|해당|국내|모든|새|각|두|세|네|및|등|또는|이|그|저|신설|신규|대형|공공|기존|인접|무료|유료|전용|일반|대표|첫|다른|같은|한|또|총)$|(는|은|을|를|에서|에게|에|의|와|과|로|으로|던|된|한|인|이|가|도|만|서|고|며|면|게|다|요|일|월|시|분|명|개|회|차|부|곳|홀|번째|까지|부터)$|^\d/;
  var TEL = /(?<!\d)(0\d{1,2}-\d{3,4}-\d{4}|1[5-9]\d{2}-\d{4})(?!\d)/g;
  window.PGS_LINKIFY = function(el){ linkify(el); };
  function linkify(el){
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = w.nextNode())) if (!n.parentElement.closest('a,script,style')) nodes.push(n);
    nodes.forEach(function(node){
      var text = node.nodeValue, marks = [], m;
      PLC.lastIndex = 0;
      while ((m = PLC.exec(text))) {
        var pre = m[1] || '', main = m[2], s = m.index;
        if (pre && STOP.test(pre)) { s += pre.length + 1; pre = ''; }
        if (!pre && /^(파크골프장|파크골프\s?구장|파크골프리조트|파크골프센터)/.test(main)) continue;
        var name = (pre ? pre + ' ' : '') + main, e = s + name.length, q = 'n=' + encodeURIComponent(name);
        var am = /^\s*[(（]\s*([가-힣A-Za-z0-9·\s]{2,30}?)\s*[)）]/.exec(text.slice(e));
        if (am && /파크골프|구장|공원|체육|리조트|센터/.test(am[1]) && am[1].trim() !== name) q += '&a=' + encodeURIComponent(am[1].trim());
        marks.push({ s: s, e: e, href: root + 'place.html?' + q, txt: name, cls: 'pgplace' });
      }
      TEL.lastIndex = 0;
      while ((m = TEL.exec(text))) {
        var s2 = m.index, e2 = s2 + m[0].length;
        if (/팩스\s*[:：]?\s*$/.test(text.slice(Math.max(0, s2 - 8), s2))) continue;
        if (!marks.some(function(k){ return s2 < k.e && e2 > k.s; })) marks.push({ s: s2, e: e2, href: 'tel:' + m[0].replace(/\D/g,''), txt: m[0], cls: 'pgtel' });
      }
      if (!marks.length) return;
      marks.sort(function(a,b){ return a.s - b.s; });
      var f = document.createDocumentFragment(), last = 0;
      marks.forEach(function(k){
        if (k.s < last) return;
        if (k.s > last) f.appendChild(document.createTextNode(text.slice(last, k.s)));
        var a = document.createElement('a'); a.href = k.href; a.className = k.cls; a.textContent = k.txt;
        a.title = k.cls === 'pgplace' ? '눌러서 자동차 길안내 (네이버 지도·카카오맵)' : '눌러서 전화 걸기';
        f.appendChild(a); last = k.e;
      });
      if (last < text.length) f.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(f, node);
    });
  }
})();
