// Supabase 연결 (config.js에 주소와 anon 키가 있을 때만 연결)
(function(){
  var C = window.PGS_CONFIG || {};
  window.sb = null;
  if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) {
    window.sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  }
})();
