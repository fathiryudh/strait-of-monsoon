-- Through the Haze: Supabase schema (paste into the Supabase SQL editor and run once).
create table if not exists scenes (
  id bigserial primary key,
  aoi text not null,            -- 'riau' | 'sg_reclaim'
  date date not null,           -- for kind='change': the later date
  date_from date,               -- for kind='change': the baseline date
  kind text not null,           -- 'hv' | 'change' | 'hh' | 'change_hh'
  png_url text not null,        -- public Storage URL
  bounds jsonb not null,        -- [west, south, east, north] EPSG:4326
  maturity text                 -- 'PROVISIONAL' | 'VALIDATED'
);
create table if not exists stats (
  aoi text not null, poly_id text not null, poly_name text not null,
  date date not null, mean_hv_db real not null,
  mean_hh_db real,
  primary key (aoi, poly_id, date)
);
alter table stats add column if not exists mean_hh_db real;  -- for databases created before HH was added

-- RLS on, public read only; writes come from the pipeline with the secret (service) key, which bypasses RLS.
alter table scenes enable row level security;
alter table stats enable row level security;
drop policy if exists "public read scenes" on scenes;
create policy "public read scenes" on scenes for select to anon, authenticated using (true);
drop policy if exists "public read stats" on stats;
create policy "public read stats" on stats for select to anon, authenticated using (true);

-- Public Storage bucket for overlay PNGs (public = objects readable via the public URL, no policy needed).
insert into storage.buckets (id, name, public)
values ('overlays', 'overlays', true)
on conflict (id) do update set public = true;
