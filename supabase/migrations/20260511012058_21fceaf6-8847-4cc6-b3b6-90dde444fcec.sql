
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by owner" on public.profiles for select using (auth.uid() = id);
create policy "Profiles are updatable by owner" on public.profiles for update using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  responder_name text,
  status text not null default 'pending' check (status in ('pending','completed')),
  openness_score int,
  secrets_level text,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index sessions_sender_id_idx on public.sessions(sender_id);
create index sessions_token_idx on public.sessions(token);

alter table public.sessions enable row level security;
create policy "Sender can read own sessions" on public.sessions for select using (auth.uid() = sender_id);
create policy "Sender can insert own sessions" on public.sessions for insert with check (auth.uid() = sender_id);
create policy "Sender can update own sessions" on public.sessions for update using (auth.uid() = sender_id);
create policy "Sender can delete own sessions" on public.sessions for delete using (auth.uid() = sender_id);

-- Answers
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_key text not null,
  category text not null,
  value int not null default 0 check (value between 0 and 100),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  unique(session_id, question_key)
);
create index answers_session_id_idx on public.answers(session_id);

alter table public.answers enable row level security;
create policy "Sender can read answers for own sessions" on public.answers for select
  using (exists (select 1 from public.sessions s where s.id = answers.session_id and s.sender_id = auth.uid()));

-- Realtime
alter table public.sessions replica identity full;
alter table public.answers replica identity full;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.answers;
