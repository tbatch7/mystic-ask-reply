
-- Restrict to authenticated role
drop policy "Profiles are viewable by owner" on public.profiles;
drop policy "Profiles are updatable by owner" on public.profiles;
drop policy "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles are updatable by owner" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy "Sender can read own sessions" on public.sessions;
drop policy "Sender can insert own sessions" on public.sessions;
drop policy "Sender can update own sessions" on public.sessions;
drop policy "Sender can delete own sessions" on public.sessions;
create policy "Sender can read own sessions" on public.sessions for select to authenticated using (auth.uid() = sender_id);
create policy "Sender can insert own sessions" on public.sessions for insert to authenticated with check (auth.uid() = sender_id);
create policy "Sender can update own sessions" on public.sessions for update to authenticated using (auth.uid() = sender_id);
create policy "Sender can delete own sessions" on public.sessions for delete to authenticated using (auth.uid() = sender_id);

drop policy "Sender can read answers for own sessions" on public.answers;
create policy "Sender can read answers for own sessions" on public.answers for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = answers.session_id and s.sender_id = auth.uid()));

-- Restrict trigger function execution
revoke execute on function public.handle_new_user() from public, anon, authenticated;
