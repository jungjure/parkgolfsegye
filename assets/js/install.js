// 바탕화면 설치 단추 (2026-11-27 사용자 "파크톡옆에 바탕화면설치 만들어주고 휴대폰에서 누르면 휴대폰에 설치 pc에서 누르면 바탕화면에 아이콘")
// 크롬·엣지·삼성인터넷: 브라우저 설치 창을 바로 띄움 (PC는 바탕화면·시작 메뉴 아이콘, 휴대폰은 홈 화면 아이콘)
// 아이폰·카카오톡 안 브라우저 등 설치 창이 없는 곳: 따라 하기 안내
(function(){
  if (window.__pgsInst) return; window.__pgsInst = 1;
  var root = document.body.getAttribute('data-root') || '';
  var ua = navigator.userAgent;
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAnd = /Android/i.test(ua);
  var isMob = isIOS || isAnd || /Mobi/i.test(ua);
  var isKakao = /KAKAOTALK/i.test(ua);
  var inApp = isKakao || /NAVER|BAND|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua);
  var isSam = /SamsungBrowser/i.test(ua);
  var isEdge = /Edg\//.test(ua), isWhale = /Whale\//.test(ua);
  var deferred = null, installed = false;

  // 설치에 필요한 정보 (모든 화면 공통)
  if (!document.querySelector('link[rel="manifest"]')) { var l = document.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.webmanifest'; document.head.appendChild(l); }
  if (!document.querySelector('meta[name="theme-color"]')) { var m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#0b4d32'; document.head.appendChild(m); }
  if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) { var t = document.createElement('meta'); t.name = 'apple-mobile-web-app-title'; t.content = '파크골프세계'; document.head.appendChild(t); }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});

  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function(){ installed = true; deferred = null; done(); });

  var st = document.createElement('style');
  st.textContent = '.sl-r{justify-self:end;display:inline-flex;align-items:center;gap:6px}'
    + '.inst-pill{display:inline-flex;align-items:center;gap:5px;background:#fff;color:#0b4d32;border:2px solid #148a4a;font:inherit;font-size:15.5px;font-weight:800;line-height:1;padding:5px 12px 5px 10px;border-radius:999px;cursor:pointer}'
    + '.inst-pill:hover{background:#e8f4ee}'
    + '@media (max-width:640px){.sl-r{order:3}.inst-pill{font-size:14px;padding:4px 10px 4px 8px}}'
    + '.inst-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}'
    + '.inst-box{background:#fff;border-radius:14px;max-width:420px;width:100%;padding:22px 20px 18px;font:inherit;color:#222;box-shadow:0 10px 30px rgba(0,0,0,.25)}'
    + '.inst-box h3{margin:0 0 6px;font-size:19px;color:#0b4d32;display:flex;align-items:center;gap:10px}.inst-box h3 img{width:40px;height:40px;border-radius:9px;border:1px solid #e3e3e3}'
    + '.inst-box p{margin:8px 0;line-height:1.6;font-size:15.5px}.inst-box ol{margin:8px 0;padding-left:22px;line-height:1.75;font-size:15.5px}.inst-box b{color:#0b4d32}'
    + '.inst-box .ib{display:block;width:100%;margin-top:10px;padding:12px;border-radius:10px;border:0;background:#148a4a;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer;text-align:center}'
    + '.inst-box .ib.sub{background:#f1f3f2;color:#333;font-weight:700}';
  document.head.appendChild(st);

  var ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>';
  function btn(){
    var b = document.getElementById('pgs-inst');
    if (!b) {
      var talk = document.querySelector('.mast .talk-pill'); if (!talk) return null;
      var wrap = document.createElement('span'); wrap.className = 'sl-r'; talk.parentNode.insertBefore(wrap, talk); wrap.appendChild(talk);
      b = document.createElement('button'); b.type = 'button'; b.id = 'pgs-inst'; b.className = 'inst-pill'; wrap.appendChild(b);
    }
    b.innerHTML = ICON + '바탕화면 설치'; b.title = isMob ? '휴대폰 홈 화면에 파크골프세계 아이콘을 만듭니다' : '컴퓨터 바탕화면에 파크골프세계 아이콘을 만듭니다';
    b.onclick = install; return b;
  }
  if (standalone) return; // 이미 설치한 앱으로 열었으면 단추를 보이지 않음
  btn();

  function close(){ var x = document.getElementById('inst-bg'); if (x) x.remove(); }
  function modal(html){
    close();
    var bg = document.createElement('div'); bg.className = 'inst-bg'; bg.id = 'inst-bg';
    bg.innerHTML = '<div class="inst-box" role="dialog" aria-modal="true"><h3><img src="/assets/img/icon-192.png" alt="">파크골프세계 설치</h3>' + html + '<button type="button" class="ib sub" data-x>닫기</button></div>';
    bg.addEventListener('click', function(e){ if (e.target === bg || e.target.hasAttribute('data-x')) close(); });
    document.body.appendChild(bg);
    return bg;
  }
  function done(){
    modal(isMob ? '<p>설치했습니다. 휴대폰 <b>홈 화면</b>에 생긴 <b>파크골프세계</b> 아이콘을 누르면 바로 열립니다.</p>'
                : '<p>설치했습니다. 컴퓨터 <b>바탕화면</b>(과 시작 메뉴)에 생긴 <b>파크골프세계</b> 아이콘을 두 번 누르면 바로 열립니다.</p>');
  }
  function urlFor(){ return location.origin + location.pathname + location.search + (location.search ? '&' : '?') + 'install=1'; }

  function install(){
    if (deferred) {
      var ev = deferred; deferred = null;
      ev.prompt();
      ev.userChoice.then(function(c){ if (c && c.outcome === 'accepted') { installed = true; setTimeout(done, 600); } }).catch(function(){});
      return;
    }
    // 앱 안 브라우저(카카오톡·네이버·밴드 등)에서는 설치가 안 되므로 기본 인터넷 앱으로 다시 열기
    if (inApp) {
      if (isKakao) {
        var bg = modal('<p>카카오톡 안에서는 설치할 수 없습니다. 아래 단추를 누르면 휴대폰 기본 인터넷 앱에서 이 화면이 다시 열립니다. 거기서 <b>바탕화면 설치</b>를 한 번 더 눌러 주세요.</p><button type="button" class="ib" id="inst-go">인터넷 앱에서 열기</button>');
        bg.querySelector('#inst-go').onclick = function(){ location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(urlFor()); };
        return;
      }
      if (isAnd) {
        var bg2 = modal('<p>이 앱 안에서는 설치할 수 없습니다. 아래 단추로 <b>크롬</b>에서 열고, 거기서 <b>바탕화면 설치</b>를 한 번 더 눌러 주세요.</p><button type="button" class="ib" id="inst-go">크롬에서 열기</button>');
        bg2.querySelector('#inst-go').onclick = function(){ var u = urlFor(); location.href = 'intent://' + u.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(u) + ';end'; };
        return;
      }
      modal('<p>이 앱 안에서는 설치할 수 없습니다.</p><ol><li>오른쪽 위나 아래의 <b>···</b> 또는 <b>공유</b> 단추를 누릅니다.</li><li><b>Safari로 열기</b>(또는 다른 브라우저로 열기)를 누릅니다.</li><li>열린 화면에서 <b>바탕화면 설치</b>를 다시 누릅니다.</li></ol>');
      return;
    }
    if (isIOS) {
      modal('<p>아이폰은 아래 순서로 홈 화면에 아이콘을 만듭니다.</p><ol><li>화면 아래(또는 위)의 <b>공유</b> 단추(네모에 위쪽 화살표)를 누릅니다.</li><li>목록을 내려 <b>홈 화면에 추가</b>를 누릅니다.</li><li>오른쪽 위 <b>추가</b>를 누르면 끝입니다.</li></ol>');
      return;
    }
    if (isSam) {
      modal('<p>삼성 인터넷은 아래 순서로 홈 화면에 아이콘을 만듭니다.</p><ol><li>화면 아래 오른쪽 <b>≡</b> 메뉴를 누릅니다.</li><li><b>현재 페이지 추가</b>(또는 <b>페이지 추가</b>)를 누릅니다.</li><li><b>홈 화면</b>을 고르고 <b>추가</b>를 누르면 끝입니다.</li></ol>');
      return;
    }
    if (isAnd) {
      modal('<p>아래 순서로 홈 화면에 아이콘을 만듭니다.</p><ol><li>오른쪽 위 <b>⋮</b> 메뉴를 누릅니다.</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누릅니다.</li><li><b>설치</b>(또는 <b>추가</b>)를 누르면 끝입니다.</li></ol><p>이미 설치했다면 홈 화면의 <b>파크골프세계</b> 아이콘으로 여시면 됩니다.</p>');
      return;
    }
    // PC: 설치 창을 못 띄우는 경우 (이미 설치됨, 파이어폭스·사파리 등)
    var pcHow = isEdge ? '<li>오른쪽 위 <b>···</b> 메뉴 &gt; <b>앱</b> &gt; <b>이 사이트를 앱으로 설치</b>를 누릅니다.</li><li><b>설치</b>를 누르고, 나오는 창에서 <b>바탕 화면 바로 가기 만들기</b>에 체크한 뒤 <b>허용</b>을 누릅니다.</li>'
      : isWhale ? '<li>오른쪽 위 <b>···</b> 메뉴 &gt; <b>도구 더보기</b> &gt; <b>바로가기 만들기</b>를 누릅니다.</li><li><b>창으로 열기</b>에 체크하고 <b>만들기</b>를 누릅니다.</li>'
      : '<li>주소창 오른쪽 끝의 <b>설치</b> 아이콘(모니터에 아래 화살표)을 누릅니다. 안 보이면 오른쪽 위 <b>⋮</b> &gt; <b>전송, 저장, 공유</b> &gt; <b>바로가기 만들기</b>를 누릅니다.</li><li><b>설치</b>(또는 <b>창으로 열기</b> 체크 후 <b>만들기</b>)를 누릅니다.</li>';
    var bg3 = modal('<p>이미 설치했다면 바탕화면의 <b>파크골프세계</b> 아이콘으로 여시면 됩니다. 처음이면 아래 순서대로 해 주세요.</p><ol>' + pcHow + '</ol>'
      + '<p>위 방법이 안 되면 아래 단추로 바로가기 파일을 받아 <b>바탕화면</b>으로 끌어다 놓으세요.</p><button type="button" class="ib" id="inst-url">바로가기 파일 받기</button>');
    bg3.querySelector('#inst-url').onclick = function(){
      var txt = '[InternetShortcut]\r\nURL=' + location.origin + '/\r\nIconFile=' + location.origin + '/favicon.ico\r\nIconIndex=0\r\n';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' })); a.download = '파크골프세계.url'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
  }

  // 카카오톡 등에서 "인터넷 앱에서 열기"로 넘어온 경우: 설치 창을 바로 띄울 수 있게 안내
  if (/[?&]install=1/.test(location.search)) {
    setTimeout(function(){
      if (deferred) { var bg = modal('<p>아래 단추를 누르면 설치 창이 나옵니다. <b>설치</b>를 누르면 홈 화면에 <b>파크골프세계</b> 아이콘이 생깁니다.</p><button type="button" class="ib" id="inst-now">지금 설치</button>'); bg.querySelector('#inst-now').onclick = function(){ close(); install(); }; }
      else install();
    }, 1200);
  }
})();
