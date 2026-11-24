-- 010 관리자 화면: 칼럼 돌려보내기(반려), 회원 목록(이메일·최근 로그인 포함) 함수
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('pending','published','rejected'));
alter table public.posts add column if not exists admin_note text;   -- 돌려보낼 때 남기는 말 (글쓴이만 봄)

create or replace function public.posts_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := case when new.board = 'column' and not public.is_editor() then 'pending' else 'published' end;
    new.admin_note := null;
    new.author_id := coalesce(auth.uid(), new.author_id);
  else
    if not public.is_editor() then
      new.board := old.board; new.admin_note := old.admin_note;
      -- 돌려받은 칼럼을 글쓴이가 고치면 다시 승인 대기로
      new.status := case when old.status = 'rejected' and old.board = 'column' then 'pending' else old.status end;
    end if;
    new.author_id := old.author_id;
    new.updated_at := now();
  end if;
  return new;
end $$;

-- 회원 목록 (관리자만)
create or replace function public.admin_members() returns table(
  id uuid, email text, nickname text, phone text, region_sido text, region_sigungu text, role text,
  newsletter_email boolean, newsletter_kakao boolean, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception '관리자만 볼 수 있습니다'; end if;
  return query select p.id, u.email::text, p.nickname, p.phone, p.region_sido, p.region_sigungu, p.role,
    p.newsletter_email, p.newsletter_kakao, p.created_at, u.last_sign_in_at, u.email_confirmed_at is not null
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end $$;
revoke all on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

-- 등급 바꾸기 (관리자만, 자기 자신은 못 바꿈)
create or replace function public.admin_set_role(uid uuid, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '관리자만 바꿀 수 있습니다'; end if;
  if uid = auth.uid() then raise exception '자기 등급은 바꿀 수 없습니다'; end if;
  if r not in ('member','editor','admin') then raise exception '등급 값이 틀렸습니다'; end if;
  update public.profiles set role = r, updated_at = now() where id = uid;
end $$;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
