-- 014 통계: 날짜별 방문·들어온 곳·기기를 "한 사람(기기) 하루 1번" 기준으로 셈 (2026-11-27 사용자 "날짜별 방문은 한사람이 두번들어와도 한번으로")
-- 들어온 곳 = 그날 그 사람이 처음 연 화면의 출처 (홈페이지 안에서 옮겨 다닌 화면은 세지 않음)
create or replace function public.admin_stats(days int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' - make_interval(days => greatest(days,1) - 1);
begin
  if not public.is_admin() then raise exception '관리자만 볼 수 있습니다'; end if;
  return (
    with v as (
      select (created_at at time zone 'Asia/Seoul')::date d, coalesce(visitor, 'x' || id::text) who, created_at, path, title, referrer, device
      from public.page_views where created_at >= since),
    visits as (   -- 한 사람 하루 1번: 그날 처음 연 화면
      select distinct on (d, who) d, who, referrer, device from v order by d, who, created_at),
    src as (
      select case when referrer is null or referrer ~ '^https?://(www\.)?parkgolfsegye\.co\.kr' then '직접 입력·즐겨찾기'
                  when referrer ~ '^android-app://com\.google\.android\.googlequicksearchbox' then '구글 앱'
                  else coalesce(substring(referrer from '^[a-z-]+://([^/]+)'), referrer) end host from visits)
    select jsonb_build_object(
      'daily', (select coalesce(jsonb_agg(x order by x.d), '[]') from (
          select to_char(d, 'YYYY-MM-DD') d, count(*) pv, count(distinct who) uv from v group by v.d) x),
      'pages', (select coalesce(jsonb_agg(x), '[]') from (
          select path, max(title) title, count(*) pv, count(distinct who) uv from v group by path order by 3 desc limit 20) x),
      'refs', (select coalesce(jsonb_agg(x), '[]') from (select host, count(*) n from src group by 1 order by 2 desc limit 15) x),
      'devices', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(device, '알 수 없음') device, count(*) n from visits group by 1 order by 2 desc) x),
      'total', jsonb_build_object('pv', (select count(*) from v), 'visits', (select count(*) from visits), 'uv', (select count(distinct who) from v))
    ));
end $$;
revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;
