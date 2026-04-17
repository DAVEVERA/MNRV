-- MNRV initial schema: anonymous conversations, messages, and qualified leads.
-- All writes happen via the Next.js Edge routes using the service_role key.
-- RLS stays enabled with no policies so anon/authenticated cannot read or write directly.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  locale text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  name text,
  email text,
  company text,
  phone text,
  locale text,
  scope text,
  budget_range text,
  timeline text,
  stack text[],
  raw_notes text,
  source_url text,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
