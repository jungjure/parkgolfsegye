-- 005 일정 표 보강 + parkgolfnews.org 일정(feed.json) 자동 가져오기
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('대회','접수','연습라운딩','행사','교육'));
alter table public.events add column if not exists region text;      -- 지역 (예: 경남)
alter table public.events add column if not exists place text;       -- 장소 글자 (구장 표와 연결 전)
alter table public.events add column if not exists link text;        -- 접수처·안내 링크
alter table public.events add column if not exists detail text;      -- 상세 안내
alter table public.events add column if not exists source text not null default 'manual';  -- feed(자동) / manual(직접 입력)
alter table public.events add column if not exists source_key text;  -- 자동 가져오기 구분값
alter table public.events add column if not exists updated_at timestamptz not null default now();
create unique index if not exists events_source_key_idx on public.events (source_key) where source_key is not null;
create index if not exists events_dates_idx on public.events (starts_on, ends_on);

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 가져오기 기록
create table if not exists public.sync_log (
  id bigint generated always as identity primary key,
  kind text not null,
  request_id bigint,
  rows_in int,
  rows_upserted int,
  rows_deleted int,
  note text,
  created_at timestamptz not null default now()
);
alter table public.sync_log enable row level security;
create policy "sync_log_admin" on public.sync_log for select using (public.is_admin());

-- 1단계: feed.json 내려받기 요청
create or replace function public.sync_events_request() returns bigint
language plpgsql security definer set search_path = public, net as $$
declare rid bigint;
begin
  select net.http_get(url := 'https://parkgolfnews.org/data/feed.json?t=' || extract(epoch from now())::bigint,
                      timeout_milliseconds := 20000) into rid;
  insert into public.sync_log (kind, request_id, note) values ('request', rid, 'feed.json 요청');
  return rid;
end $$;

-- 2단계: 받은 내용을 일정 표에 반영 (공개=Y 만)
create or replace function public.sync_events_apply() returns text
language plpgsql security definer set search_path = public, net as $$
declare
  rid bigint; body jsonb; cal jsonb; n_in int; n_up int; n_del int := 0;
begin
  select request_id into rid from public.sync_log where kind = 'request' order by id desc limit 1;
  if rid is null then return '요청 기록 없음'; end if;
  select content::jsonb into body from net._http_response where id = rid and status_code = 200;
  if body is null then
    insert into public.sync_log (kind, request_id, note) values ('apply', rid, '응답 없음 또는 실패');
    return '응답 없음';
  end if;
  cal := body -> 'tabs' -> '캘린더';
  n_in := coalesce(jsonb_array_length(cal), 0);

  with src as (
    select e ->> '_d' as k, e ->> '구분' as kind, e ->> '대회명' as title,
           nullif(e ->> '시작일','')::date as s, nullif(e ->> '종료일','')::date as t,
           nullif(e ->> '지역','') as region, nullif(e ->> '장소','') as place,
           nullif(e ->> '링크','') as link, nullif(e ->> '상세','') as detail
    from jsonb_array_elements(cal) e
    where e ->> '공개' = 'Y' and coalesce(e ->> '_d','') <> '' and coalesce(e ->> '시작일','') <> ''
      and e ->> '구분' in ('대회','접수','연습라운딩','행사','교육')
  ), dedup as (
    select distinct on (k) * from src order by k
  ), up as (
    insert into public.events (source, source_key, kind, title, starts_on, ends_on, region, place, link, detail, updated_at)
    select 'feed', k, kind, title, s, t, region, place, link, detail, now() from dedup
    on conflict (source_key) where source_key is not null do update set
      kind = excluded.kind, title = excluded.title, starts_on = excluded.starts_on, ends_on = excluded.ends_on,
      region = excluded.region, place = excluded.place, link = excluded.link, detail = excluded.detail, updated_at = now()
    returning 1
  )
  select count(*) into n_up from up;

  -- 원본에서 사라진 자동 일정은 지움 (원본이 100건 이상으로 정상일 때만)
  if n_in >= 100 then
    delete from public.events ev
    where ev.source = 'feed'
      and not exists (select 1 from jsonb_array_elements(cal) e where e ->> '_d' = ev.source_key and e ->> '공개' = 'Y');
    get diagnostics n_del = row_count;
  end if;

  insert into public.sync_log (kind, request_id, rows_in, rows_upserted, rows_deleted, note)
  values ('apply', rid, n_in, n_up, n_del, '완료');
  return format('받음 %s, 반영 %s, 삭제 %s', n_in, n_up, n_del);
end $$;

revoke all on function public.sync_events_request() from public, anon, authenticated;
revoke all on function public.sync_events_apply() from public, anon, authenticated;

-- 매시 10분에 요청, 12분에 반영 (원본은 매일 새벽 갱신)
select cron.unschedule(jobid) from cron.job where jobname in ('pgs_events_request','pgs_events_apply');
select cron.schedule('pgs_events_request', '10 * * * *', 'select public.sync_events_request()');
select cron.schedule('pgs_events_apply',   '12 * * * *', 'select public.sync_events_apply()');
