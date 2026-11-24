-- 011 방문 통계(IP 저장 안 함, 1년 뒤 자동 삭제) + 사이트 설정(공지 띠)

/* ---- 방문 기록 ---- */
alter table public.page_views add column if not exists visitor text;     -- 브라우저에 저장되는 임의의 방문자 식별값
alter table public.page_views add column if not exists device text;      -- 휴대폰 / PC / 태블릿
alter table public.page_views add column if not exists browser text;
alter table public.page_views add column if not exists screen_w int;
alter table public.page_views add column if not exists title text;

create or replace function public.page_views_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := null;                                    -- 회원 번호는 남기지 않음
  new.path := left(coalesce(new.path, ''), 300);
  new.referrer := nullif(left(coalesce(new.referrer, ''), 300), '');
  new.user_agent := null;                                 -- 기기 종류만 따로 남기고 원문은 버림
  new.visitor := left(new.visitor, 40); new.device := left(new.device, 10); new.browser := left(new.browser, 20);
  new.title := left(new.title, 200);
  new.created_at := now();
  return new;
end $$;
drop trigger if exists page_views_guard_trg on public.page_views;
create trigger page_views_guard_trg before insert on public.page_views for each row execute function public.page_views_guard();

select cron.unschedule(jobid) from cron.job where jobname = 'pgs_views_cleanup';
select cron.schedule('pgs_views_cleanup', '30 3 * * *', $c$delete from public.page_views where created_at < now() - interval '1 year'$c$);

-- 통계 (관리자만): 기간(일) 안의 날짜별 방문, 많이 본 화면, 들어온 곳, 기기
create or replace function public.admin_stats(days int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' - make_interval(days => greatest(days,1) - 1);
begin
  if not public.is_admin() then raise exception '관리자만 볼 수 있습니다'; end if;
  return jsonb_build_object(
    'daily', (select coalesce(jsonb_agg(x order by d), '[]') from (
        select to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') d, count(*) pv, count(distinct visitor) uv
        from public.page_views where created_at >= since group by 1) x),
    'pages', (select coalesce(jsonb_agg(x), '[]') from (
        select path, max(title) title, count(*) pv, count(distinct visitor) uv from public.page_views where created_at >= since group by path order by 3 desc limit 20) x),
    'refs', (select coalesce(jsonb_agg(x), '[]') from (
        select coalesce(substring(referrer from '^https?://([^/]+)'), '직접 입력·즐겨찾기') host, count(*) n
        from public.page_views where created_at >= since and (referrer is null or referrer !~ '^https?://(www\.)?parkgolfsegye\.co\.kr') group by 1 order by 2 desc limit 15) x),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (
        select coalesce(device, '알 수 없음') device, count(*) n from public.page_views where created_at >= since group by 1 order by 2 desc) x),
    'total', (select jsonb_build_object('pv', count(*), 'uv', count(distinct visitor)) from public.page_views where created_at >= since)
  );
end $$;
revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;

/* ---- 사이트 설정 ---- */
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "settings_read" on public.site_settings;
drop policy if exists "settings_admin" on public.site_settings;
create policy "settings_read" on public.site_settings for select using (true);
create policy "settings_admin" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
insert into public.site_settings (key, value) values ('notice', ''), ('notice_link', '') on conflict (key) do nothing;
