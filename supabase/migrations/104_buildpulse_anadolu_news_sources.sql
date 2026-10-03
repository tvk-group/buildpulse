INSERT INTO buildpulse_sources(name,base_url,source_type,trust_tier,enabled,feed_url,category,fetch_interval_minutes)
VALUES
('Anadolu Agency English','https://www.aa.com.tr/en/','publication',1,true,'https://www.aa.com.tr/rss/ajansgunceleng.xml','world',30),
('Anadolu Agency Türkiye','https://www.aa.com.tr/tr/','publication',1,true,'https://www.aa.com.tr/rss/ajansguncel.xml','turkiye',30)
ON CONFLICT(base_url) DO UPDATE SET name=EXCLUDED.name,source_type=EXCLUDED.source_type,trust_tier=EXCLUDED.trust_tier,enabled=EXCLUDED.enabled,feed_url=EXCLUDED.feed_url,category=EXCLUDED.category,fetch_interval_minutes=EXCLUDED.fetch_interval_minutes;