-- Plan catalog seed. Idempotent: re-running upserts on `key`.
INSERT INTO plan (
  key, name, description,
  monthly_price_cents, annual_monthly_price_cents,
  organization_limit, page_limit, ocr_enabled, processing_tier,
  monthly_cost_ceiling_usd,
  sort_order, active
) VALUES
  (
    'starter', 'Starter',
    'For getting started with a single workspace.',
    1000, 800,
    1, 100, false, 'basic',
    2.00,
    1, true
  ),
  (
    'pro', 'Pro',
    'OCR and advanced processing across a few workspaces.',
    2500, 2200,
    3, 500, true, 'advanced',
    8.00,
    2, true
  ),
  (
    'scale', 'Scale',
    'Everything in Pro, unlimited workspaces.',
    5000, 4500,
    NULL, 1000, true, 'advanced',
    20.00,
    3, true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_monthly_price_cents = EXCLUDED.annual_monthly_price_cents,
  organization_limit = EXCLUDED.organization_limit,
  page_limit = EXCLUDED.page_limit,
  ocr_enabled = EXCLUDED.ocr_enabled,
  processing_tier = EXCLUDED.processing_tier,
  monthly_cost_ceiling_usd = EXCLUDED.monthly_cost_ceiling_usd,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();
