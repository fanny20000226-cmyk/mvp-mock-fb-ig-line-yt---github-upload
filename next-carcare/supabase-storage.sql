insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do update set public = true;

drop policy if exists car_images_select on storage.objects;
drop policy if exists car_images_insert on storage.objects;
drop policy if exists car_images_update on storage.objects;
drop policy if exists car_images_delete on storage.objects;

create policy car_images_select on storage.objects
for select using (bucket_id = 'car-images');

create policy car_images_insert on storage.objects
for insert with check (bucket_id = 'car-images' and auth.role() = 'authenticated');

create policy car_images_update on storage.objects
for update using (bucket_id = 'car-images' and auth.role() = 'authenticated')
with check (bucket_id = 'car-images' and auth.role() = 'authenticated');

create policy car_images_delete on storage.objects
for delete using (bucket_id = 'car-images' and auth.role() = 'authenticated');
