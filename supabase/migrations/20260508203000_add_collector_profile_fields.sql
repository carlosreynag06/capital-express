alter table public.collectors
add column if not exists address text,
add column if not exists identification_number text;
