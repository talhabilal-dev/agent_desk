import type { OrganizationUsage } from "@/lib/usage/service";

const tokenFormatter = new Intl.NumberFormat("en-US");

const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

export function UsageByOrganization({ usage }: { usage: OrganizationUsage[] }) {
  const totals = usage.reduce(
    (sum, row) => ({
      requests: sum.requests + row.requests,
      inputTokens: sum.inputTokens + row.inputTokens,
      outputTokens: sum.outputTokens + row.outputTokens,
      totalTokens: sum.totalTokens + row.totalTokens,
      costUsd: sum.costUsd + row.costUsd,
    }),
    {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
    },
  );

  if (usage.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an organization to start tracking usage.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Organization</th>
              <th className="pb-2 text-right font-medium">Replies</th>
              <th className="pb-2 text-right font-medium">Input</th>
              <th className="pb-2 text-right font-medium">Output</th>
              <th className="pb-2 text-right font-medium">Total tokens</th>
              <th className="pb-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {usage.map((row) => (
              <tr key={row.organizationId}>
                <td className="max-w-40 truncate py-2 font-medium">
                  {row.organizationName}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {tokenFormatter.format(row.requests)}
                </td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {tokenFormatter.format(row.inputTokens)}
                </td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {tokenFormatter.format(row.outputTokens)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {tokenFormatter.format(row.totalTokens)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {costFormatter.format(row.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 text-left">
              <td className="pt-2 font-medium">All organizations</td>
              <td className="pt-2 text-right tabular-nums">
                {tokenFormatter.format(totals.requests)}
              </td>
              <td className="pt-2 text-right tabular-nums text-muted-foreground">
                {tokenFormatter.format(totals.inputTokens)}
              </td>
              <td className="pt-2 text-right tabular-nums text-muted-foreground">
                {tokenFormatter.format(totals.outputTokens)}
              </td>
              <td className="pt-2 text-right tabular-nums">
                {tokenFormatter.format(totals.totalTokens)}
              </td>
              <td className="pt-2 text-right font-medium tabular-nums">
                {costFormatter.format(totals.costUsd)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Counted from the API&apos;s own token usage on every reply, priced at
        the rates in the <code>model_price</code> table. Costs are stored per
        call, so changing a rate never rewrites past totals. Document embeddings
        are not billed here yet.
      </p>
    </div>
  );
}
