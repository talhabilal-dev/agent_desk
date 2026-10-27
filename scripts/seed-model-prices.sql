-- Rate card for token billing. Idempotent: safe to re-run.
-- Prices are USD per 1,000,000 tokens.
--   gpt-5.4-mini: $0.75 in / $4.50 out (cached input $0.075, unused here)
insert into model_price (model, input_per_million, output_per_million)
values
  ('gpt-5.4-mini', 0.75, 4.50)
on conflict (model) do update set
  input_per_million = excluded.input_per_million,
  output_per_million = excluded.output_per_million,
  updated_at = now();
