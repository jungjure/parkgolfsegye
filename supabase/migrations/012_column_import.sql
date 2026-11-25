-- 012 parkgolfnews.org 독자칼럼 옮겨 오기: 원래 글쓴이 이름, 출처 키, 글 사이 사진([[img:주소]] 줄)
-- 서버(SQL)에서 넣을 때(auth.uid() 없음)는 그대로 두고, 회원이 쓸 때는 이름·출처를 바꿀 수 없음
alter table public.posts add column if not exists author_name text;
alter table public.posts add column if not exists source_key text;
create unique index if not exists posts_source_key_idx on public.posts (source_key);
alter table public.comments add column if not exists author_name text;
alter table public.comments add column if not exists source_key text;
create unique index if not exists comments_source_key_idx on public.comments (source_key);

create or replace function public.posts_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- 서버에서 옮겨 넣는 글 (회원·손님은 RLS로 막힘)
  if tg_op = 'INSERT' then
    new.status := case when new.board = 'column' and not public.is_editor() then 'pending' else 'published' end;
    new.admin_note := null;
    new.author_id := coalesce(auth.uid(), new.author_id);
    if not public.is_editor() then new.author_name := null; new.source_key := null; end if;
  else
    if not public.is_editor() then
      new.board := old.board; new.admin_note := old.admin_note;
      new.author_name := old.author_name; new.source_key := old.source_key;
      -- 돌려받은 칼럼을 글쓴이가 고치면 다시 승인 대기로
      new.status := case when old.status = 'rejected' and old.board = 'column' then 'pending' else old.status end;
    end if;
    new.author_id := old.author_id;
    new.updated_at := now();
  end if;
  return new;
end $$;

create or replace function public.comments_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- 서버에서 옮겨 넣는 댓글
  if tg_op = 'INSERT' then new.author_id := auth.uid(); new.is_hidden := false; new.author_name := null; new.source_key := null;
  else new.author_id := old.author_id; new.target_type := old.target_type; new.target_id := old.target_id;
       new.author_name := old.author_name; new.source_key := old.source_key;
       if not public.is_admin() then new.is_hidden := old.is_hidden; end if;
  end if;
  return new;
end $$;
