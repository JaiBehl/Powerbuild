-- Run once in the Powerbuild Supabase project's SQL Editor.
-- Each signed-in user can only read and modify their own cloud state.
create table if not exists public.powerbuild_cloud_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.powerbuild_cloud_state enable row level security;
grant select, insert, update on public.powerbuild_cloud_state to authenticated;

drop policy if exists "powerbuild_select_own" on public.powerbuild_cloud_state;
create policy "powerbuild_select_own" on public.powerbuild_cloud_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "powerbuild_insert_own" on public.powerbuild_cloud_state;
create policy "powerbuild_insert_own" on public.powerbuild_cloud_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "powerbuild_update_own" on public.powerbuild_cloud_state;
create policy "powerbuild_update_own" on public.powerbuild_cloud_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare-and-swap saves prevent a second device from silently overwriting
-- a newer version. On conflict the UI asks the user which copy to keep.
create or replace function public.powerbuild_save_state(
  p_expected_revision bigint,
  p_payload jsonb
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_expected_revision = 0 then
    insert into public.powerbuild_cloud_state (user_id,payload,revision)
    values (auth.uid(),p_payload,1)
    on conflict (user_id) do nothing
    returning revision into next_revision;
  else
    update public.powerbuild_cloud_state
      set payload = p_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = p_expected_revision
      returning revision into next_revision;
  end if;

  if next_revision is null then
    raise exception 'SYNC_CONFLICT' using errcode = 'P0001';
  end if;
  return next_revision;
end;
$$;

revoke all on function public.powerbuild_save_state(bigint,jsonb) from public, anon;
grant execute on function public.powerbuild_save_state(bigint,jsonb) to authenticated;
