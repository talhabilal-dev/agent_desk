import { defineRelations } from "drizzle-orm";

import * as appSchema from "./app-schema";
import * as authSchema from "./auth-schema";

const schema = { ...authSchema, ...appSchema };

/** Relations using the drizzle-orm v1 relational API (`defineRelations`). */
export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    organizations: r.many.organization({
      from: r.user.id,
      to: r.organization.ownerId,
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  organization: {
    owner: r.one.user({
      from: r.organization.ownerId,
      to: r.user.id,
    }),
    documents: r.many.document({
      from: r.organization.id,
      to: r.document.organizationId,
    }),
    embeddings: r.many.embedding({
      from: r.organization.id,
      to: r.embedding.organizationId,
    }),
  },
  document: {
    organization: r.one.organization({
      from: r.document.organizationId,
      to: r.organization.id,
    }),
    embeddings: r.many.embedding({
      from: r.document.id,
      to: r.embedding.documentId,
    }),
  },
  embedding: {
    organization: r.one.organization({
      from: r.embedding.organizationId,
      to: r.organization.id,
    }),
    document: r.one.document({
      from: r.embedding.documentId,
      to: r.document.id,
    }),
  },
}));
