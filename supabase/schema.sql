-- ═══════════════════════════════════════════════════════════════════
--  AguaVista — esquema de Supabase
--  Ejecutar entero en el SQL Editor del proyecto. Es idempotente:
--  se puede volver a correr sin romper nada.
-- ═══════════════════════════════════════════════════════════════════

-- ── LEADS ──────────────────────────────────────────────────────────
-- Cada envío del formulario de contacto del sitio público.
create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text not null,
  interest    text not null,
  message     text,
  locale      text,
  user_agent  text,
  -- Estado de gestión comercial, editable desde el panel.
  status      text not null default 'nuevo'
              check (status in ('nuevo', 'contactado', 'archivado')),
  notes       text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

alter table public.leads enable row level security;

-- Sin políticas: la tabla queda cerrada a la anon key del navegador.
-- El sitio escribe y el panel lee con SUPABASE_SERVICE_ROLE_KEY, que
-- saltea RLS. Es deliberado: nadie debe poder listar los leads desde
-- el cliente.


-- ── AMENITIES ──────────────────────────────────────────────────────
-- Contenido editable de la sección "Todo lo que hace único a AguaVista".
create table if not exists public.amenities (
  id                  text primary key,
  sort_order          int  not null default 0,
  enabled             boolean not null default true,
  -- Portada: la foto de la tarjeta del riel y la primera del carrusel.
  image               text not null,
  -- Fotos adicionales de la zona, en orden y SIN repetir la portada.
  -- El sitio arma el carrusel como [image, ...gallery].
  gallery             text[] not null default '{}',
  video               text,
  -- Marca editorial. Ya no cambia la geometria de la tarjeta (el riel usa
  -- un encuadre unico para todas), pero se conserva para ordenar.
  featured            boolean not null default false,

  title_es            text,
  title_en            text,
  title_pt            text,

  description_es      text,
  description_en      text,
  description_pt      text,

  description_long_es text,
  description_long_en text,
  description_long_pt text,

  updated_at          timestamptz not null default now()
);

-- Migracion para bases que ya corrieron una version anterior de este
-- archivo: `create table if not exists` no agrega columnas a una tabla que
-- ya existe, asi que la columna nueva se suma aparte. Es idempotente, se
-- puede volver a correr el schema completo sin romper nada.
alter table public.amenities
  add column if not exists gallery text[] not null default '{}';

create index if not exists amenities_order_idx on public.amenities (sort_order);

alter table public.amenities enable row level security;

-- Lectura pública: el sitio las muestra a cualquiera.
drop policy if exists "amenities lectura publica" on public.amenities;
create policy "amenities lectura publica"
  on public.amenities for select
  using (enabled = true);

-- La escritura queda solo para el service role (el panel).


-- ── SITE SETTINGS ──────────────────────────────────────────────────
-- Pares clave/valor para medios globales del sitio (video del hero,
-- su poster, etc.) sin tener que tocar código.
create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "settings lectura publica" on public.site_settings;
create policy "settings lectura publica"
  on public.site_settings for select
  using (true);


-- ── ZONAS Y LOTES (masterplan) ─────────────────────────────────────
-- Ya existían; se dejan acá para que el esquema quede completo.
create table if not exists public.zonas (
  id          text primary key,
  title       text,
  polygon     text,
  microimage  text,
  imagen_360  text,
  imagen_2d   text,
  pitch       numeric,
  yaw         numeric
);

create table if not exists public.lotes (
  id        text primary key,
  zona_id   text references public.zonas (id) on delete cascade,
  number    text,
  points    text,
  center_x  numeric,
  center_y  numeric,
  size      text,
  price     text,
  status    text default 'disponible',
  features  jsonb default '[]'::jsonb,
  housetour jsonb default '[]'::jsonb
);

alter table public.zonas enable row level security;
alter table public.lotes enable row level security;

drop policy if exists "zonas lectura publica" on public.zonas;
create policy "zonas lectura publica" on public.zonas for select using (true);

drop policy if exists "lotes lectura publica" on public.lotes;
create policy "lotes lectura publica" on public.lotes for select using (true);


-- ── STORAGE ────────────────────────────────────────────────────────
-- Bucket público para las imágenes y videos que se suben desde el panel.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media lectura publica" on storage.objects;
create policy "media lectura publica"
  on storage.objects for select
  using (bucket_id = 'media');

-- La subida y el borrado los hace el panel con el service role.
