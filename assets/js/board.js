// 독자칼럼(column)·자유게시판(free): 목록, 글 보기(post.html), 글쓰기·고치기(write.html)
(function(){
  if (!window.sb) return;
  var page = document.body.getAttribute('data-page'), root = PGS.root, esc = PGS.esc;
  var q = new URLSearchParams(location.search);
  var NAME = { column: '독자칼럼', free: '자유게시판' }, PAGE = { column: 'column.html', free: 'board.html' };
  function loginUrl(){ return root + 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); }

  /* 목록 */
  if (page === 'column' || page === 'board') {
    var board = page === 'column' ? 'column' : 'free', box = document.getElementById('page-body'), n = 0, size = 20, all = [], cc = {}, nk = {}, meL = {}, lastN = 0, kw = '';
    box.className = '';
    var GUIDE = '<div class="card guide"><b>독자칼럼 이용 안내</b>'
      + '<p>파크골프에 관한 생각, 경험, 제안, 여행·구장 이야기를 자유롭게 써 주세요. 글 사이사이에 사진을 여러 장 붙일 수 있습니다.</p>'
      + '<p>· <b>회원이면 누구나 기고할 수 있으며, 보내 주신 글은 편집부가 확인한 뒤 실립니다.</b> 읽기는 누구나, 댓글은 회원만 쓸 수 있습니다.</p>'
      + '<p>아래 내용은 올릴 수 없으며 싣지 않거나 지울 수 있습니다.<br>· 욕설·비방·혐오 표현, 선정적이거나 음란한 내용<br>· 도박·불법 광고, 폭력·자해를 부추기는 내용, 개인정보 노출(다른 사람 얼굴·전화번호·차량번호가 보이는 사진 포함), 인터넷 주소(링크)</p></div>';
    function name(p){ return p.author_name || nk[p.author_id] || '회원'; }
    function draw(){
      var rows = all.filter(function(p){ return !kw || (p.title + ' ' + name(p)).toLowerCase().indexOf(kw) >= 0; });
      var ul = document.getElementById('plist');
      ul.innerHTML = rows.length ? rows.map(function(p){
        var imgs = PGS.postImgs(p.body), ex = PGS.postPlain(p.body).slice(0, 160);
        return '<li><a href="' + root + 'post.html?id=' + p.id + '"><div class="pl-txt"><strong>' + (p.status === 'pending' ? '<span class="tag pend">승인 대기</span> ' : p.status === 'rejected' ? '<span class="tag rej">돌려받음</span> ' : '') + esc(p.title)
          + (cc[p.id] ? ' <span class="cc">[' + cc[p.id] + ']</span>' : '') + '</strong>'
          + (ex ? '<p class="pl-ex">' + esc(ex) + '</p>' : '')
          + '<span class="muted small">' + esc(name(p)) + ' · ' + PGS.when(p.created_at) + (imgs.length ? ' · 사진 ' + imgs.length + '장' : '') + ' · 조회 ' + p.views + '</span></div>'
          + (imgs.length ? '<span class="pl-th"><img src="' + esc(imgs[0]) + '" alt="" loading="lazy">' + (imgs.length > 1 ? '<em>+' + (imgs.length - 1) + '</em>' : '') + '</span>' : '') + '</a></li>';
      }).join('') : '<li class="pl-empty muted">' + (kw ? '찾는 글이 없습니다.' : '아직 글이 없습니다. 첫 글을 남겨 주세요.') + '</li>';
      var mb = document.getElementById('more'); if (mb) mb.hidden = lastN < size || !!kw;
    }
    function more(){
      sb.from('posts').select('id,title,body,author_id,author_name,created_at,views,status').eq('board', board).order('created_at', { ascending: false }).range(n, n + size - 1).then(function(r){
        var rows = r.data || []; n += rows.length; all = all.concat(rows); lastN = rows.length;
        Promise.all([PGS.nicks(all.map(function(p){ return p.author_id; })), sb.rpc('comment_counts', { t: 'post', ids: all.map(function(p){ return p.id; }) }), PGS.me()]).then(function(res){
          nk = res[0]; meL = res[2] || {};
          ((res[1] && res[1].data) || []).forEach(function(x){ cc[x.target_id] = x.n; });
          if (!document.getElementById('plist')) {
            box.innerHTML = (board === 'column' ? GUIDE : '<p class="muted small">회원 누구나 자유롭게 글을 쓸 수 있습니다. 욕설·광고는 지워질 수 있습니다.</p>')
              + '<div class="board-top"><input type="search" id="pq" class="adm-search" placeholder="제목·글쓴이 검색" maxlength="40">'
              + '<a class="btn" href="' + (meL.user ? root + 'write.html?b=' + board : loginUrl()) + '">' + (board === 'column' ? '기고하기' : '글쓰기') + '</a></div>'
              + '<ul class="posts" id="plist"></ul><p class="center"><button class="btn line" id="more" hidden>더 보기</button></p>';
            document.getElementById('more').onclick = more;
            document.getElementById('pq').oninput = function(){ kw = this.value.trim().toLowerCase(); draw(); };
          }
          draw();
        });
      });
    }
    more();
  }

  /* 글 보기 */
  if (page === 'post') {
    var pb = document.getElementById('post'), pid = q.get('id');
    sb.from('posts').select('*').eq('id', pid).maybeSingle().then(function(r){
      var p = r.data;
      if (!p) { pb.innerHTML = '<p class="muted">글을 찾을 수 없습니다.</p>'; return; }
      sb.rpc('post_view', { pid: p.id }).then(function(){});
      Promise.all([PGS.nicks([p.author_id]), PGS.me()]).then(function(res){
        var nk = res[0], me = res[1] || {}, mine = me.user && me.user.id === p.author_id, admin = me.profile && me.profile.role === 'admin';
        document.title = p.title + ' - 파크골프세계';
        document.querySelector('h1').textContent = p.title;
        var h = '<div class="art-meta"><a href="' + root + PAGE[p.board] + '" class="nw-cat">' + NAME[p.board] + '</a> ' + esc(p.author_name || nk[p.author_id] || '회원') + ' · ' + PGS.when(p.created_at) + ' · 조회 ' + (p.views + 1)
          + (p.status === 'pending' ? ' · <span class="tag pend">승인 대기</span>' : p.status === 'rejected' ? ' · <span class="tag rej">돌려받음</span>' : '') + '</div>'
          + (p.status === 'rejected' && (mine || admin) ? '<div class="card rej-note"><b>편집부에서 돌려보냈습니다.</b>' + (p.admin_note ? '<p>' + PGS.text(p.admin_note) + '</p>' : '') + '<p class="muted small">글을 고쳐 저장하면 다시 승인 대기로 올라갑니다.</p></div>' : '');
        h += '<div class="art-body post-body" id="post-body">' + (p.image_url ? '<figure class="pimg"><img src="' + esc(p.image_url) + '" alt="첨부 사진"></figure>' : '') + PGS.postHtml(p.body) + '</div>';
        h += '<div class="post-act">' + (mine || admin ? '<a class="btn line" href="' + root + 'write.html?id=' + p.id + '">고치기</a><button class="btn line" id="pdel">지우기</button>' : '')
          + (admin && p.status === 'pending' ? '<button class="btn" id="papprove">승인해서 싣기</button>' : '')
          + '<a class="btn line" href="' + root + PAGE[p.board] + '">목록으로</a></div><div id="pask"></div>';
        pb.innerHTML = h;
        if (window.PGS_LINKIFY) PGS_LINKIFY(document.getElementById('post-body'));
        var d = document.getElementById('pdel');
        if (d) d.onclick = function(){
          document.getElementById('pask').innerHTML = '<p class="form-msg err">이 글을 지울까요? 댓글도 함께 보이지 않게 됩니다.</p><button class="btn danger" id="pdelok">지우기</button> <button class="btn line" id="pdelno">취소</button>';
          document.getElementById('pdelno').onclick = function(){ document.getElementById('pask').innerHTML = ''; };
          document.getElementById('pdelok').onclick = function(){ sb.from('posts').delete().eq('id', p.id).then(function(){ location.href = root + PAGE[p.board]; }); };
        };
        var ap = document.getElementById('papprove');
        if (ap) ap.onclick = function(){ sb.from('posts').update({ status: 'published' }).eq('id', p.id).then(function(){ location.reload(); }); };
        if (p.status === 'published' && window.PGS_COMMENTS) PGS_COMMENTS('post', p.id);
      });
    });
  }

  /* 글쓰기·고치기 */
  if (page === 'write') {
    var wb = document.getElementById('write'), eid = q.get('id'), bd = q.get('b') === 'column' ? 'column' : 'free';
    PGS.me().then(async function(me){
      if (!me || !me.user) { location.href = loginUrl(); return; }
      var p = null;
      if (eid) { p = (await sb.from('posts').select('*').eq('id', eid).maybeSingle()).data; if (!p) { wb.innerHTML = '<p class="muted">글을 찾을 수 없습니다.</p>'; return; } bd = p.board; }
      document.querySelector('h1').textContent = (p ? '글 고치기' : (bd === 'column' ? '독자칼럼 기고하기' : '자유게시판 글쓰기'));
      wb.innerHTML = '<form id="wf" class="card form wide">'
        + (bd === 'column' && !p ? '<p class="muted small">보내 주신 글은 편집부가 확인한 뒤 독자칼럼에 실립니다. 실리기 전까지는 글쓴이와 편집부만 볼 수 있습니다.</p>' : '')
        + '<label>제목<input name="title" maxlength="100" required></label>'
        + '<label>내용<textarea name="body" rows="16" maxlength="20000" required></textarea></label>'
        + '<div class="file-row"><label class="btn line" for="wimg">사진 넣기</label><input type="file" id="wimg" accept="image/*" multiple hidden><span id="wimg-name" class="muted small">글을 쓰다가 사진을 넣으면 그 자리에 들어갑니다 (한 번에 여러 장, 최대 20장).</span></div>'
        + '<p class="muted small">글 안의 [[img:…]] 줄이 사진 자리입니다. 줄을 옮기면 사진 위치가 바뀌고, 지우면 사진이 빠집니다.</p>'
        + '<button class="btn" type="submit">' + (p ? '저장' : '올리기') + '</button><p id="wmsg" class="form-msg"></p></form>';
      var f = document.getElementById('wf'), busy = 0;
      if (p) { f.title.value = p.title; f.body.value = (p.image_url && p.body.indexOf(p.image_url) < 0 ? '[[img:' + p.image_url + ']]\n\n' : '') + p.body; }
      function shrink(file){
        return new Promise(function(ok){
          if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { ok(file); return; }
          var u = URL.createObjectURL(file), im = new Image();
          im.onload = function(){ var L = 1600, s = Math.min(1, L / Math.max(im.width, im.height)); if (s >= 1 && file.size < 1.5e6) { URL.revokeObjectURL(u); ok(file); return; }
            var c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
            var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
            c.toBlob(function(b){ ok(b || file); }, 'image/jpeg', 0.86); };
          im.onerror = function(){ URL.revokeObjectURL(u); ok(file); };
          im.src = u;
        });
      }
      function insertAt(txt){
        var ta = f.body, a = ta.selectionStart || ta.value.length, b = ta.selectionEnd || a, v = ta.value;
        var pre = v.slice(0, a), post = v.slice(b);
        var add = (pre && !/\n\n$/.test(pre) ? (/\n$/.test(pre) ? '\n' : '\n\n') : '') + txt + '\n\n';
        ta.value = pre + add + post.replace(/^\n+/, ''); var pos = (pre + add).length; ta.focus(); ta.setSelectionRange(pos, pos);
      }
      document.getElementById('wimg').onchange = async function(){
        var files = [].slice.call(this.files || []), nm = document.getElementById('wimg-name'); this.value = '';
        var have = PGS.postImgs(f.body.value).length;
        if (have + files.length > 20) { nm.textContent = '사진은 한 글에 20장까지 넣을 수 있습니다.'; return; }
        busy++;
        for (var i = 0; i < files.length; i++) {
          nm.textContent = '사진 올리는 중… (' + (i + 1) + '/' + files.length + ')';
          var blob = await shrink(files[i]);
          if (blob.size > 8 * 1024 * 1024) { nm.textContent = files[i].name + ': 8MB가 넘어 넣지 못했습니다.'; continue; }
          var ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : blob.type === 'image/webp' ? 'webp' : 'jpg';
          var path = me.user.id + '/' + Date.now() + '-' + i + '.' + ext;
          var up = await sb.storage.from('board-images').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
          if (up.error) { nm.textContent = '사진을 올리지 못했습니다.'; continue; }
          insertAt('[[img:' + sb.storage.from('board-images').getPublicUrl(path).data.publicUrl + ']]');
          nm.textContent = '사진 ' + (i + 1) + '장을 넣었습니다.';
        }
        busy--;
      };
      f.addEventListener('submit', async function(e){
        e.preventDefault();
        var m = document.getElementById('wmsg'), btn = f.querySelector('button[type=submit]');
        if (busy) { m.textContent = '사진을 올리는 중입니다. 잠시 뒤 다시 눌러 주세요.'; m.className = 'form-msg err'; return; }
        btn.disabled = true; m.textContent = '올리는 중입니다…'; m.className = 'form-msg';
        var row = { title: f.title.value.trim(), body: f.body.value.trim(), image_url: null };
        var r = p ? await sb.from('posts').update(row).eq('id', p.id).select('id').single() : await sb.from('posts').insert(Object.assign({ board: bd }, row)).select('id').single();
        btn.disabled = false;
        if (r.error) { m.textContent = '저장하지 못했습니다. (' + r.error.message + ')'; m.className = 'form-msg err'; return; }
        location.href = root + 'post.html?id=' + r.data.id;
      });
    });
  }
})();
