-- 015 유튜브 영상 목록 (2026-11-28 사용자 "유튜브업로드한것도 나오게 해줘")
-- 메뉴 아래 '오늘의 소식' 띠(assets/js/ticker.js)에 오늘 올린 유튜브 영상도 함께 보여 주기 위해
-- 두 채널의 공개 RSS(youtube.com/feeds/videos.xml)를 10분마다 받아 yt_videos 표에 넣는다. API 키 필요 없음.
--   UC2--rmZvfyTbchzAU1bDq2g = @파크골프세계 (오늘의뉴스, jungjure)
--   UCAFM9tqG9ddSDHU4_Yi2QWA = @parkgolfsegye (입문시리즈)
create table if not exists public.yt_videos (
  video_id text primary key,
  channel_id text not null,
  title text not null,
  published_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists yt_videos_pub_idx on public.yt_videos (published_at desc);
alter table public.yt_videos enable row level security;
drop policy if exists yt_videos_read on public.yt_videos;
create policy yt_videos_read on public.yt_videos for select to anon, authenticated using (true);
grant select on public.yt_videos to anon, authenticated;

create table if not exists public.yt_sync_req (
  req_id bigint primary key,
  channel_id text not null,
  created_at timestamptz not null default now()
);
alter table public.yt_sync_req enable row level security;
revoke all on public.yt_sync_req from anon, authenticated;

create or replace function public.yt_sync_request() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare ch text; rid bigint;
begin
  foreach ch in array array['UC2--rmZvfyTbchzAU1bDq2g','UCAFM9tqG9ddSDHU4_Yi2QWA'] loop
    select net.http_get('https://www.youtube.com/feeds/videos.xml?channel_id=' || ch) into rid;
    insert into public.yt_sync_req (req_id, channel_id) values (rid, ch) on conflict do nothing;
  end loop;
end $$;

create or replace function public.yt_unesc(s text) returns text language sql immutable as $$
  select replace(replace(replace(replace(replace(coalesce(s,''), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&amp;', '&')
$$;

create or replace function public.yt_sync_apply() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare r record; doc xml; e xml; n integer := 0;
  ns text[][] := array[array['a','http://www.w3.org/2005/Atom'], array['yt','http://www.youtube.com/xml/schemas/2015']];
begin
  for r in select q.req_id, q.channel_id, h.status_code, h.content from public.yt_sync_req q join net._http_response h on h.id = q.req_id loop
    if r.status_code = 200 and r.content is not null then
      begin
        doc := xmlparse(document regexp_replace(r.content, '^\s*<\?xml[^>]*\?>', ''));
        foreach e in array xpath('/a:feed/a:entry', doc, ns) loop
          insert into public.yt_videos (video_id, channel_id, title, published_at, updated_at)
          values ((xpath('/a:entry/yt:videoId/text()', e, ns))[1]::text, r.channel_id,
                  public.yt_unesc((xpath('/a:entry/a:title/text()', e, ns))[1]::text),
                  ((xpath('/a:entry/a:published/text()', e, ns))[1]::text)::timestamptz, now())
          on conflict (video_id) do update set title = excluded.title, updated_at = now();
          n := n + 1;
        end loop;
      exception when others then null;
      end;
    end if;
    delete from public.yt_sync_req where req_id = r.req_id;
  end loop;
  delete from public.yt_sync_req where created_at < now() - interval '1 hour';
  return n;
end $$;
revoke all on function public.yt_sync_request() from public, anon, authenticated;
revoke all on function public.yt_sync_apply() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('pgs_yt_request','pgs_yt_apply');
select cron.schedule('pgs_yt_request', '*/10 * * * *', 'select public.yt_sync_request()');
select cron.schedule('pgs_yt_apply', '2-59/10 * * * *', 'select public.yt_sync_apply()');
