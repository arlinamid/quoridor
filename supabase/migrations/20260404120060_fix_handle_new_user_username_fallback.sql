-- Ensure new auth users always get a unique profile username (avoids auth signup 500 when collision loop exits early)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter integer := 1;
begin
  base_username := coalesce(new.raw_user_meta_data->>'username', 'Játékos_' || substr(new.id::text, 1, 6));
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
    counter := counter + 1;
    if counter > 10 then
      exit;
    end if;
  end loop;

  if exists (select 1 from public.profiles where username = final_username) then
    final_username := 'Játékos_' || replace(new.id::text, '-', '');
  end if;

  insert into public.profiles (id, username, fingerprint)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'fingerprint'
  );
  return new;
end;
$$;
