alter table public.buildpulse_subscribers add column if not exists delivery_timezone text not null default 'UTC';
alter table public.buildpulse_subscribers add constraint buildpulse_subscribers_delivery_timezone_length check(char_length(delivery_timezone) between 1 and 64) not valid;
alter table public.buildpulse_subscribers validate constraint buildpulse_subscribers_delivery_timezone_length;
