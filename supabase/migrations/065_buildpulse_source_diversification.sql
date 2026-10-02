INSERT INTO buildpulse_sources(name,base_url,source_type,trust_tier,enabled,feed_url,category,fetch_interval_minutes)
VALUES
('Google AI Blog','https://blog.google/innovation-and-ai/technology/ai/','official',1,true,'https://blog.google/technology/ai/rss/','ai',60),
('Microsoft Security Blog','https://www.microsoft.com/en-us/security/blog/','official',1,true,'https://www.microsoft.com/en-us/security/blog/feed/','security',60),
('GitHub Blog','https://github.blog/','official',1,true,'https://github.blog/feed/','developer-infrastructure',60),
('AWS Security Blog','https://aws.amazon.com/blogs/security/','official',1,true,'https://aws.amazon.com/blogs/security/feed/','security',60)
ON CONFLICT(base_url) DO UPDATE SET name=EXCLUDED.name,source_type=EXCLUDED.source_type,trust_tier=EXCLUDED.trust_tier,enabled=EXCLUDED.enabled,feed_url=EXCLUDED.feed_url,category=EXCLUDED.category,fetch_interval_minutes=EXCLUDED.fetch_interval_minutes;
