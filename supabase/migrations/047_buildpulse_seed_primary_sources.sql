INSERT INTO buildpulse_sources(name,base_url,source_type,trust_tier,enabled,feed_url,category,fetch_interval_minutes)
VALUES
('OpenAI News','https://openai.com/news/','official',1,true,'https://openai.com/news/rss.xml','ai',60),
('U.S. SEC Press Releases','https://www.sec.gov/newsroom/press-releases','regulator',1,true,'https://www.sec.gov/news/pressreleases.rss','digital-economy',60),
('Ethereum Foundation Blog','https://blog.ethereum.org/','official',1,true,'https://blog.ethereum.org/feed.xml','blockchain',60),
('Cloudflare Blog','https://blog.cloudflare.com/','official',1,true,'https://blog.cloudflare.com/rss/','security',60)
ON CONFLICT(base_url) DO UPDATE SET name=EXCLUDED.name,source_type=EXCLUDED.source_type,trust_tier=EXCLUDED.trust_tier,enabled=EXCLUDED.enabled,feed_url=EXCLUDED.feed_url,category=EXCLUDED.category,fetch_interval_minutes=EXCLUDED.fetch_interval_minutes;
