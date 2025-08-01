-- Create the messages table
create table messages (
  id bigint primary key generated always as identity,
  role text not null,
  content text not null,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table messages enable row level security;

-- Create policy to allow public read access
create policy "public can read messages"
  on public.messages
  for select
  to anon
  using (true);

-- Create policy to allow public insert access
create policy "public can insert messages"
  on public.messages
  for insert
  to anon
  with check (true); 