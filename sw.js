// 파크골프세계 설치용 서비스워커 (2026-11-27 "바탕화면 설치")
// 저장(캐시)은 하지 않고 항상 인터넷에서 새로 받음. 인터넷이 끊겼을 때만 안내 화면을 보여 줌.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function(){
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>파크골프세계</title><body style="font-family:\'Pretendard Variable\',Pretendard,\'Noto Sans KR\',sans-serif;text-align:center;padding:60px 20px;color:#333"><h2 style="color:#0b4d32">파크골프세계</h2><p>인터넷에 연결되어 있지 않습니다.<br>연결된 뒤 다시 열어 주세요.</p></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
