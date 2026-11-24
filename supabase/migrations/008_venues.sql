-- 008 구장 표 보강 (체육회·파크골프협회 파크골프장 명단 시트에서 가져옴)
alter table public.venues add column if not exists region_full text;   -- 예: 강원특별자치도 강릉시
alter table public.venues add column if not exists operator text;      -- 관리주체
alter table public.venues add column if not exists area text;          -- 부지면적(㎡)
alter table public.venues add column if not exists built text;         -- 준공연도
alter table public.venues add column if not exists fees jsonb default '{}'::jsonb;  -- 사용료
alter table public.venues add column if not exists homepage text;
alter table public.venues add column if not exists map_address text;   -- 지도에서 찾은 주소
alter table public.venues add column if not exists kakao_id text;
alter table public.venues add column if not exists source text not null default 'manual';
alter table public.venues add column if not exists source_key text;
alter table public.venues add column if not exists updated_at timestamptz not null default now();
create unique index if not exists venues_source_key_idx on public.venues (source_key) where source_key is not null;
create index if not exists venues_region_idx on public.venues (sido, sigungu);
