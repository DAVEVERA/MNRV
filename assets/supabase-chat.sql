create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  visitor_id uuid,
  admin_id uuid,
  sender text not null check (sender in ('visitor', 'agent')),
  message text not null check (char_length(message) between 1 and 2000),
  page_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages add column if not exists visitor_id uuid;
alter table public.chat_messages add column if not exists admin_id uuid;

create index if not exists chat_messages_visitor_created_idx
on public.chat_messages (visitor_id, created_at);

create index if not exists chat_messages_conversation_created_idx
on public.chat_messages (conversation_id, created_at);

alter table public.chat_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.chat_messages to authenticated;
grant insert (conversation_id, visitor_id, sender, message, page_path, user_agent)
on public.chat_messages
to authenticated;

create or replace function public.is_chat_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('info@mnrv.nl', 'info@mnrv.ai');
$$;

drop policy if exists "Allow public visitor chat inserts" on public.chat_messages;
drop policy if exists "Visitors can read own chat" on public.chat_messages;
drop policy if exists "Visitors can create own messages" on public.chat_messages;
drop policy if exists "Admins can read all chats" on public.chat_messages;
drop policy if exists "Admins can send agent messages" on public.chat_messages;

create policy "Visitors can read own chat"
on public.chat_messages
for select
to authenticated
using (
  visitor_id = (select auth.uid())
  or public.is_chat_admin()
);

create policy "Visitors can create own messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender = 'visitor'
  and visitor_id = (select auth.uid())
  and char_length(message) between 1 and 2000
);

create policy "Admins can read all chats"
on public.chat_messages
for select
to authenticated
using (public.is_chat_admin());

create policy "Admins can send agent messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender = 'agent'
  and public.is_chat_admin()
  and visitor_id is not null
  and char_length(message) between 1 and 2000
);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
