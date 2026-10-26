/**
 * Creates the Stripe products and prices for the plan catalog and writes the
 * resulting price IDs back to the `plan` table.
 *
 * Idempotent: products use deterministic IDs, and prices are matched by
 * `lookup_key` before creating anything. Re-run it after changing a plan's
 * prices — a changed amount archives the old lookup key and creates a new
 * price (Stripe prices are immutable).
 *
 * Usage: node --env-file=.env scripts/sync-stripe-prices.mjs
 */
import { Client } from "pg";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!secretKey || !databaseUrl) {
  console.error("STRIPE_SECRET_KEY and DATABASE_URL are required.");
  process.exit(1);
}

if (!secretKey.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY does not look like a secret key.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const db = new Client({ connectionString: databaseUrl });

await db.connect();

const { rows: plans } = await db.query(
  "select key, name, monthly_price_cents, annual_monthly_price_cents from plan where active = true order by sort_order",
);

async function ensureProduct(plan) {
  const id = `agentdesk_${plan.key}`;

  try {
    return await stripe.products.retrieve(id);
  } catch {
    return await stripe.products.create({
      id,
      name: `AgentDesk ${plan.name}`,
      metadata: { plan: plan.key },
    });
  }
}

async function ensurePrice(productId, lookupKey, unitAmount, interval, planKey) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const price = existing.data[0];

  if (price) {
    if (price.unit_amount === unitAmount && price.recurring?.interval === interval) {
      return price;
    }

    // Stripe prices are immutable: free the lookup key, then create a new one.
    await stripe.prices.update(price.id, { lookup_key: "" });
    console.log(`  archived ${lookupKey} (${price.unit_amount} -> ${unitAmount})`);
  }

  return stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: { plan: planKey },
  });
}

for (const plan of plans) {
  const product = await ensureProduct(plan);

  const monthly = await ensurePrice(
    product.id,
    `agentdesk_${plan.key}_monthly`,
    plan.monthly_price_cents,
    "month",
    plan.key,
  );

  const yearly = await ensurePrice(
    product.id,
    `agentdesk_${plan.key}_annual`,
    plan.annual_monthly_price_cents * 12,
    "year",
    plan.key,
  );

  await db.query(
    "update plan set stripe_price_id_monthly = $1, stripe_price_id_annual = $2, updated_at = now() where key = $3",
    [monthly.id, yearly.id, plan.key],
  );

  console.log(
    `${plan.key}: ${monthly.id} ($${(monthly.unit_amount ?? 0) / 100}/mo) · ${yearly.id} ($${(yearly.unit_amount ?? 0) / 100}/yr)`,
  );
}

await db.end();
console.log("plan stripe price ids updated");
