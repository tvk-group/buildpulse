UPDATE public.buildpulse_sources
SET enabled=false,last_fetch_status='failed',last_fetch_error='Configured Anadolu RSS endpoint returned text/html instead of RSS/XML on 2026-10-03.'
WHERE name IN ('Anadolu Agency Türkiye','Anadolu Agency English');

INSERT INTO public.buildpulse_sources(name,base_url,source_type,trust_tier,enabled,feed_url,category,fetch_interval_minutes,country_code,source_language,geographic_scope)
SELECT v.name,v.feed_url,'publication',1,true,v.feed_url,v.category,30,v.country_code,'tr',v.scope
FROM (VALUES
 ('TRT Haber Türkiye','https://www.trthaber.com/turkiye_articles.rss','local','TR','country'),
 ('TRT Haber Dünya','https://www.trthaber.com/dunya_articles.rss','world',NULL,'global'),
 ('TRT Haber Gündem','https://www.trthaber.com/gundem_articles.rss','politics','TR','country'),
 ('TRT Haber Ekonomi','https://www.trthaber.com/ekonomi_articles.rss','economy','TR','country'),
 ('TRT Haber Bilim Teknoloji','https://www.trthaber.com/bilim_teknoloji_articles.rss','technology','TR','country')
) AS v(name,feed_url,category,country_code,scope)
WHERE NOT EXISTS(SELECT 1 FROM public.buildpulse_sources s WHERE s.name=v.name);
