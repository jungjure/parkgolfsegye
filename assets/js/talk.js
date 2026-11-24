// 파크톡: 회원끼리 실시간 대화 (로그인한 회원만 읽고 씀)
(function(){
  if (!window.sb) return;
  var root = PGS.root, esc = PGS.esc, box = document.getElementById('page-body');
  box.className = '';
  PGS.me().then(async function(me){
    if (!me || !me.user) { box.innerHTML = '<p class="card muted"><a href="' + root + 'login.html?next=talk.html">로그인</a>한 회원만 파크톡을 볼 수 있습니다.</p>'; return; }
    var admin = me.profile && me.profile.role === 'admin';
    box.innerHTML = '<div class="talk"><div class="talk-list" id="tl"></div><form class="talk-in" id="tf"><textarea name="m" rows="2" maxlength="1000" placeholder="메시지를 입력하세요 (Enter 보내기, Shift+Enter 줄바꿈)" required></textarea><button class="btn" type="submit">보내기</button></form></div><p class="muted small">욕설·광고·개인정보는 지워질 수 있습니다.</p>';
    var tl = document.getElementById('tl'), msgs = [];
    async function draw(stick){
      var nk = await PGS.nicks(msgs.map(function(m){ return m.user_id; }));
      var nearBottom = tl.scrollHeight - tl.scrollTop - tl.clientHeight < 80;
      tl.innerHTML = msgs.length ? msgs.map(function(m){
        var mine = m.user_id === me.user.id;
        return '<div class="tm' + (mine ? ' mine' : '') + '" data-id="' + m.id + '">' + (mine ? '' : '<b>' + esc(nk[m.user_id] || '회원') + '</b>')
          + '<div class="tb">' + PGS.text(m.body) + '</div><span class="muted small">' + PGS.when(m.created_at) + (mine || admin ? ' <button data-del="' + m.id + '">지우기</button>' : '') + '</span></div>';
      }).join('') : '<p class="muted small center">첫 인사를 남겨 주세요.</p>';
      if (stick || nearBottom) tl.scrollTop = tl.scrollHeight;
    }
    var r = await sb.from('talk_messages').select('id,user_id,body,created_at').eq('room', 'all').order('created_at', { ascending: false }).limit(100);
    msgs = (r.data || []).reverse(); draw(true);
    sb.channel('talk-all').on('postgres_changes', { event: '*', schema: 'public', table: 'talk_messages' }, function(p){
      if (p.eventType === 'INSERT' && !msgs.some(function(m){ return m.id === p.new.id; })) { msgs.push(p.new); draw(p.new.user_id === me.user.id); }
      if (p.eventType === 'DELETE') { msgs = msgs.filter(function(m){ return m.id !== p.old.id; }); draw(false); }
    }).subscribe();
    var f = document.getElementById('tf');
    function send(){
      var t = f.m.value.trim(); if (!t) return;
      f.m.value = '';
      sb.from('talk_messages').insert({ body: t, room: 'all' }).select('id,user_id,body,created_at').single().then(function(x){
        if (x.data && !msgs.some(function(m){ return m.id === x.data.id; })) { msgs.push(x.data); draw(true); }
      });
    }
    f.onsubmit = function(e){ e.preventDefault(); send(); };
    f.m.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    tl.addEventListener('click', function(e){ var b = e.target.closest('button[data-del]'); if (!b) return;
      sb.from('talk_messages').delete().eq('id', b.dataset.del).then(function(){ msgs = msgs.filter(function(m){ return String(m.id) !== b.dataset.del; }); draw(false); }); });
  });
})();
