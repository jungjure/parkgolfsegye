
-- 004 API 접근 권한 (실제 허용 범위는 002의 RLS 규칙이 정함)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.subscribers, public.page_views to anon;
grant usage, select on all sequences in schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
