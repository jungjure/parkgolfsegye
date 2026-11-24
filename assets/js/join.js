// 조인게시판: 목록 / 모집글 보기·신청·수락 (?id=) / 모집글 쓰기 (?w=1, ?e=번호)
(function(){
  if (!window.sb) return;
  var root = PGS.root, esc = PGS.esc, box = document.getElementById('page-body');
  box.className = '';
  var q = new URLSearchParams(location.search);
  var WD = ['일','월','화','수','목','금','토'];
  var CT = { comment: '신청으로만 연락', phone: '전화 가능', sms: '문자 가능' };
  function kst(){ return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); }
  function ymd(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function dlabel(s){ var p = s.split('-'), d = new Date(+p[0], +p[1]-1, +p[2]); return (d.getMonth()+1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')'; }
  function tlabel(t){ return t ? t.slice(0,5) : '시간 협의'; }
  function loginUrl(){ return root + 'login.html?next=' + encodeURIComponent('join.html' + location.search); }
  function msg(t, ok){ return '<p class="form-msg ' + (ok ? 'ok' : 'err') + '">' + esc(t) + '</p>'; }
  function placeOf(j){ return j.venues ? j.venues.name : (j.place || '장소 협의'); }
  function regionOf(j){ return j.venues ? j.venues.sido + ' ' + j.venues.sigungu : ''; }
  var SEL = 'id,title,author_id,venue_id,place,play_date,play_time,need,note,status,contact,created_at,venues(name,sido,sigungu,lat,lng)';

  /* 목록 */
  function list(){
    var st = { s: q.get('s') || '' };
    sb.from('joins').select(SEL).gte('play_date', ymd(kst())).order('play_date').order('play_time').limit(300).then(function(r){
      var rows = r.data || [];
      Promise.all([PGS.nicks(rows.map(function(j){ return j.author_id; })), sb.rpc('join_counts', { ids: rows.map(function(j){ return j.id; }) }), PGS.me()]).then(function(res){
        var nk = res[0], cnt = {}, me = res[2] || {};
        ((res[1] && res[1].data) || []).forEach(function(c){ cnt[c.join_id] = c; });
        function draw(){
          var sidos = []; rows.forEach(function(j){ if (j.venues && sidos.indexOf(j.venues.sido) < 0) sidos.push(j.venues.sido); }); sidos.sort();
          var L = rows.filter(function(j){ return !st.s || (j.venues && j.venues.sido === st.s); });
          var h = '<div class="board-top"><p class="muted small">함께 칠 분을 찾는 곳입니다. 신청이 수락되면 서로 연락처를 볼 수 있습니다.</p><a class="btn" href="' + (me.user ? root + 'join.html?w=1' : loginUrl()) + '">모집글 쓰기</a></div>';
          if (sidos.length) h += '<div class="chips">' + [''].concat(sidos).map(function(s){ return '<button data-s="' + esc(s) + '"' + (st.s === s ? ' class="on"' : '') + '>' + (s ? esc(s) : '전국') + '</button>'; }).join('') + '</div>';
          h += L.length ? '<div class="evs">' + L.map(function(j){
            var c = cnt[j.id] || { accepted: 0, pending: 0 }, full = j.status === 'closed' || c.accepted >= j.need;
            return '<a class="ev jn' + (full ? ' done' : '') + '" href="' + root + 'join.html?id=' + j.id + '"><div class="ev-top"><span class="tag">' + (full ? '마감' : '모집중') + '</span>'
              + (regionOf(j) ? '<span class="reg">' + esc(regionOf(j)) + '</span>' : '') + '<span class="ev-date">' + dlabel(j.play_date) + ' ' + tlabel(j.play_time) + '</span></div>'
              + '<strong class="ev-title">' + esc(j.title || placeOf(j)) + '</strong>'
              + '<div class="ev-place">' + esc(placeOf(j)) + ' · ' + j.need + '명 모집 (수락 ' + c.accepted + ', 대기 ' + c.pending + ')</div>'
              + '<div class="vn-meta">' + esc(nk[j.author_id] || '회원') + ' · ' + CT[j.contact] + '</div></a>';
          }).join('') + '</div>' : '<p class="muted card">지금 모집 중인 글이 없습니다.</p>';
          box.innerHTML = h;
        }
        box.onclick = function(e){ var b = e.target.closest('button[data-s]'); if (b) { st.s = b.getAttribute('data-s'); draw(); } };
        draw();
      });
    });
  }

  /* 모집글 보기 */
  function view(id){
    Promise.all([sb.from('joins').select(SEL).eq('id', id).maybeSingle(), PGS.me()]).then(async function(res){
      var j = res[0].data, me = res[1] || {};
      if (!j) { box.innerHTML = '<p class="muted">모집글을 찾을 수 없습니다.</p>'; return; }
      var mine = me.user && me.user.id === j.author_id, admin = me.profile && me.profile.role === 'admin';
      var nk = await PGS.nicks([j.author_id]);
      var c = ((await sb.rpc('join_counts', { ids: [j.id] })).data || [])[0] || { accepted: 0, pending: 0 };
      document.querySelector('h1').textContent = j.title || placeOf(j);
      var place = j.venues && j.venues.lat ? '<a class="pgplace" href="' + root + 'place.html?n=' + encodeURIComponent(j.venues.name) + '&lat=' + j.venues.lat + '&lng=' + j.venues.lng + '">' + esc(placeOf(j)) + '</a>' : esc(placeOf(j));
      var h = '<div class="card jn-info"><p><b>날짜</b> ' + dlabel(j.play_date) + ' ' + tlabel(j.play_time) + '</p><p><b>장소</b> ' + place + (regionOf(j) ? ' <span class="muted small">' + esc(regionOf(j)) + '</span>' : '') + '</p>'
        + '<p><b>모집</b> ' + j.need + '명 (수락 ' + c.accepted + ', 대기 ' + c.pending + ') · ' + (j.status === 'closed' ? '마감' : '모집중') + '</p>'
        + '<p><b>글쓴이</b> ' + esc(nk[j.author_id] || '회원') + ' · ' + CT[j.contact] + '</p>'
        + (j.note ? '<div class="detail">' + PGS.text(j.note) + '</div>' : '') + '</div>';
      h += '<div id="jn-contacts"></div><div id="jn-me"></div><div id="jn-owner"></div>';
      h += '<div class="post-act">' + (mine || admin ? '<a class="btn line" href="' + root + 'join.html?e=' + j.id + '">고치기</a><button class="btn line" id="jclose">' + (j.status === 'closed' ? '다시 모집하기' : '마감하기') + '</button><button class="btn line" id="jdel">지우기</button>' : '')
        + '<a class="btn line" href="' + root + 'join.html">목록으로</a></div><div id="jask"></div>';
      box.innerHTML = h;
      if (me.user) sb.rpc('join_contacts', { jid: j.id }).then(function(r){
        var rows = r.data || [];
        if (rows.length) document.getElementById('jn-contacts').innerHTML = '<div class="card"><b>연락처</b>' + rows.map(function(x){
          return '<p>' + esc(x.who) + ' ' + esc(x.nickname) + ' ' + (x.phone ? '<a class="pgtel" href="tel:' + x.phone.replace(/\D/g,'') + '">' + esc(x.phone) + '</a>' + (j.contact === 'sms' && x.who === '글쓴이' ? ' <a href="sms:' + x.phone.replace(/\D/g,'') + '">문자 보내기</a>' : '') : '(번호 없음)') + '</p>'; }).join('') + '</div>';
      });
      // 신청하는 사람
      if (!mine) {
        var mb = document.getElementById('jn-me');
        if (!me.user) mb.innerHTML = '<p class="card muted small"><a href="' + loginUrl() + '">로그인</a>하면 참가 신청을 할 수 있습니다.</p>';
        else {
          var my = (await sb.from('join_applies').select('id,status,message').eq('join_id', j.id).eq('user_id', me.user.id).maybeSingle()).data;
          if (my) {
            mb.innerHTML = '<div class="card"><b>내 신청</b> ' + ({ pending: '수락을 기다리는 중', accepted: '수락됨', rejected: '거절됨' })[my.status] + (my.message ? '<p class="muted small">' + esc(my.message) + '</p>' : '') + '<button class="btn line" id="jcancel">신청 취소</button></div>';
            document.getElementById('jcancel').onclick = function(){ sb.from('join_applies').delete().eq('id', my.id).then(function(){ view(j.id); }); };
          } else if (j.status !== 'closed') {
            mb.innerHTML = '<form class="card form wide" id="jap"><b>참가 신청</b><label>남길 말 (선택)<textarea name="m" rows="2" maxlength="300" placeholder="예: 2명 함께 갑니다"></textarea></label><button class="btn" type="submit">신청하기</button><div id="japm"></div></form>';
            document.getElementById('jap').onsubmit = function(e){ e.preventDefault(); var t = this.m.value.trim();
              sb.from('join_applies').insert({ join_id: j.id, message: t || null }).then(function(r){ if (r.error) document.getElementById('japm').innerHTML = msg('신청하지 못했습니다.'); else view(j.id); }); };
          }
        }
      }
      // 모집한 사람: 신청자 관리
      if (mine || admin) {
        var ap = (await sb.from('join_applies').select('id,user_id,status,message,created_at').eq('join_id', j.id).order('created_at')).data || [];
        var nk2 = await PGS.nicks(ap.map(function(a){ return a.user_id; }));
        document.getElementById('jn-owner').innerHTML = '<div class="card"><b>신청자 ' + ap.length + '명</b>' + (ap.length ? '<ul class="apl">' + ap.map(function(a){
          return '<li><span><b>' + esc(nk2[a.user_id]) + '</b> <span class="muted small">' + PGS.when(a.created_at) + ' · ' + ({ pending: '대기', accepted: '수락', rejected: '거절' })[a.status] + '</span>' + (a.message ? '<br><span class="small">' + esc(a.message) + '</span>' : '') + '</span>'
            + '<span>' + (a.status !== 'accepted' ? '<button class="btn small-btn" data-acc="' + a.id + '">수락</button>' : '') + (a.status !== 'rejected' ? '<button class="btn line small-btn" data-rej="' + a.id + '">거절</button>' : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted small">아직 신청자가 없습니다.</p>') + '</div>';
      }
      box.onclick = function(e){
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.acc) sb.from('join_applies').update({ status: 'accepted' }).eq('id', b.dataset.acc).then(function(){ view(j.id); });
        if (b.dataset.rej) sb.from('join_applies').update({ status: 'rejected' }).eq('id', b.dataset.rej).then(function(){ view(j.id); });
        if (b.id === 'jclose') sb.from('joins').update({ status: j.status === 'closed' ? 'open' : 'closed' }).eq('id', j.id).then(function(){ view(j.id); });
        if (b.id === 'jdel') document.getElementById('jask').innerHTML = '<p class="form-msg err">이 모집글을 지울까요? 신청 내역도 함께 지워집니다.</p><button class="btn danger" id="jdelok">지우기</button> <button class="btn line" id="jdelno">취소</button>';
        if (b.id === 'jdelno') document.getElementById('jask').innerHTML = '';
        if (b.id === 'jdelok') sb.from('joins').delete().eq('id', j.id).then(function(){ location.href = root + 'join.html'; });
      };
    });
  }

  /* 모집글 쓰기·고치기 */
  function write(eid){
    PGS.me().then(async function(me){
      if (!me || !me.user) { location.href = loginUrl(); return; }
      var j = eid ? (await sb.from('joins').select(SEL).eq('id', eid).maybeSingle()).data : null;
      document.querySelector('h1').textContent = j ? '모집글 고치기' : '모집글 쓰기';
      var R = window.PGS_REGIONS || {};
      var today = kst(), dates = [];
      for (var i = 0; i < 60; i++) { var d = new Date(today); d.setDate(d.getDate() + i); dates.push(ymd(d)); }
      var times = ['']; for (var hh = 5; hh <= 20; hh++) { times.push(String(hh).padStart(2,'0') + ':00'); times.push(String(hh).padStart(2,'0') + ':30'); }
      box.innerHTML = '<form id="jw" class="card form wide">'
        + '<label>제목 (선택)<input name="title" maxlength="60" placeholder="예: 토요일 아침 9홀 같이 치실 분"></label>'
        + '<label>날짜<select name="d" required>' + dates.map(function(x){ return '<option value="' + x + '">' + dlabel(x) + '</option>'; }).join('') + '</select></label>'
        + '<label>시간<select name="t">' + times.map(function(x){ return '<option value="' + x + '">' + (x || '시간 협의') + '</option>'; }).join('') + '</select></label>'
        + '<label>구장 찾기<span class="row"><select name="s1"><option value="">시·도</option>' + ['강원','경기','경남','경북','광주','대구','대전','부산','서울','세종','울산','인천','전남','전북','제주','충남','충북'].map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select><select name="v" disabled><option value="">구장 선택</option></select></span></label>'
        + '<label>구장이 목록에 없으면 직접 적기<input name="place" maxlength="60"></label>'
        + '<label>모집 인원<select name="need">' + [1,2,3,4,5,6,7,8].map(function(n){ return '<option>' + n + '</option>'; }).join('') + '</select></label>'
        + '<fieldset><legend>연락 방법</legend>' + Object.keys(CT).map(function(k){ return '<label class="chk"><input type="radio" name="contact" value="' + k + '"' + (k === 'comment' ? ' checked' : '') + '> ' + CT[k] + (k !== 'comment' ? ' (로그인한 회원에게 내 번호가 보임)' : '') + '</label>'; }).join('') + '</fieldset>'
        + '<label>남길 말<textarea name="note" rows="4" maxlength="1000" placeholder="실력, 회비, 모이는 곳 등"></textarea></label>'
        + '<button class="btn" type="submit">' + (j ? '저장' : '올리기') + '</button><div id="jwm"></div></form>';
      var f = document.getElementById('jw');
      async function venuesOf(s, keep){
        f.v.innerHTML = '<option value="">구장 선택</option>'; f.v.disabled = !s; if (!s) return;
        var r = await sb.from('venues').select('id,name,sigungu').eq('sido', s).order('sigungu').order('name');
        f.v.innerHTML = '<option value="">구장 선택</option>' + (r.data || []).map(function(v){ return '<option value="' + v.id + '"' + (keep == v.id ? ' selected' : '') + '>' + esc(v.sigungu + ' · ' + v.name) + '</option>'; }).join('');
      }
      f.s1.onchange = function(){ venuesOf(this.value); };
      if (j) {
        f.title.value = j.title || ''; if (dates.indexOf(j.play_date) < 0) f.d.insertAdjacentHTML('afterbegin', '<option value="' + j.play_date + '">' + dlabel(j.play_date) + '</option>');
        f.d.value = j.play_date; f.t.value = j.play_time ? j.play_time.slice(0,5) : ''; f.need.value = j.need; f.place.value = j.place || ''; f.note.value = j.note || '';
        f.querySelector('input[value=' + j.contact + ']').checked = true;
        if (j.venues) { f.s1.value = j.venues.sido; venuesOf(j.venues.sido, j.venue_id); }
      }
      f.onsubmit = async function(e){
        e.preventDefault();
        if (!f.v.value && !f.place.value.trim()) { document.getElementById('jwm').innerHTML = msg('구장을 고르거나 직접 적어 주세요.'); return; }
        var row = { title: f.title.value.trim() || null, play_date: f.d.value, play_time: f.t.value || null, venue_id: f.v.value ? Number(f.v.value) : null,
          place: f.place.value.trim() || null, need: Number(f.need.value), contact: f.querySelector('input[name=contact]:checked').value, note: f.note.value.trim() || null };
        var r = j ? await sb.from('joins').update(row).eq('id', j.id).select('id').single() : await sb.from('joins').insert(row).select('id').single();
        if (r.error) { document.getElementById('jwm').innerHTML = msg('저장하지 못했습니다. (' + r.error.message + ')'); return; }
        location.href = root + 'join.html?id=' + r.data.id;
      };
    });
  }

  if (q.get('id')) view(q.get('id')); else if (q.get('w')) write(null); else if (q.get('e')) write(q.get('e')); else list();
})();
