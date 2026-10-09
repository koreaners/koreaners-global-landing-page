-- 경영진 보고서 비공개 버킷. 읽기는 app_metadata.role admin, exec. 쓰기는 admin 만.
insert into storage.buckets (id, name, public)
values ('admin-reports', 'admin-reports', false)
on conflict (id) do update set public = false;

create policy "admin_reports_read" on storage.objects for select to authenticated
  using (bucket_id = 'admin-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'exec'));

create policy "admin_reports_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'admin-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin_reports_update" on storage.objects for update to authenticated
  using (bucket_id = 'admin-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'admin-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin_reports_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'admin-reports' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
