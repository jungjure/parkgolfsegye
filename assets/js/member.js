// 회원: 로그인, 회원가입, 비밀번호 찾기·다시 정하기, 마이페이지
(function(){
  var page = document.body.getAttribute('data-page');
  var root = document.body.getAttribute('data-root') || '';
  var C = window.PGS_CONFIG || {};
  var SITE = (C.SITE_URL || location.origin).replace(/\/$/, '');
  function $(s){ return document.querySelector(s); }
  function msg(el, t, ok){ el.textContent = t; el.className = 'form-msg ' + (ok ? 'ok' : 'err'); }
  function phoneOk(p){ return /^01[016789]-?\d{3,4}-?\d{4}$/.test(p.trim()); }
  function phoneFmt(p){ var d = p.replace(/\D/g,''); return d.length === 11 ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : d.length === 10 ? d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : p.trim(); }
  function errText(e){
    var m = (e && e.message) || '';
    if (/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않습니다.';
    if (/Email not confirmed/i.test(m)) return '가입 확인 메일의 버튼을 먼저 눌러 주세요.';
    if (/rate limit|too many/i.test(m)) return '잠시 뒤에 다시 시도해 주세요. (요청이 너무 많습니다)';
    if (/Password should be/i.test(m)) return '비밀번호는 6자 이상이어야 합니다.';
    if (/already registered/i.test(m)) return '이미 가입된 이메일입니다.';
    return '처리하지 못했습니다. (' + m + ')';
  }
  function regionSelect(s1, s2, v1, v2){
    var R = window.PGS_REGIONS || {};
    s1.innerHTML = '<option value="">시·도 선택</option>' + Object.keys(R).map(function(k){ return '<option' + (k === v1 ? ' selected' : '') + '>' + k + '</option>'; }).join('');
    function fill(v){ var l = R[s1.value] || []; s2.innerHTML = '<option value="">시·군·구 선택</option>' + l.map(function(k){ return '<option' + (k === v ? ' selected' : '') + '>' + k + '</option>'; }).join(''); s2.disabled = !l.length; }
    s1.addEventListener('change', function(){ fill(''); });
    fill(v2);
  }
  function need(){ if (!window.sb) { document.querySelector('main').insertAdjacentHTML('beforeend', '<p class="form-msg err">회원 서버에 연결하지 못했습니다.</p>'); return false; } return true; }
  if (!need()) return;

  /* 로그인 */
  if (page === 'login') {
    var f = $('#login-form'), m = $('#login-msg');
    var q = new URLSearchParams(location.search);
    if (/type=signup|confirmed/.test(location.hash + location.search)) msg(m, '가입이 끝났습니다. 로그인해 주세요.', true);
    f.addEventListener('submit', async function(e){
      e.preventDefault();
      var r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      if (r.error) return msg(m, errText(r.error));
      var next = q.get('next');
      location.href = root + (next && /^(admin\/)?[\w\-]+\.html(\?[\w=&%\-]*)?$/.test(next) ? next : 'index.html');
    });
  }

  /* 회원가입 */
  if (page === 'signup') {
    var g = $('#signup-form'), gm = $('#signup-msg');
    regionSelect(g.rg1, g.rg2, '', '');
    g.addEventListener('submit', async function(e){
      e.preventDefault();
      var nick = g.nickname.value.trim();
      if (nick.length < 2 || nick.length > 12) return msg(gm, '별명은 2~12자로 정해 주세요.');
      if (g.password.value.length < 6) return msg(gm, '비밀번호는 6자 이상이어야 합니다.');
      if (g.password.value !== g.password2.value) return msg(gm, '비밀번호 확인이 맞지 않습니다.');
      if (!phoneOk(g.phone.value)) return msg(gm, '휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)');
      if (!g.rg1.value || !g.rg2.value) return msg(gm, '지역(시·도, 시·군·구)을 골라 주세요.');
      if (!g.agree.checked || !g.age.checked) return msg(gm, '개인정보 수집·이용 동의와 만 14세 이상 확인에 체크해 주세요.');
      var btn = g.querySelector('button[type=submit]'); btn.disabled = true;
      var r = await sb.auth.signUp({
        email: g.email.value.trim(), password: g.password.value,
        options: { emailRedirectTo: SITE + '/login.html?confirmed=1', data: {
          nickname: nick, phone: phoneFmt(g.phone.value), region_sido: g.rg1.value, region_sigungu: g.rg2.value,
          newsletter_email: g.nlE.checked, newsletter_kakao: g.nlK.checked, agreed: true } }
      });
      btn.disabled = false;
      if (r.error) return msg(gm, errText(r.error));
      if (r.data && r.data.user && r.data.user.identities && !r.data.user.identities.length) return msg(gm, '이미 가입된 이메일입니다. 로그인하시거나 비밀번호 찾기를 이용해 주세요.');
      g.innerHTML = '<div class="card"><b>가입 신청이 접수되었습니다.</b><p>' + g.email.value.replace(/[<>&]/g,'') + ' 로 보낸 <b>[파크골프세계] 회원가입을 확인해 주세요</b> 메일의 버튼을 누르면 가입이 끝납니다. 메일이 안 보이면 스팸함도 확인해 주세요.</p><p><a class="btn" href="' + root + 'login.html">로그인 화면으로</a></p></div>';
    });
  }

  /* 비밀번호 찾기 (메일 보내기) */
  if (page === 'find') {
    var h = $('#find-form'), hm = $('#find-msg');
    h.addEventListener('submit', async function(e){
      e.preventDefault();
      var r = await sb.auth.resetPasswordForEmail(h.email.value.trim(), { redirectTo: SITE + '/reset.html' });
      if (r.error) return msg(hm, errText(r.error));
      msg(hm, '메일을 보냈습니다. [파크골프세계] 비밀번호 다시 정하기 메일의 버튼을 눌러 주세요.', true);
    });
  }

  /* 새 비밀번호 정하기 (메일 버튼으로 들어옴) */
  if (page === 'reset') {
    var k = $('#reset-form'), km = $('#reset-msg');
    sb.auth.getSession().then(function(s){ if (!s.data.session) msg(km, '메일의 버튼을 눌러 이 화면으로 들어와야 합니다. 링크가 오래되었으면 비밀번호 찾기를 다시 해 주세요.'); });
    k.addEventListener('submit', async function(e){
      e.preventDefault();
      if (k.password.value.length < 6) return msg(km, '비밀번호는 6자 이상이어야 합니다.');
      if (k.password.value !== k.password2.value) return msg(km, '비밀번호 확인이 맞지 않습니다.');
      var r = await sb.auth.updateUser({ password: k.password.value });
      if (r.error) return msg(km, errText(r.error));
      msg(km, '비밀번호를 바꿨습니다. 이제 새 비밀번호로 로그인됩니다.', true);
      setTimeout(function(){ location.href = root + 'index.html'; }, 1500);
    });
  }

  /* 마이페이지 */
  if (page === 'mypage') {
    var box = $('#mypage');
    sb.auth.getUser().then(async function(u){
      var user = u.data && u.data.user;
      if (!user) { location.href = root + 'login.html?next=mypage.html'; return; }
      var p = (await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()).data || {};
      box.innerHTML = '<form id="my-form" class="card form">'
        + '<label>이메일 (로그인 아이디)<input value="' + user.email.replace(/"/g,'') + '" disabled></label>'
        + '<label>별명 (글·댓글에 보임)<input name="nickname" maxlength="12" required></label>'
        + '<label>휴대폰 (관리자만 봄)<input name="phone" type="tel" inputmode="numeric" maxlength="13" placeholder="010-1234-5678"></label>'
        + '<label>지역<span class="row"><select name="rg1"></select><select name="rg2"></select></span></label>'
        + '<fieldset><legend>파크골프 뉴스레터 받기 (선택)</legend><label class="chk"><input type="checkbox" name="nlE"> 이메일로 받기</label><label class="chk"><input type="checkbox" name="nlK"> 카카오톡으로 받기</label></fieldset>'
        + '<button class="btn" type="submit">저장</button><p id="my-msg" class="form-msg"></p></form>'
        + '<form id="pw-form" class="card form"><b>비밀번호 바꾸기</b>'
        + '<label>새 비밀번호<input name="password" type="password" autocomplete="new-password" minlength="6" required></label>'
        + '<label>새 비밀번호 확인<input name="password2" type="password" autocomplete="new-password" minlength="6" required></label>'
        + '<button class="btn" type="submit">비밀번호 바꾸기</button><p id="pw-msg" class="form-msg"></p></form>'
        + '<div class="card form"><b>로그아웃·탈퇴</b><div class="row"><button class="btn line" id="logout2" type="button">로그아웃</button><button class="btn danger" id="leave" type="button">회원 탈퇴</button></div><div id="leave-box"></div></div>';
      var mf = $('#my-form');
      mf.nickname.value = p.nickname || ''; mf.phone.value = p.phone || '';
      mf.nlE.checked = !!p.newsletter_email; mf.nlK.checked = !!p.newsletter_kakao;
      regionSelect(mf.rg1, mf.rg2, p.region_sido || '', p.region_sigungu || '');
      mf.addEventListener('submit', async function(e){
        e.preventDefault();
        var mm = $('#my-msg'), nick = mf.nickname.value.trim();
        if (nick.length < 2 || nick.length > 12) return msg(mm, '별명은 2~12자로 정해 주세요.');
        if (mf.phone.value && !phoneOk(mf.phone.value)) return msg(mm, '휴대폰 번호를 확인해 주세요.');
        if (!mf.rg1.value || !mf.rg2.value) return msg(mm, '지역을 골라 주세요.');
        var r = await sb.from('profiles').update({ nickname: nick, phone: mf.phone.value ? phoneFmt(mf.phone.value) : null,
          region_sido: mf.rg1.value, region_sigungu: mf.rg2.value, newsletter_email: mf.nlE.checked, newsletter_kakao: mf.nlK.checked,
          newsletter_opt_in: mf.nlE.checked || mf.nlK.checked, updated_at: new Date().toISOString() }).eq('id', user.id);
        if (r.error) return msg(mm, errText(r.error));
        msg(mm, '저장했습니다.', true);
      });
      var pf = $('#pw-form');
      pf.addEventListener('submit', async function(e){
        e.preventDefault();
        var pm = $('#pw-msg');
        if (pf.password.value !== pf.password2.value) return msg(pm, '비밀번호 확인이 맞지 않습니다.');
        var r = await sb.auth.updateUser({ password: pf.password.value });
        if (r.error) return msg(pm, errText(r.error));
        pf.reset(); msg(pm, '비밀번호를 바꿨습니다.', true);
      });
      $('#logout2').onclick = function(){ PGS_AUTH.signOut(); };
      $('#leave').onclick = function(){
        $('#leave-box').innerHTML = '<p class="form-msg err">탈퇴하면 회원 정보와 내가 쓴 글·댓글이 모두 지워지고 되돌릴 수 없습니다. 정말 탈퇴하시겠습니까?</p>'
          + '<div class="row"><button class="btn danger" id="leave-yes" type="button">탈퇴하기</button><button class="btn line" id="leave-no" type="button">취소</button></div>';
        $('#leave-no').onclick = function(){ $('#leave-box').innerHTML = ''; };
        $('#leave-yes').onclick = async function(){
          var r = await sb.rpc('delete_my_account');
          if (r.error) return msg($('#leave-box'), errText(r.error));
          await sb.auth.signOut();
          location.href = root + 'index.html';
        };
      };
    });
  }
})();
