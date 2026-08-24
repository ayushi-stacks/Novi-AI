import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const connectedAccounts = sqliteTable(
  "connected_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google", "github"] }).notNull(),
    providerAccountId: text("provider_account_id"),
    displayName: text("display_name"),
    email: text("email"),
    status: text("status", {
      enum: [
        "not_connected",
        "connecting",
        "authorizing",
        "syncing",
        "indexing",
        "connected",
        "needs_attention",
        "error",
        "disconnected",
      ],
    }).notNull(),
    scopes: text("scopes"),
    encryptedAccessToken: text("encrypted_access_token"),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenExpiresAt: text("token_expires_at"),
    syncCursor: text("sync_cursor"),
    lastSyncedAt: text("last_synced_at"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userProviderIdx: uniqueIndex("idx_connected_accounts_user_provider").on(
      table.userId,
      table.provider,
    ),
    statusIdx: index("idx_connected_accounts_status").on(table.status),
  }),
);

export const syncJobs = sqliteTable(
  "sync_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").references(() => connectedAccounts.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["google", "github"] }).notNull(),
    kind: text("kind", { enum: ["initial", "incremental", "webhook", "action"] }).notNull(),
    status: text("status", { enum: ["queued", "running", "complete", "error"] }).notNull(),
    total: integer("total").notNull().default(0),
    processed: integer("processed").notNull().default(0),
    cursor: text("cursor"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userStatusIdx: index("idx_sync_jobs_user_status").on(table.userId, table.status),
  }),
);

export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body"),
    provider: text("provider"),
    providerId: text("provider_id"),
    sourceUrl: text("source_url"),
    sourceUpdatedAt: text("source_updated_at"),
    syncMetadata: text("sync_metadata"),
    confidence: real("confidence").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    sourceIdx: uniqueIndex("idx_entities_user_source").on(
      table.userId,
      table.provider,
      table.providerId,
    ),
    typeIdx: index("idx_entities_user_type").on(table.userId, table.type),
    searchIdx: index("idx_entities_title").on(table.title),
  }),
);

export const relationships = sqliteTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    fromEntityId: text("from_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    toEntityId: text("to_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    confidence: real("confidence").notNull(),
    evidence: text("evidence"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    relationIdx: uniqueIndex("idx_relationships_unique").on(
      table.userId,
      table.fromEntityId,
      table.toEntityId,
      table.type,
    ),
  }),
);

export const searchIndex = sqliteTable(
  "search_index",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    provider: text("provider"),
    content: text("content").notNull(),
    embeddingRef: text("embedding_ref"),
    metadata: text("metadata"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    entityIdx: index("idx_search_index_entity").on(table.entityId),
  }),
);

export const actionHistory = sqliteTable(
  "action_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    actionType: text("action_type").notNull(),
    status: text("status", { enum: ["proposed", "confirmed", "executed", "cancelled", "error"] }).notNull(),
    payload: text("payload").notNull(),
    result: text("result"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userStatusIdx: index("idx_action_history_user_status").on(table.userId, table.status),
  }),
);
