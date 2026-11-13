-- =============================================================================
-- ZAVEN MIGRATION 0006: DEDICATED DISTRICT & GPS COORDINATE COLUMNS ON ORDERS
-- Migration: 20261113000006_order_location_columns.sql
-- Layers cleanly on top of existing migrations 0001, 0002, 0003, and 0005.
-- =============================================================================

begin;

alter table public.orders
  add column if not exists district text,
  add column if not exists location_coordinates jsonb;

alter table public.orders
  drop constraint if exists orders_location_coordinates_valid_check;

alter table public.orders
  add constraint orders_location_coordinates_valid_check
  check (
    location_coordinates is null
    or (
      jsonb_typeof(location_coordinates) = 'object'
      and (location_coordinates ? 'lat')
      and (location_coordinates ? 'lng')
      and jsonb_typeof(location_coordinates -> 'lat') = 'number'
      and jsonb_typeof(location_coordinates -> 'lng') = 'number'
    )
  );

create index if not exists idx_orders_region_district
  on public.orders (region, district);

comment on column public.orders.district is
  'Customer-selected district or city within the Uzbekistan region (e.g., Yunusobod tumani).';

comment on column public.orders.location_coordinates is
  'Optional customer-shared browser geolocation object: {"lat": number, "lng": number, "accuracyMeters": number}.';

commit;
