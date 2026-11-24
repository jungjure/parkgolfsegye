-- 002 권한 규칙 (RLS: 누가 읽고 쓸 수 있는지)
-- 기본 원칙: 읽기는 누구나, 쓰기는 로그인한 회원, 고치기·지우기는 본인 또는 관리자

-- 관리자·편집자 확인 함수
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('editor','admin'));
$$;

alter table public.profiles      enable row level security;
alter table public.venues        enable row level security;
alter table public.events        enable row level security;
alter table public.articles      enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.reactions     enable row level security;
alter table public.joins         enable row level security;
alter table public.join_applies  enable row level security;
alter table public.talk_messages enable row level security;
alter table public.subscribers   enable row level security;
alter table public.page_views    enable row level security;

-- 회원: 본인과 관리자만 전체 정보를 봄 (다른 사람은 public_profiles의 별명만)
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "profiles_admin" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- 구장·일정: 누구나 읽기, 편집자만 쓰기
create policy "venues_read" on public.venues for select using (true);
create policy "venues_write" on public.venues for all using (public.is_editor()) with check (public.is_editor());
create policy "events_read" on public.events for select using (true);
create policy "events_write" on public.events for all using (public.is_editor()) with check (public.is_editor());

-- 기사: 공개된 기사만 누구나 읽기, 편집자는 전부
create policy "articles_read" on public.articles for select using (is_published or public.is_editor());
create policy "articles_write" on public.articles for all using (public.is_editor()) with check (public.is_editor());

-- 게시글
create policy "posts_read" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts_update" on public.posts for update using (author_id = auth.uid() or public.is_admin());
create policy "posts_delete" on public.posts for delete using (author_id = auth.uid() or public.is_admin());

-- 댓글 (관리자가 숨긴 댓글은 안 보임)
create policy "comments_read" on public.comments for select using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy "comments_insert" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "comments_update" on public.comments for update using (author_id = auth.uid() or public.is_admin());
create policy "comments_delete" on public.comments for delete using (author_id = auth.uid() or public.is_admin());

-- 반응
create policy "reactions_read" on public.reactions for select using (true);
create policy "reactions_insert" on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy "reactions_update" on public.reactions for update using (user_id = auth.uid());
create policy "reactions_delete" on public.reactions for delete using (user_id = auth.uid());

-- 조인 모집글
create policy "joins_read" on public.joins for select using (true);
create policy "joins_insert" on public.joins for insert to authenticated with check (author_id = auth.uid());
create policy "joins_update" on public.joins for update using (author_id = auth.uid() or public.is_admin());
create policy "joins_delete" on public.joins for delete using (author_id = auth.uid() or public.is_admin());

-- 조인 신청: 신청자, 모집한 사람, 관리자만 봄
create policy "applies_read" on public.join_applies for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.joins j where j.id = join_id and j.author_id = auth.uid()));
create policy "applies_insert" on public.join_applies for insert to authenticated with check (user_id = auth.uid());
create policy "applies_update" on public.join_applies for update using (
  public.is_admin() or exists (select 1 from public.joins j where j.id = join_id and j.author_id = auth.uid()));
create policy "applies_delete" on public.join_applies for delete using (user_id = auth.uid() or public.is_admin());

-- 파크톡: 로그인한 회원만 읽고 쓰기
create policy "talk_read" on public.talk_messages for select to authenticated using (true);
create policy "talk_insert" on public.talk_messages for insert to authenticated with check (user_id = auth.uid());
create policy "talk_delete" on public.talk_messages for delete using (user_id = auth.uid() or public.is_admin());

-- 뉴스레터 구독: 누구나 신청, 목록은 관리자만
create policy "subscribers_insert" on public.subscribers for insert to anon, authenticated with check (true);
create policy "subscribers_admin" on public.subscribers for all using (public.is_admin()) with check (public.is_admin());

-- 방문 통계: 누구나 기록, 보기는 관리자만
create policy "views_insert" on public.page_views for insert to anon, authenticated with check (true);
create policy "views_admin" on public.page_views for select using (public.is_admin());
