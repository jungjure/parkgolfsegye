// 반응(최고예요·좋아요·싫어요) + 댓글. 기사(article), 게시글(post)에서 씀
window.PGS_COMMENTS = function(type, id){
  if (!window.sb || !id) return;
  id = Number(id);
  var esc = PGS.esc, root = PGS.root;
  var KINDS = [['best','최고예요'],['like','좋아요'],['dislike','싫어요']];
  var wrap = document.getElementById('comments');
  if (!wrap) { wrap = document.createElement('section'); wrap.id = 'comments'; document.querySelector('main').appendChild(wrap); }
  wrap.className = 'cmt-wrap';
  wrap.innerHTML = '<div class="rx" id="rx"></div><h2 class="sec">댓글 <span id="cmt-n"></span></h2><div id="cmt-form"></div><ul class="cmts" id="cmt-list"></ul>';
  var me = {};

  function loadRx(){
    sb.from('reactions').select('kind,user_id').eq('target_type', type).eq('target_id', id).then(function(r){
      var rows = r.data || [], mine = rows.filter(function(x){ return me.user && x.user_id === me.user.id; })[0];
      document.getElementById('rx').innerHTML = KINDS.map(function(k){
        var n = rows.filter(function(x){ return x.kind === k[0]; }).length;
        return '<button data-rx="' + k[0] + '" class="' + k[0] + (mine && mine.kind === k[0] ? ' on' : '') + '">' + k[1] + ' <b>' + n + '</b></button>';
      }).join('') + (me.user ? '' : '<span class="muted small">로그인하면 반응을 남길 수 있습니다.</span>');
      document.getElementById('rx').dataset.mine = mine ? mine.kind : '';
    });
  }
  function loadList(){
    sb.from('comments').select('id,body,author_id,created_at,is_hidden').eq('target_type', type).eq('target_id', id).order('created_at').then(function(r){
      var rows = r.data || [];
      PGS.nicks(rows.map(function(c){ return c.author_id; })).then(function(nk){
        document.getElementById('cmt-n').textContent = rows.filter(function(c){ return !c.is_hidden; }).length + '개';
        document.getElementById('cmt-list').innerHTML = rows.length ? rows.map(function(c){
          var mineC = me.user && c.author_id === me.user.id, admin = me.profile && me.profile.role === 'admin';
          return '<li class="cmt' + (c.is_hidden ? ' hidden-c' : '') + '"><div class="cmt-top"><b>' + esc(nk[c.author_id] || '회원') + '</b><span class="muted small">' + PGS.when(c.created_at) + (c.is_hidden ? ' · 숨김' : '') + '</span>'
            + (mineC || admin ? '<span class="cmt-act">' + (admin ? '<button data-hide="' + c.id + '" data-v="' + (c.is_hidden ? '0' : '1') + '">' + (c.is_hidden ? '보이기' : '숨기기') + '</button>' : '') + '<button data-del="' + c.id + '">지우기</button></span>' : '')
            + '</div><div class="cmt-body">' + PGS.text(c.body) + '</div></li>';
        }).join('') : '<li class="muted small">첫 댓글을 남겨 주세요.</li>';
      });
    });
  }
  function form(){
    var f = document.getElementById('cmt-form');
    if (!me.user) { f.innerHTML = '<p class="muted small card"><a href="' + root + 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) + '">로그인</a>하면 댓글을 쓸 수 있습니다.</p>'; return; }
    f.innerHTML = '<form class="cmt-new"><textarea name="body" maxlength="1000" rows="3" placeholder="댓글을 남겨 주세요 (욕설·광고는 지워질 수 있습니다)" required></textarea><button class="btn" type="submit">등록</button></form>';
    f.querySelector('form').addEventListener('submit', function(e){
      e.preventDefault();
      var t = this.body.value.trim(), fm = this; if (!t) return;
      fm.querySelector('button').disabled = true;
      sb.from('comments').insert({ target_type: type, target_id: id, body: t }).then(function(r){
        fm.querySelector('button').disabled = false;
        if (r.error) { fm.insertAdjacentHTML('beforeend', '<p class="form-msg err">댓글을 남기지 못했습니다.</p>'); return; }
        fm.reset(); loadList();
      });
    });
  }
  wrap.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rx) {
      if (!me.user) { location.href = root + 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); return; }
      var cur = document.getElementById('rx').dataset.mine, k = b.dataset.rx;
      var p = cur === k ? sb.from('reactions').delete().eq('target_type', type).eq('target_id', id).eq('user_id', me.user.id)
        : sb.from('reactions').upsert({ target_type: type, target_id: id, user_id: me.user.id, kind: k }, { onConflict: 'target_type,target_id,user_id' });
      p.then(loadRx);
    }
    if (b.dataset.del) {
      var li = b.closest('li'), box = li.querySelector('.cmt-ask');
      if (box) return;
      li.insertAdjacentHTML('beforeend', '<div class="cmt-ask">이 댓글을 지울까요? <button data-delok="' + b.dataset.del + '">지우기</button><button data-delno="1">취소</button></div>');
    }
    if (b.dataset.delno) b.closest('.cmt-ask').remove();
    if (b.dataset.delok) sb.from('comments').delete().eq('id', b.dataset.delok).then(loadList);
    if (b.dataset.hide) sb.from('comments').update({ is_hidden: b.dataset.v === '1' }).eq('id', b.dataset.hide).then(loadList);
  });
  PGS.me().then(function(m){ me = m || {}; loadRx(); form(); loadList(); });
};
