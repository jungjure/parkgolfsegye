// 유튜브 @parkgolfsegye 재생목록 "오늘일정 뉴스" -> assets/newsvideo.json (news.html 영상 칸)
// 유튜브 피드는 최근 15개만 주므로, 지난 영상은 지우지 않고 새 영상만 더한다.
import fs from 'node:fs';
const FILE = 'assets/newsvideo.json';
const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { videos: [] };
const PL = old.playlist || 'PLbEt1lRSDZME';
const dec = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const r = await fetch('https://www.youtube.com/feeds/videos.xml?playlist_id=' + PL);
if (!r.ok) { console.log('feed', r.status); process.exit(0); }
const xml = await r.text();
const got = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
  const e = m[1]; const g = re => (e.match(re) || [])[1] || '';
  return { id: g(/<yt:videoId>([^<]+)/), title: dec(g(/<title>([^<]+)/)), published: g(/<published>([^<]+)/),
    desc: dec(g(/<media:description>([\s\S]*?)<\/media:description>/)).split('\n')[0].slice(0, 140) };
}).filter(v => v.id);
const map = new Map((old.videos || []).map(v => [v.id, v]));
let changed = false;
for (const v of got) { const o = map.get(v.id); if (!o || o.title !== v.title || o.desc !== v.desc) { map.set(v.id, { ...o, ...v }); changed = true; } }
if (!changed) { console.log('no change'); process.exit(0); }
const videos = [...map.values()].sort((a, b) => String(a.published).localeCompare(String(b.published)));
fs.writeFileSync(FILE, JSON.stringify({ ...old, playlist: PL, updated: new Date().toISOString(), videos }, null, 1));
console.log('newsvideo.json', videos.length);
