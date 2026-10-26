import { and, eq } from "drizzle-orm";

import { db, document, organization } from "@/db";
import { inngest } from "@/inngest/client";
import { requireApiSession } from "@/lib/organizations/guard";
import { organizationIdSchema } from "@/lib/validations/organization";
import { isStalled } from "@/utils/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json({ error: "Invalid document id." }, { status: 400 });
  }

  const [owned] = await db
    .select({
      id: document.id,
      status: document.status,
      content: document.content,
      updatedAt: document.updatedAt,
    })
    .from(document)
    .innerJoin(organization, eq(document.organizationId, organization.id))
    .where(
      and(
        eq(document.id, id.data),
        eq(organization.ownerId, auth.session.user.id),
      ),
    )
    .limit(1);

  if (!owned) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  // A stalled row (worker died, or a run failed before it was recorded) must be
  // recoverable too, otherwise it sits on "processing" forever.
  const retryable =
    owned.status === "failed" ||
    owned.status === "extracted" ||
    isStalled(owned.status, owned.updatedAt);

  if (!retryable) {
    return Response.json(
      { error: "Only failed, unindexed or stalled documents can be retried." },
      { status: 409 },
    );
  }

  // Text already extracted -> only embed. Otherwise start from scratch.
  const hasContent = owned.content.trim().length > 0;

  await db
    .update(document)
    .set({
      status: hasContent ? "extracted" : "pending",
      errorText: null,
    })
    .where(eq(document.id, owned.id));

  try {
    await inngest.send({
      // A fresh event id so Inngest's 24h dedupe doesn't swallow the retry.
      id: `document-${owned.id}-${Date.now()}`,
      name: hasContent
        ? "document/embed.requested"
        : "document/ingest.requested",
      data: { documentId: owned.id },
    });
  } catch (error) {
    console.error("[documents] failed to enqueue retry", error);

    return Response.json(
      {
        error: "Could not queue processing. Is the Inngest dev server running?",
      },
      { status: 503 },
    );
  }

  return Response.json({
    retried: true,
    stage: hasContent ? "embed" : "extract",
  });
}
