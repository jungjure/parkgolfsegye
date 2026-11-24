-- 001 표(테이블) 만들기
-- Supabase > SQL Editor 에 붙여 넣고 실행합니다. (001 -> 002 -> 003 순서)

-- 회원 (로그인 정보는 Supabase auth.users에, 나머지는 여기에)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  region_sido text,                 -- 시·도
  region_sigungu text,              -- 시·군·구
  role text not null default 'member' check (role in ('member','editor','admin')),
  newsletter_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- 구장 (일정, 기사, 뉴스레터가 모두 같은 좌표를 씀)
create table if not exists public.venues (
  id bigint generated always as identity primary key,
  name text not null,
  aliases text[] default '{}',      -- 다른 이름
  address text,
  sido text,
  sigungu text,
  lat double precision,
  lng double precision,
  holes int,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

-- 대회·행사 일정
create table if not exists public.events (
  id bigint generated always as identity primary key,
  title text not null,
  kind text not null default '대회' check (kind in ('대회','접수','행사','교육')),
  starts_on date not null,
  ends_on date,
  venue_id bigint references public.venues(id),
  host text,                        -- 주최·주관
  apply_url text,                   -- 접수처
  description text,
  is_trial boolean not null default false,  -- 시범운영
  created_at timestamptz not null default now()
);

-- 뉴스 기사
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  title text not null,
  summary text,
  body_html text,
  cover_url text,
  category text,
  author_id uuid references public.profiles(id),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 독자칼럼(column), 자유게시판(free)
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  board text not null check (board in ('column','free')),
  title text not null,
  body text not null,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 댓글 (기사, 게시글, 일정 공통)
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('article','post','event')),
  target_id bigint not null,
  body text not null,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_target_idx on public.comments (target_type, target_id);

-- 반응 (최고예요 best / 좋아요 like / 싫어요 dislike), 글마다 한 사람 하나
create table if not exists public.reactions (
  target_type text not null check (target_type in ('article','post','event')),
  target_id bigint not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('best','like','dislike')),
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, user_id)
);

-- 조인게시판 모집글
create table if not exists public.joins (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  venue_id bigint references public.venues(id),
  play_date date not null,
  play_time time,
  need int not null default 1 check (need between 1 and 20),
  note text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

-- 조인 신청
create table if not exists public.join_applies (
  id bigint generated always as identity primary key,
  join_id bigint not null references public.joins(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (join_id, user_id)
);

-- 파크톡
create table if not exists public.talk_messages (
  id bigint generated always as identity primary key,
  room text not null default 'all',
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

-- 뉴스레터 구독자
create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  region text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- 방문 통계
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  user_agent text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views (created_at);

-- 다른 사람에게 보여 줄 회원 정보는 별명만
create or replace view public.public_profiles as
  select id, nickname from public.profiles;

-- 회원가입하면 profiles 줄을 자동으로 만듦
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, region_sido, region_sigungu)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'region_sido',
    new.raw_user_meta_data->>'region_sigungu'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
