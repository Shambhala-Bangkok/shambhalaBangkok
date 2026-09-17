create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) > 0),
  excerpt text not null default '',
  content text not null default '',
  date date not null default current_date,
  author text not null default 'Bangkok Shambhala',
  tags text[] not null default '{}',
  image text,
  published boolean not null default false,
  section text check (section is null or section in (
    'shambhala-vision', 'what-we-offer', 'bibliography', 'resources', 'membership'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_date_idx on public.posts (published, date desc);
create index if not exists posts_section_idx on public.posts (section) where published = true;

alter table public.posts enable row level security;

drop policy if exists "Published posts are publicly readable" on public.posts;
create policy "Published posts are publicly readable"
  on public.posts for select
  using (published = true);

