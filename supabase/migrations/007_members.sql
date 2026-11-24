-- 007 회원 정보 보강 (휴대폰, 뉴스레터 받는 방법) + 본인 탈퇴
alter table public.profiles add column if not exists phone text;                       -- 휴대폰 (본인·관리자만 봄)
alter table public.profiles add column if not exists newsletter_email boolean not null default false;
alter table public.profiles add column if not exists newsletter_kakao boolean not null default false;
alter table public.profiles add column if not exists agreed_at timestamptz;            -- 개인정보 수집·이용 동의 시각
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, nickname, region_sido, region_sigungu, phone, newsletter_email, newsletter_kakao,
                               newsletter_opt_in, agreed_at)
  values (
    new.id,
    coalesce(nullif(m->>'nickname',''), split_part(new.email,'@',1)),
    nullif(m->>'region_sido',''), nullif(m->>'region_sigungu',''), nullif(m->>'phone',''),
    coalesce((m->>'newsletter_email')::boolean, false), coalesce((m->>'newsletter_kakao')::boolean, false),
    coalesce((m->>'newsletter_email')::boolean, false) or coalesce((m->>'newsletter_kakao')::boolean, false),
    case when (m->>'agreed')::boolean then now() end
  );
  return new;
end $$;

-- 본인 탈퇴: 로그인한 본인 계정만 지움 (회원 정보·글·댓글은 함께 지워짐)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
