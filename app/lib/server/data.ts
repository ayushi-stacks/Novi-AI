import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export type Provider = "google" | "github";
export type ConnectionStatus =
  | "not_connected"
  | "connecting"
  | "authorizing"
  | "syncing"
  | "indexing"
  | "connected"
  | "needs_attention"
  | "error"
  | "disconnected";

export type LifeEntity = {
  id: string;
  label: string;
  type: string;
  summary: string;
  signal: string;
  detail: string;
  provider?: string | null;
  sourceUrl?: string | null;
};

type Db = D1Database;

export function db(): Db {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured.");
  }
  return env.DB;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function requireCurrentUser() {
  const user = await getChatGPTUser();
  if (!user) {
    return null;
  }

  const timestamp = nowIso();
  await db()
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    )
    .bind(user.userId, user.email, user.displayName, timestamp, timestamp)
    .run();

  return user;
}

export async function getConnectionRows(userId: string) {
  const result = await db()
    .prepare(
      `SELECT provider, provider_account_id, display_name, email, status, scopes,
              last_synced_at, error_message, updated_at
       FROM connected_accounts
       WHERE user_id = ?
       ORDER BY provider`,
    )
    .bind(userId)
    .all<Record<string, string | null>>();

  return result.results ?? [];
}

export async function upsertConnection(input: {
  userId: string;
  provider: Provider;
  providerAccountId?: string | null;
  displayName?: string | null;
  email?: string | null;
  status: ConnectionStatus;
  scopes?: string | null;
  encryptedAccessToken?: string | null;
  encryptedRefreshToken?: string | null;
  tokenExpiresAt?: string | null;
  syncCursor?: string | null;
  errorMessage?: string | null;
}) {
  const timestamp = nowIso();
  const id = createId("acct");
  await db()
    .prepare(
      `INSERT INTO connected_accounts (
         id, user_id, provider, provider_account_id, display_name, email, status,
         scopes, encrypted_access_token, encrypted_refresh_token, token_expires_at,
         sync_cursor, error_message, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         provider_account_id = excluded.provider_account_id,
         display_name = excluded.display_name,
         email = excluded.email,
         status = excluded.status,
         scopes = excluded.scopes,
         encrypted_access_token = excluded.encrypted_access_token,
         encrypted_refresh_token = COALESCE(excluded.encrypted_refresh_token, connected_accounts.encrypted_refresh_token),
         token_expires_at = excluded.token_expires_at,
         sync_cursor = excluded.sync_cursor,
         error_message = excluded.error_message,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.userId,
      input.provider,
      input.providerAccountId ?? null,
      input.displayName ?? null,
      input.email ?? null,
      input.status,
      input.scopes ?? null,
      input.encryptedAccessToken ?? null,
      input.encryptedRefreshToken ?? null,
      input.tokenExpiresAt ?? null,
      input.syncCursor ?? null,
      input.errorMessage ?? null,
      timestamp,
      timestamp,
    )
    .run();
}

export async function queueSyncJob(userId: string, provider: Provider, kind: "initial" | "incremental" | "webhook") {
  const timestamp = nowIso();
  await db()
    .prepare(
      `INSERT INTO sync_jobs (id, user_id, provider, kind, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
    )
    .bind(createId("sync"), userId, provider, kind, timestamp, timestamp)
    .run();
}

// --- Sync job + cursor tracking used by the actual sync runners --------
// (as opposed to queueSyncJob above, which just leaves an audit-trail
// marker row when a provider is first connected).

export async function createSyncJob(
  userId: string,
  provider: Provider,
  kind: "initial" | "incremental" | "webhook" | "action",
) {
  const timestamp = nowIso();
  const id = createId("sync");
  await db()
    .prepare(
      `INSERT INTO sync_jobs (id, user_id, provider, kind, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?)`,
    )
    .bind(id, userId, provider, kind, timestamp, timestamp)
    .run();
  return id;
}

export async function completeSyncJob(
  jobId: string,
  patch: { status: "complete" | "error"; total: number; processed: number; errorMessage?: string | null },
) {
  const timestamp = nowIso();
  await db()
    .prepare(
      `UPDATE sync_jobs
       SET status = ?, total = ?, processed = ?, error_message = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(patch.status, patch.total, patch.processed, patch.errorMessage ?? null, timestamp, jobId)
    .run();
}

export async function getGoogleAccountForSync(userId: string) {
  return db()
    .prepare(
      `SELECT encrypted_access_token, encrypted_refresh_token, token_expires_at, sync_cursor
       FROM connected_accounts
       WHERE user_id = ? AND provider = 'google'
         AND status IN ('syncing', 'indexing', 'connected', 'needs_attention')`,
    )
    .bind(userId)
    .first<{
      encrypted_access_token: string | null;
      encrypted_refresh_token: string | null;
      token_expires_at: string | null;
      sync_cursor: string | null;
    }>();
}

export async function updateGoogleAccessToken(
  userId: string,
  encryptedAccessToken: string,
  tokenExpiresAt: string | null,
) {
  const timestamp = nowIso();
  await db()
    .prepare(
      `UPDATE connected_accounts
       SET encrypted_access_token = ?, token_expires_at = ?, updated_at = ?
       WHERE user_id = ? AND provider = 'google'`,
    )
    .bind(encryptedAccessToken, tokenExpiresAt, timestamp, userId)
    .run();
}

export async function updateSyncCursor(userId: string, provider: Provider, cursor: string | null) {
  const timestamp = nowIso();
  await db()
    .prepare(`UPDATE connected_accounts SET sync_cursor = ?, updated_at = ? WHERE user_id = ? AND provider = ?`)
    .bind(cursor, timestamp, userId, provider)
    .run();
}

export async function finishAccountSync(
  userId: string,
  provider: Provider,
  patch: { status: ConnectionStatus; errorMessage?: string | null },
) {
  const timestamp = nowIso();
  await db()
    .prepare(
      `UPDATE connected_accounts
       SET status = ?, last_synced_at = ?, error_message = ?, updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    )
    .bind(patch.status, timestamp, patch.errorMessage ?? null, timestamp, userId, provider)
    .run();
}

// GitHub OAuth Apps issue non-expiring tokens (no refresh_token/expires_in),
// so unlike getGoogleAccountForSync this doesn't need expiry tracking.
export async function getGithubAccountForSync(userId: string) {
  return db()
    .prepare(
      `SELECT encrypted_access_token, sync_cursor
       FROM connected_accounts
       WHERE user_id = ? AND provider = 'github'
         AND status IN ('syncing', 'indexing', 'connected', 'needs_attention')`,
    )
    .bind(userId)
    .first<{ encrypted_access_token: string | null; sync_cursor: string | null }>();
}

// Records the provider's own username/email against the connection row
// (e.g. GitHub login) without touching status, tokens, or cursor.
export async function updateConnectionProfile(
  userId: string,
  provider: Provider,
  patch: { displayName?: string | null; email?: string | null },
) {
  const timestamp = nowIso();
  await db()
    .prepare(
      `UPDATE connected_accounts SET display_name = ?, email = ?, updated_at = ? WHERE user_id = ? AND provider = ?`,
    )
    .bind(patch.displayName ?? null, patch.email ?? null, timestamp, userId, provider)
    .run();
}

export async function getNormalizedLife(userId: string) {
  const entityRows = await db()
    .prepare(
      `SELECT id, title, type, summary, body, provider, source_url, source_updated_at
       FROM entities
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 60`,
    )
    .bind(userId)
    .all<Record<string, string | null>>();

  const relationshipRows = await db()
    .prepare(
      `SELECT from_entity_id, to_entity_id, type, confidence
       FROM relationships
       WHERE user_id = ?
       ORDER BY confidence DESC
       LIMIT 80`,
    )
    .bind(userId)
    .all<Record<string, string | number>>();

  return {
    entities: (entityRows.results ?? []).map((row) => ({
      id: row.id ?? "",
      label: row.title ?? "Untitled",
      type: row.type ?? "document",
      summary: row.summary ?? "Indexed source object",
      signal: row.provider ? `${row.provider} source` : "source",
      detail: row.body ?? row.summary ?? "No detail indexed yet.",
      provider: row.provider,
      sourceUrl: row.source_url,
    })),
    relationships: relationshipRows.results ?? [],
  };
}

export async function searchLife(userId: string, query: string) {
  const term = `%${query.toLowerCase()}%`;
  const result = await db()
    .prepare(
      `SELECT e.id, e.title, e.type, e.summary, e.provider, e.source_url
       FROM entities e
       LEFT JOIN search_index s ON s.entity_id = e.id
       WHERE e.user_id = ?
         AND (lower(e.title) LIKE ? OR lower(COALESCE(e.summary, '')) LIKE ? OR lower(COALESCE(s.content, '')) LIKE ?)
       GROUP BY e.id
       ORDER BY e.updated_at DESC
       LIMIT 12`,
    )
    .bind(userId, term, term, term)
    .all<Record<string, string | null>>();

  return result.results ?? [];
}

export async function upsertSourceEntity(input: {
  userId: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  provider: Provider;
  providerId: string;
  sourceUrl?: string | null;
  sourceUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const timestamp = nowIso();
  const id = createId("ent");
  await db()
    .prepare(
      `INSERT INTO entities (
         id, user_id, type, title, summary, body, provider, provider_id,
         source_url, source_updated_at, sync_metadata, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, provider, provider_id) DO UPDATE SET
         type = excluded.type,
         title = excluded.title,
         summary = excluded.summary,
         body = excluded.body,
         source_url = excluded.source_url,
         source_updated_at = excluded.source_updated_at,
         sync_metadata = excluded.sync_metadata,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.userId,
      input.type,
      input.title,
      input.summary,
      input.body,
      input.provider,
      input.providerId,
      input.sourceUrl ?? null,
      input.sourceUpdatedAt ?? null,
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    )
    .run();

  const entity = await db()
    .prepare(
      `SELECT id FROM entities
       WHERE user_id = ? AND provider = ? AND provider_id = ?`,
    )
    .bind(input.userId, input.provider, input.providerId)
    .first<{ id: string }>();

  if (entity?.id) {
    await db()
      .prepare(
        `INSERT INTO search_index (id, user_id, entity_id, provider, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           content = excluded.content,
           metadata = excluded.metadata,
           updated_at = excluded.updated_at`,
      )
      .bind(
        `search_${entity.id}`,
        input.userId,
        entity.id,
        input.provider,
        `${input.title}\n${input.summary}\n${input.body}`,
        JSON.stringify(input.metadata ?? {}),
        timestamp,
        timestamp,
      )
      .run();
  }
}
