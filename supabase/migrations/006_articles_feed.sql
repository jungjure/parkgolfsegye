-- 006 기사 표 보강 + parkgolfnews.org 기사(feed.json 목록 + body.json 본문) 자동 가져오기
alter table public.articles add column if not exists author_name text;     -- 작성자 이름 (예: 파크골프뉴스)
alter table public.articles add column if not exists source_name text;     -- 출처 (예: 파크골프뉴스 밴드)
alter table public.articles add column if not exists source_url text;      -- 출처 링크
alter table public.articles add column if not exists embed_url text;       -- 함께 보여 줄 페이지 (뉴스레터 등)
alter table public.articles add column if not exists images text[] default '{}';  -- 사진 주소들
alter table public.articles add column if not exists source text not null default 'manual';
alter table public.articles add column if not exists source_key text;
alter table public.articles add column if not exists sort_no int default 0;  -- 같은 날짜 안 순서
create unique index if not exists articles_source_key_idx on public.articles (source_key) where source_key is not null;
create index if not exists articles_pub_idx on public.articles (is_published, published_at desc, sort_no desc);
create index if not exists articles_cat_idx on public.articles (category, published_at desc);

create or replace function public.sync_news_request() returns text
language plpgsql security definer set search_path = public, net as $$
declare a bigint; b bigint; t bigint := extract(epoch from now())::bigint;
begin
  select net.http_get(url := 'https://parkgolfnews.org/data/feed.json?t=' || t, timeout_milliseconds := 20000) into a;
  select net.http_get(url := 'https://parkgolfnews.org/data/body.json?t=' || t, timeout_milliseconds := 30000) into b;
  insert into public.sync_log (kind, request_id, note) values ('news_feed', a, 'feed.json 요청'), ('news_body', b, 'body.json 요청');
  return a || ',' || b;
end $$;

create or replace function public.sync_news_apply() returns text
language plpgsql security definer set search_path = public, net as $$
declare
  a bigint; b bigint; feed jsonb; bodies jsonb; list jsonb; n_in int; n_up int; n_del int := 0;
begin
  select request_id into a from public.sync_log where kind = 'news_feed' order by id desc limit 1;
  select request_id into b from public.sync_log where kind = 'news_body' order by id desc limit 1;
  select content::jsonb into feed from net._http_response where id = a and status_code = 200;
  select content::jsonb into bodies from net._http_response where id = b and status_code = 200;
  if feed is null or bodies is null then
    insert into public.sync_log (kind, request_id, note) values ('news_apply', a, '응답 없음 또는 실패');
    return '응답 없음';
  end if;
  list := feed -> 'tabs' -> '뉴스';
  n_in := coalesce(jsonb_array_length(list), 0);

  with src as (
    select e ->> '_b' as k, (ord - 1)::int as no,
           e ->> '제목' as title, nullif(e ->> '요약','') as summary,
           coalesce(nullif(e ->> '카테고리',''), '뉴스') as category,
           (nullif(e ->> '날짜','')::date)::timestamp at time zone 'Asia/Seoul' as pub,
           nullif(e ->> '작성자','') as author_name, nullif(e ->> '출처','') as source_name,
           nullif(e ->> '출처링크','') as source_url, nullif(e ->> '임베드','') as embed_url,
           coalesce(array_remove(regexp_split_to_array(trim(coalesce(e ->> '이미지','')), '\s+'), ''), '{}') as images,
           bodies ->> (e ->> '_b') as body
    from jsonb_array_elements(list) with ordinality as x(e, ord)
    where e ->> '공개' = 'Y' and coalesce(e ->> '_b','') <> '' and coalesce(e ->> '제목','') <> ''
      and coalesce(e ->> '날짜','') ~ '^\d{4}-\d{2}-\d{2}$'
  ), dedup as (
    select distinct on (k) * from src order by k, no desc
  ), up as (
    insert into public.articles (source, source_key, sort_no, title, summary, category, published_at, is_published,
                                 author_name, source_name, source_url, embed_url, images, cover_url, body_html, updated_at)
    select 'feed', k, no, title, summary, category, pub, true, author_name, source_name, source_url, embed_url, images,
           images[1], coalesce(body, '<p>' || coalesce(summary,'') || '</p>'), now()
    from dedup
    on conflict (source_key) where source_key is not null do update set
      sort_no = excluded.sort_no, title = excluded.title, summary = excluded.summary, category = excluded.category,
      published_at = excluded.published_at, author_name = excluded.author_name, source_name = excluded.source_name,
      source_url = excluded.source_url, embed_url = excluded.embed_url, images = excluded.images,
      cover_url = excluded.cover_url, body_html = excluded.body_html, updated_at = now()
    returning 1
  )
  select count(*) into n_up from up;

  if n_in >= 100 then
    delete from public.articles ar
    where ar.source = 'feed'
      and not exists (select 1 from jsonb_array_elements(list) e where e ->> '_b' = ar.source_key and e ->> '공개' = 'Y');
    get diagnostics n_del = row_count;
  end if;

  insert into public.sync_log (kind, request_id, rows_in, rows_upserted, rows_deleted, note)
  values ('news_apply', a, n_in, n_up, n_del, '완료');
  return format('받음 %s, 반영 %s, 삭제 %s', n_in, n_up, n_del);
end $$;

revoke all on function public.sync_news_request() from public, anon, authenticated;
revoke all on function public.sync_news_apply() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('pgs_news_request','pgs_news_apply');
select cron.schedule('pgs_news_request', '15 * * * *', 'select public.sync_news_request()');
select cron.schedule('pgs_news_apply',   '18 * * * *', 'select public.sync_news_apply()');
