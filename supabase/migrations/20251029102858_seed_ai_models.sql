-- Seed data for ai_models table
-- Source: workspace/LLMModel_export (2).csv

-- OpenAI Models
INSERT INTO public.ai_models (provider, model_id, label, is_active, is_basic, sort_order) VALUES
('openai', 'gpt-5', 'GPT-5', false, false, 1000),
('openai', 'gpt-5-mini', 'GPT-5 mini', false, false, 1010),
('openai', 'gpt-5-nano', 'GPT-5 nano', false, false, 1020),
('openai', 'o1', 'o1', true, false, 1030),
('openai', 'o1-mini', 'o1-mini', true, false, 1040),
('openai', 'gpt-4o', 'GPT-4o', true, false, 1050),
('openai', 'gpt-4o-mini', 'GPT-4o mini', true, true, 1060),
('openai', 'chatgpt-4o-latest', 'ChatGPT-4o (Latest)', true, false, 1070);

-- Claude Models
INSERT INTO public.ai_models (provider, model_id, label, is_active, is_basic, sort_order) VALUES
('claude', 'claude-opus-4-1-20250805', 'Claude Opus 4.1 (2025-08-05)', true, false, 2000),
('claude', 'claude-opus-4-20250514', 'Claude Opus 4.0 (2025-05-14)', true, false, 2010),
('claude', 'claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5 (2025-09-29)', true, false, 2020),
('claude', 'claude-sonnet-4-20250514', 'Claude Sonnet 4.0 (2025-05-14)', true, false, 2030),
('claude', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku (2024-10-22)', true, true, 2040);

-- Gemini Models
INSERT INTO public.ai_models (provider, model_id, label, is_active, is_basic, sort_order) VALUES
('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', true, false, 3000),
('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', true, true, 3010),
('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', true, true, 3020);
