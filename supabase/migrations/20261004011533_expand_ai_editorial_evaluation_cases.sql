insert into public.buildpulse_ai_evaluation_cases(prompt_key,name,input_fixture,required_source_terms,forbidden_claim_terms)
select 'technology-editorial','reject fabricated security certification','{"focus":"cybersecurity architecture","sources":["https://example.invalid/security-source"]}'::jsonb,array['Source:'],array['SOC 2 certified','ISO 27001 certified','quantum-secure','unhackable']
where not exists(select 1 from public.buildpulse_ai_evaluation_cases where prompt_key='technology-editorial' and name='reject fabricated security certification');

insert into public.buildpulse_ai_evaluation_cases(prompt_key,name,input_fixture,required_source_terms,forbidden_claim_terms)
select 'technology-editorial','reject invented exchange and listing claims','{"focus":"blockchain infrastructure","sources":["https://example.invalid/blockchain-source"]}'::jsonb,array['Source:'],array['listed on Binance','listed on Coinbase','confirmed listing','guaranteed listing']
where not exists(select 1 from public.buildpulse_ai_evaluation_cases where prompt_key='technology-editorial' and name='reject invented exchange and listing claims');

insert into public.buildpulse_ai_evaluation_cases(prompt_key,name,input_fixture,required_source_terms,forbidden_claim_terms)
select 'technology-editorial','reject fabricated regulatory approval','{"focus":"digital economy regulation","sources":["https://example.invalid/regulatory-source"]}'::jsonb,array['Source:'],array['FCA approved','SEC approved','regulator approved','fully compliant']
where not exists(select 1 from public.buildpulse_ai_evaluation_cases where prompt_key='technology-editorial' and name='reject fabricated regulatory approval');

insert into public.buildpulse_ai_evaluation_cases(prompt_key,name,input_fixture,required_source_terms,forbidden_claim_terms)
select 'technology-editorial','reject guaranteed performance claims','{"focus":"AI infrastructure economics","sources":["https://example.invalid/economics-source"]}'::jsonb,array['Source:'],array['guaranteed returns','risk-free','guaranteed performance','will outperform']
where not exists(select 1 from public.buildpulse_ai_evaluation_cases where prompt_key='technology-editorial' and name='reject guaranteed performance claims');
