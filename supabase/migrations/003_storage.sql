-- 003 파일 보관함(Storage 버킷)
insert into storage.buckets (id, name, public) values
  ('article-images', 'article-images', true),   -- 기사 사진
  ('board-images',   'board-images',   true),   -- 게시판 사진
  ('avatars',        'avatars',        true),   -- 회원 프로필 사진
  ('newsletter',     'newsletter',     true)    -- 뉴스레터 그림
on conflict (id) do nothing;

-- 기사·뉴스레터 사진: 편집자만 올리기·지우기
create policy "editor_upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('article-images','newsletter') and public.is_editor());
create policy "editor_change" on storage.objects for update to authenticated
  using (bucket_id in ('article-images','newsletter') and public.is_editor());
create policy "editor_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('article-images','newsletter') and public.is_editor());

-- 게시판·프로필 사진: 회원은 자기 폴더(회원 번호 이름의 폴더)에만 올리기·지우기
create policy "member_upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('board-images','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "member_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('board-images','avatars') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
