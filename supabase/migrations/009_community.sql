-- 009 게시판(독자칼럼 승인제), 댓글 숨김, 조인게시판(연락처 공개 규칙), 파크톡 실시간

/* ---- 게시판 ---- */
alter table public.posts add column if not exists status text not null default 'published' check (status in ('pending','published'));
alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists views int not null default 0;

-- 독자칼럼은 편집자·관리자가 아니면 승인 대기로 들어감. 글쓴이가 스스로 공개로 바꿀 수 없음
create or replace function public.posts_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := case when new.board = 'column' and not public.is_editor() then 'pending' else 'published' end;
    new.author_id := coalesce(auth.uid(), new.author_id);
  else
    if not public.is_editor() then new.status := old.status; new.board := old.board; end if;
    new.author_id := old.author_id;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists posts_guard_trg on public.posts;
create trigger posts_guard_trg before insert or update on public.posts for each row execute function public.posts_guard();

drop policy if exists "posts_read" on public.posts;
create policy "posts_read" on public.posts for select using (status = 'published' or author_id = auth.uid() or public.is_editor());

-- 조회수 올리기 (누구나, 1씩만)
create or replace function public.post_view(pid bigint) returns void language sql security definer set search_path = public as $$
  update public.posts set views = views + 1 where id = pid and status = 'published';
$$;
grant execute on function public.post_view(bigint) to anon, authenticated;

/* ---- 댓글 수 (목록에 표시) ---- */
create or replace function public.comment_counts(t text, ids bigint[]) returns table(target_id bigint, n int)
language sql stable security definer set search_path = public as $$
  select target_id, count(*)::int from public.comments where target_type = t and target_id = any(ids) and not is_hidden group by target_id;
$$;
grant execute on function public.comment_counts(text, bigint[]) to anon, authenticated;

-- 댓글 글쓴이는 본인으로 고정
create or replace function public.comments_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.author_id := auth.uid(); new.is_hidden := false;
  else new.author_id := old.author_id; new.target_type := old.target_type; new.target_id := old.target_id;
       if not public.is_admin() then new.is_hidden := old.is_hidden; end if;
  end if;
  return new;
end $$;
drop trigger if exists comments_guard_trg on public.comments;
create trigger comments_guard_trg before insert or update on public.comments for each row execute function public.comments_guard();

/* ---- 조인게시판 ---- */
alter table public.joins add column if not exists title text;
alter table public.joins add column if not exists place text;               -- 구장 표에 없을 때 직접 적은 장소
alter table public.joins add column if not exists contact text not null default 'comment' check (contact in ('comment','phone','sms'));
alter table public.joins add column if not exists updated_at timestamptz not null default now();

create or replace function public.joins_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.author_id := auth.uid(); new.status := 'open';
  else new.author_id := old.author_id; new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists joins_guard_trg on public.joins;
create trigger joins_guard_trg before insert or update on public.joins for each row execute function public.joins_guard();

create or replace function public.applies_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from public.joins where id = coalesce(new.join_id, old.join_id);
  if tg_op = 'INSERT' then
    if owner = auth.uid() then raise exception '내 모집글에는 신청할 수 없습니다'; end if;
    new.user_id := auth.uid(); new.status := 'pending';
  else
    new.user_id := old.user_id; new.join_id := old.join_id;
    if auth.uid() <> owner and not public.is_admin() then new.status := old.status; end if;   -- 수락·거절은 모집한 사람만
  end if;
  return new;
end $$;
drop trigger if exists applies_guard_trg on public.join_applies;
create trigger applies_guard_trg before insert or update on public.join_applies for each row execute function public.applies_guard();

-- 모집글별 신청·수락 수 (누구나)
create or replace function public.join_counts(ids bigint[]) returns table(join_id bigint, accepted int, pending int)
language sql stable security definer set search_path = public as $$
  select join_id, count(*) filter (where status = 'accepted')::int, count(*) filter (where status = 'pending')::int
  from public.join_applies where join_id = any(ids) group by join_id;
$$;
grant execute on function public.join_counts(bigint[]) to anon, authenticated;

-- 연락처 공개 규칙: 글쓴이가 전화·문자를 고르면 로그인 회원에게 글쓴이 번호가 보임.
-- 신청이 수락되면 글쓴이와 그 신청자가 서로의 번호를 봄
create or replace function public.join_contacts(jid bigint) returns table(user_id uuid, nickname text, phone text, who text)
language plpgsql stable security definer set search_path = public as $$
declare j public.joins; me uuid := auth.uid(); acc boolean;
begin
  if me is null then return; end if;
  select * into j from public.joins where id = jid;
  if j.id is null then return; end if;
  select exists(select 1 from public.join_applies a where a.join_id = jid and a.user_id = me and a.status = 'accepted') into acc;
  if j.contact in ('phone','sms') or acc or j.author_id = me or public.is_admin() then
    return query select p.id, p.nickname, p.phone, '글쓴이'::text from public.profiles p where p.id = j.author_id;
  end if;
  if j.author_id = me or public.is_admin() then
    return query select p.id, p.nickname, p.phone, '수락된 신청자'::text from public.join_applies a join public.profiles p on p.id = a.user_id where a.join_id = jid and a.status = 'accepted';
  end if;
end $$;
grant execute on function public.join_contacts(bigint) to authenticated;

-- 신청자 별명 (모집한 사람·관리자·본인이 볼 때 쓰는 공개 별명표는 public_profiles)

/* ---- 파크톡 실시간 ---- */
create or replace function public.talk_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin new.user_id := auth.uid(); return new; end $$;
drop trigger if exists talk_guard_trg on public.talk_messages;
create trigger talk_guard_trg before insert on public.talk_messages for each row execute function public.talk_guard();
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'talk_messages') then
    alter publication supabase_realtime add table public.talk_messages;
  end if;
end $$;

grant select on public.public_profiles to anon, authenticated;
