-- ==========================================
-- SUPABASE SCHEMA CONFIGURATION FOR QUORIDOR
-- ==========================================

-- 1. Create the profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  fingerprint text,
  xp integer default 0,
  wins integer default 0,
  losses integer default 0,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: If you already created the table, run this instead:
-- ALTER TABLE public.profiles ADD COLUMN fingerprint text;

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create RLS Policies
-- Allow anyone to read profiles (useful for leaderboards)
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

-- Allow users to insert their own profile
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 4. Set up Realtime (optional, for live leaderboards)
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table profiles;

-- 5. Create a trigger to automatically create a profile when a new user signs up
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
  
  -- Handle duplicate usernames by appending a random suffix
  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
    counter := counter + 1;
    if counter > 10 then
      exit; -- Prevent infinite loop just in case
    end if;
  end loop;

  -- If still colliding (unlikely), use id-derived name so insert cannot violate unique(username)
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Create games table for online multiplayer
create table public.games (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references public.profiles(id) not null,
  player2_id uuid references public.profiles(id),
  state jsonb not null,
  status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  winner_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.games enable row level security;

create policy "Games are viewable by everyone"
  on public.games for select using (true);

create policy "Users can create games"
  on public.games for insert
  with check (auth.uid() = player1_id);

create policy "Players can update games"
  on public.games for update
  using (auth.uid() = player1_id or auth.uid() = player2_id or player2_id is null);

alter publication supabase_realtime add table games;
