// rss.xml · sitemap.xml 자동 생성 (네이버·구글 검색 등록용)
// GitHub Actions(.github/workflows/feed.yml)가 매시간 실행합니다.
// 데이터: Supabase articles 표 (공개용 publishable 키만 사용, 관리자 키 없음)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const SITE = 'https://parkgolfsegye.co.kr';
const SB_URL = 'https://rzteighnvqroxuqqwhov.supabase.co';
const SB_KEY = 'sb_publishable_DV2c-2cLZQN3gdBzCKzHpg_VHyTMCtc';
const STATIC = ['/', '/schedule.html', '/venues.html', '/news.html', '/course.html', '/column.html', '/board.html', '/join.html', '/privacy.html'];

const esc = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function getAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SB_URL}/rest/v1/articles?select=id,title,summary,category,published_at,cover_url&is_published=eq.true&order=published_at.desc,sort_no.desc`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Range: `${from}-${from + 999}` }
    });
    if (!r.ok) throw new Error('Supabase ' + r.status + ' ' + await r.text());
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const list = await getAll();
if (!list.length) throw new Error('기사 0건: 파일을 바꾸지 않습니다');

const items = list.slice(0, 50).map(a => {
  const link = `${SITE}/article.html?id=${a.id}`;
  return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(a.summary || a.title)}</description>
      <category>${esc(a.category || '뉴스')}</category>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    </item>`;
}).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>파크골프세계</title>
    <link>${SITE}/</link>
    <description>파크골프 대회 일정 · 구장 정보 · 파크골프 소식</description>
    <language>ko</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date(list[0].published_at).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

const urls = STATIC.map(p => `  <url><loc>${SITE}${p}</loc></url>`)
  .concat(list.map(a => `  <url><loc>${SITE}/article.html?id=${a.id}</loc><lastmod>${String(a.published_at).slice(0, 10)}</lastmod></url>`));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

const write = (f, t) => { if (!existsSync(f) || readFileSync(f, 'utf8') !== t) { writeFileSync(f, t); console.log('updated', f); } };
write('rss.xml', rss);
write('sitemap.xml', sitemap);
console.log('articles', list.length);
