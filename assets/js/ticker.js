// 오늘의 소식 띠 (2026-11-28 사용자 "메뉴하단에 1단으로 슬라이딩 뉴스 오늘 업로드한것들 슬라이딩으로 나오게 해줘")
// 메뉴 띠 바로 아래 한 줄. 오늘(한국 시각) 올라온 글(articles.created_at)을 오른쪽에서 왼쪽으로 계속 흘려 보여 줌.
// 오늘 올라온 글이 없으면 가장 최근 글 5개를 '최근 소식'으로 보여 줌. 마우스를 올리면 멈춤. (윈도 애니메이션 끔 설정에서도 흐르게 함) 글꼴은 Pretendard(머리글에서 물려받음).
(function(){
  if (window.__pgsTicker || !window.sb || /[?&]embed=1/.test(location.search)) return; window.__pgsTicker = 1;
  var root = document.body.getAttribute('data-root') || '';
  var hdr = document.querySelector('#site-header .site-header'); if (!hdr) return;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  var st = document.createElement('style');
  st.textContent = '.tkr{background:#fff;border-bottom:1px solid #d9e4dd}'
    + '.tkr-in{max-width:1080px;margin:0 auto;padding:0 16px;height:46px;display:flex;align-items:center;gap:12px}'
    + '.tkr-lb{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;background:#148a4a;color:#fff;font-size:15px;font-weight:800;line-height:1;padding:7px 12px;border-radius:999px;white-space:nowrap}'
    + '.tkr-lb i{font-style:normal;background:#fff;color:#148a4a;font-size:12.5px;font-weight:800;border-radius:999px;padding:2px 7px}'
    + '.tkr-vp{flex:1;min-width:0;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}'
    + '.tkr-tr{display:inline-flex;white-space:nowrap;will-change:transform;animation:tkr-mv var(--tkr-d,40s) linear infinite}'
    + '.tkr-vp:hover .tkr-tr,.tkr-vp:focus-within .tkr-tr{animation-play-state:paused}'
    + '.tkr-it{display:inline-flex;align-items:center;gap:7px;padding:0 26px 0 0;font-size:16px;color:#1a1a1a;font-weight:600;letter-spacing:-.02em}'
    + '.tkr-it:before{content:"";width:5px;height:5px;border-radius:50%;background:#9cc8b0;margin-right:4px}'
    + '.tkr-it b{color:#148a4a;font-weight:800;font-size:14px}'
    + '.tkr-it:hover{color:#0b4d32;text-decoration:underline}'
    + '.tkr-it.yt b{color:#d4201b}'
    + '.tkr-it.col b{color:#8a4b14}'
    + '.tkr-it .tm{color:#888;font-weight:500;font-size:13.5px}'
    + '@keyframes tkr-mv{from{transform:translateX(0)}to{transform:translateX(-50%)}}'
    + '@media (max-width:640px){.tkr-in{padding:0 10px;height:42px;gap:8px}.tkr-lb{font-size:13.5px;padding:6px 10px}.tkr-it{font-size:15px;padding-right:20px}.tkr-it .tm{display:none}}';
  document.head.appendChild(st);

  var bar = document.createElement('div');
  bar.className = 'tkr'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', '오늘의 소식');
  bar.innerHTML = '<div class="tkr-in"><span class="tkr-lb">오늘의 소식</span><div class="tkr-vp"><div class="tkr-tr"></div></div></div>';
  hdr.parentNode.insertBefore(bar, hdr.nextSibling);
  var lb = bar.querySelector('.tkr-lb'), vp = bar.querySelector('.tkr-vp'), tr = bar.querySelector('.tkr-tr');

  // 오늘 0시(한국 시각)
  var k = new Date(Date.now() + 9 * 3600000);
  var day0 = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 9 * 3600000).toISOString();
  function hm(iso){ var d = new Date(new Date(iso).getTime() + 9 * 3600000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function md(iso){ var d = new Date(new Date(iso).getTime() + 9 * 3600000); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); }

  // 글과 영상을 함께 받아 시각 순서(최근 것 먼저)로 섞음. 영상은 유튜브로 같은 창에서 이동.
  function arts(){ return sb.from('articles').select('id,title,category,created_at').eq('is_published', true).order('created_at', { ascending: false }); }
  function vids(){ return sb.from('yt_videos').select('video_id,title,published_at').order('published_at', { ascending: false }); }
  function cols(){ return sb.from('posts').select('id,title,created_at').eq('board', 'column').eq('status', 'published').order('created_at', { ascending: false }); }
  function mix(a, v, c){
    var o = ((a && a.data) || []).map(function(x){ return { t: x.created_at, cat: x.category || '뉴스', title: x.title, href: root + 'article.html?id=' + encodeURIComponent(x.id) }; })
      .concat(((c && c.data) || []).map(function(x){ return { t: x.created_at, cat: '독자칼럼', col: 1, title: x.title, href: root + 'post.html?id=' + encodeURIComponent(x.id) }; }))
      .concat(((v && v.data) || []).map(function(x){ return { t: x.published_at, cat: '유튜브', yt: 1, title: x.title, href: 'https://www.youtube.com/watch?v=' + encodeURIComponent(x.video_id) }; }));
    return o.sort(function(p, q){ return new Date(q.t) - new Date(p.t); });
  }
  Promise.all([arts().gte('created_at', day0).limit(30), vids().gte('published_at', day0).limit(30), cols().gte('created_at', day0).limit(30)]).then(function(r){
    var rows = mix(r[0], r[1], r[2]);
    if (rows.length) { lb.innerHTML = '오늘의 소식 <i>' + rows.length + '건</i>'; return draw(rows, true); }
    lb.textContent = '최근 소식';
    Promise.all([arts().limit(5), vids().limit(3), cols().limit(2)]).then(function(r2){ draw(mix(r2[0], r2[1], r2[2]).slice(0, 8), false); });
  });

  function draw(rows, isToday){
    if (!rows.length) { bar.parentNode.removeChild(bar); return; }
    var unit = rows.map(function(a){
      return '<a class="tkr-it' + (a.yt ? ' yt' : a.col ? ' col' : '') + '" href="' + esc(a.href) + '"><b>[' + esc(a.cat) + ']</b>' + esc(a.title)
        + '<span class="tm">' + (isToday ? hm(a.t) : md(a.t)) + '</span></a>';
    }).join('');
    tr.innerHTML = unit;
    var w = tr.scrollWidth || 1, n = Math.max(1, Math.ceil(vp.clientWidth / w));
    var half = new Array(n + 1).join(unit);
    tr.innerHTML = half + half.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ');   // 뒤쪽 반은 이어 붙이기용 (같은 글)
    var px = tr.scrollWidth / 2;
    tr.style.setProperty('--tkr-d', Math.max(12, Math.round(px / 70)) + 's');   // 1초에 약 70px
  }
})();
