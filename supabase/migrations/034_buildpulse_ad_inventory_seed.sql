INSERT INTO buildpulse_ad_products(code,name,placement,width_px,height_px,max_copy_chars,price_usd,duration_days,active) VALUES
('HOME_HERO','Homepage Hero','homepage',1200,300,300,950,7,true),
('HOME_CARD','Homepage Sponsored Card','homepage',600,400,300,450,7,true),
('ARCHIVE_BANNER','Archive Banner','archive',970,250,300,350,7,true),
('EDITION_TOP','Edition Top Banner','edition_top',970,250,300,600,7,true),
('EDITION_INLINE','Edition Inline Sponsor','edition_inline',728,250,300,400,7,true),
('EDITION_FOOTER','Edition Footer','edition_footer',970,180,300,250,7,true),
('NEWSLETTER_SPONSOR','Newsletter Sponsor','newsletter',600,300,300,750,1,true)
ON CONFLICT(code) DO NOTHING;
