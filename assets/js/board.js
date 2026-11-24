// 독자칼럼(column)·자유게시판(free): 목록, 글 보기(post.html), 글쓰기·고치기(write.html)
(function(){
  if (!window.sb) return;
  var page = document.body.getAttribute('data-page'), root = PGS.root, esc = PGS.esc;
  var q = new URLSearchParams(location.search);
  var NAME = { column: '독자칼럼', free: '자유게시판' }, PAGE = { column: 'column.html', free: 'board.html' };
  function loginUrl(){ return root + 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); }

  /* 목록 */
  if (page === 'column' || page === 'board') {
    var board = page === 'column' ? 'column' : 'free', box = document.getElementById('page-body'), n = 0, size = 20, all = [];
    box.className = '';
    function more(){
      sb.from('posts').select('id,title,author_id,created_at,views,status').eq('board', board).order('created_at', { ascending: false }).range(n, n + size - 1).then(function(r){
        var rows = r.data || []; n += rows.length; all = all.concat(rows);
        Promise.all([PGS.nicks(all.map(function(p){ return p.author_id; })), sb.rpc('comment_counts', { t: 'post', ids: all.map(function(p){ return p.id; }) }), PGS.me()]).then(function(res){
          var nk = res[0], cc = {}, me = res[2] || {};
          ((res[1] && res[1].data) || []).forEach(function(x){ cc[x.target_id] = x.n; });
          var h = '<div class="board-top"><p class="muted small">' + (board === 'column' ? '독자 여러분의 기고를 받습니다. 보내 주신 글은 편집부 확인 뒤 실립니다.' : '회원 누구나 자유롭게 글을 쓸 수 있습니다. 욕설·광고는 지워질 수 있습니다.') + '</p>'
            + '<a class="btn" href="' + (me.user ? root + 'write.html?b=' + board : loginUrl()) + '">' + (board === 'column' ? '기고하기' : '글쓰기') + '</a></div>';
          h += all.length ? '<ul class="posts">' + all.map(function(p){
            return '<li><a href="' + root + 'post.html?id=' + p.id + '"><strong>' + (p.status === 'pending' ? '<span class="tag pend">승인 대기</span> ' : p.status === 'rejected' ? '<span class="tag rej">돌려받음</span> ' : '') + esc(p.title)
              + (cc[p.id] ? ' <span class="cc">[' + cc[p.id] + ']</span>' : '') + '</strong><span class="muted small">' + esc(nk[p.author_id] || '회원') + ' · ' + PGS.when(p.created_at) + ' · 조회 ' + p.views + '</span></a></li>';
          }).join('') + '</ul>' : '<p class="muted card">아직 글이 없습니다. 첫 글을 남겨 주세요.</p>';
          if (rows.length === size) h += '<p class="center"><button class="btn line" id="more">더 보기</button></p>';
          box.innerHTML = h;
          var mb = document.getElementById('more'); if (mb) mb.onclick = more;
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
        var h = '<div class="art-meta"><a href="' + root + PAGE[p.board] + '" class="nw-cat">' + NAME[p.board] + '</a> ' + esc(nk[p.author_id] || '회원') + ' · ' + PGS.when(p.created_at) + ' · 조회 ' + (p.views + 1)
          + (p.status === 'pending' ? ' · <span class="tag pend">승인 대기</span>' : p.status === 'rejected' ? ' · <span class="tag rej">돌려받음</span>' : '') + '</div>'
          + (p.status === 'rejected' && (mine || admin) ? '<div class="card rej-note"><b>편집부에서 돌려보냈습니다.</b>' + (p.admin_note ? '<p>' + PGS.text(p.admin_note) + '</p>' : '') + '<p class="muted small">글을 고쳐 저장하면 다시 승인 대기로 올라갑니다.</p></div>' : '');
        h += '<div class="art-body" id="post-body">' + (p.image_url ? '<p><img src="' + esc(p.image_url) + '" alt=""></p>' : '') + PGS.text(p.body) + '</div>';
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
        + '<label>내용<textarea name="body" rows="14" maxlength="20000" required></textarea></label>'
        + '<div class="file-row"><label class="btn line" for="wimg">사진 고르기</label><input type="file" id="wimg" accept="image/*" hidden><span id="wimg-name" class="muted small">' + (p && p.image_url ? '사진 1장 있음' : '사진 없음 (선택)') + '</span></div>'
        + '<button class="btn" type="submit">' + (p ? '저장' : '올리기') + '</button><p id="wmsg" class="form-msg"></p></form>';
      var f = document.getElementById('wf'), file = null;
      if (p) { f.title.value = p.title; f.body.value = p.body; }
      document.getElementById('wimg').onchange = function(){ file = this.files[0] || null; document.getElementById('wimg-name').textContent = file ? file.name : '사진 없음 (선택)'; };
      f.addEventListener('submit', async function(e){
        e.preventDefault();
        var m = document.getElementById('wmsg'), btn = f.querySelector('button[type=submit]');
        if (file && file.size > 8 * 1024 * 1024) { m.textContent = '사진은 8MB까지 올릴 수 있습니다.'; m.className = 'form-msg err'; return; }
        btn.disabled = true; m.textContent = '올리는 중입니다…'; m.className = 'form-msg';
        var img = p ? p.image_url : null;
        if (file) {
          var path = me.user.id + '/' + Date.now() + '.' + ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg');
          var up = await sb.storage.from('board-images').upload(path, file, { contentType: file.type || 'image/jpeg' });
          if (up.error) { btn.disabled = false; m.textContent = '사진을 올리지 못했습니다.'; m.className = 'form-msg err'; return; }
          img = sb.storage.from('board-images').getPublicUrl(path).data.publicUrl;
        }
        var row = { title: f.title.value.trim(), body: f.body.value.trim(), image_url: img };
        var r = p ? await sb.from('posts').update(row).eq('id', p.id).select('id').single() : await sb.from('posts').insert(Object.assign({ board: bd }, row)).select('id').single();
        btn.disabled = false;
        if (r.error) { m.textContent = '저장하지 못했습니다. (' + r.error.message + ')'; m.className = 'form-msg err'; return; }
        location.href = root + 'post.html?id=' + r.data.id;
      });
    });
  }
})();
