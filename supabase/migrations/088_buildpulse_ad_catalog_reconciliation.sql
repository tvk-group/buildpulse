-- BuildPulse advertising catalog reconciliation.
-- Mirrors live Stripe bindings already verified against the USD catalog.
insert into public.buildpulse_ad_products (code,name,placement,price_usd,duration_days,active,stripe_product_id,stripe_price_id,stripe_payment_link_id)
values
('SPONSOR_RAIL','Sponsor Rail Card','homepage',300,7,true,'prod_VN0gb34eBoLYMo','price_1UMGfEFNggxvOzlnukYBDazA','plink_1UMGfGFNggxvOzlnwBSNd3ru'),
('SECTION_LEADERBOARD','Section Leaderboard','edition_top',500,7,true,'prod_VN0gFaK6NIvXZw','price_1UMGfLFNggxvOzlnpFhoUoGf','plink_1UMGfNFNggxvOzlnIsvEpok0'),
('EXHIBITION_CARD','Exhibition & Museum Card','homepage',400,14,true,'prod_VN19sYF0zmuISO','price_1UMH7BFNggxvOzlnuHpxfVTk','plink_1UMH7EFNggxvOzlnRmUlFSCx'),
('ARTS_SPOTLIGHT','Arts & Culture Spotlight','homepage',650,7,true,'prod_VN19FwJVAVcnRb','price_1UMH6zFNggxvOzlnZxo6Iklt','plink_1UMH72FNggxvOzlntefJHqup'),
('ARTS_SECTION_SPONSOR','Arts Section Sponsor','edition_top',900,7,true,'prod_VN19NNAiobqniM','price_1UMH75FNggxvOzlnI4dfz4Jr','plink_1UMH77FNggxvOzln17Mlcd6S')
on conflict (code) do update set
 name=excluded.name,placement=excluded.placement,price_usd=excluded.price_usd,duration_days=excluded.duration_days,active=excluded.active,
 stripe_product_id=excluded.stripe_product_id,stripe_price_id=excluded.stripe_price_id,stripe_payment_link_id=excluded.stripe_payment_link_id,updated_at=now();
