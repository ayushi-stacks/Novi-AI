import { NextResponse } from "next/server";
import {
  completeSyncJob,
  createSyncJob,
  finishAccountSync,
  getGoogleAccountForSync,
  requireCurrentUser,
  updateGoogleAccessToken,
  updateSyncCursor,
} from "../../../lib/server/data";
import { decryptSecret, encryptSecret, refreshGoogleAccessToken } from "../../../lib/server/oauth";
import {
  GoogleAuthError,
  parseCursor,
  serializeCursor,
  syncCalendar,
  syncDrive,
  syncGmail,
} from "../../../lib/server/google-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const account = await getGoogleAccountForSync(user.userId);
  if (!account?.encrypted_access_token) {
    return NextResponse.json({ error: "Google is not connected." }, { status: 400 });
  }

  const cursor = parseCursor(account.sync_cursor);
  const hasCursor = Boolean(cursor.gmailHistoryId || cursor.calendarSyncToken || cursor.driveStartPageToken);
  const jobId = await createSyncJob(user.userId, "google", hasCursor ? "incremental" : "initial");

  let accessToken = await decryptSecret(account.encrypted_access_token);

  const failJob = async (message: string) => {
    await finishAccountSync(user.userId, "google", { status: "error", errorMessage: message });
    await completeSyncJob(jobId, { status: "error", total: 0, processed: 0, errorMessage: message });
  };

  const refresh = async () => {
    if (!account.encrypted_refresh_token) {
      throw new Error("Google access token expired and no refresh token is stored. Reconnect Google.");
    }
    const refreshToken = await decryptSecret(account.encrypted_refresh_token);
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.access_token;
    const newExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : null;
    await updateGoogleAccessToken(user.userId, await encryptSecret(accessToken), newExpiresAt);
  };

  // Refresh proactively if the stored token is already expired or is about
  // to expire, instead of waiting to get a 401 mid-sync.
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const aboutToExpire = !expiresAt || expiresAt - Date.now() < 2 * 60 * 1000;
  if (aboutToExpire) {
    try {
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google token refresh failed.";
      await failJob(message);
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  const runAllSources = () =>
    Promise.all([
      syncGmail(user.userId, accessToken, cursor.gmailHistoryId),
      syncCalendar(user.userId, accessToken, cursor.calendarSyncToken),
      syncDrive(user.userId, accessToken, cursor.driveStartPageToken),
    ]);

  let gmail: Awaited<ReturnType<typeof syncGmail>>;
  let calendar: Awaited<ReturnType<typeof syncCalendar>>;
  let drive: Awaited<ReturnType<typeof syncDrive>>;

  try {
    [gmail, calendar, drive] = await runAllSources();
  } catch (error) {
    // A source only throws (rather than reporting a per-source error) when
    // Google rejected the access token itself. Refresh once and retry the
    // whole sync; any other failure fails the job outright.
    if (!(error instanceof GoogleAuthError)) {
      const message = error instanceof Error ? error.message : "Google sync failed.";
      await failJob(message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    try {
      await refresh();
      [gmail, calendar, drive] = await runAllSources();
    } catch (retryError) {
      const message =
        retryError instanceof Error
          ? retryError.message
          : "Google rejected the access token and refresh failed. Reconnect Google.";
      await failJob(message);
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  const nextCursor = serializeCursor({
    gmailHistoryId: gmail.historyId ?? cursor.gmailHistoryId,
    calendarSyncToken: calendar.syncToken ?? cursor.calendarSyncToken,
    driveStartPageToken: drive.startPageToken ?? cursor.driveStartPageToken,
  });
  await updateSyncCursor(user.userId, "google", nextCursor);

  const counts = { emails: gmail.count, events: calendar.count, documents: drive.count };
  const total = counts.emails + counts.events + counts.documents;
  const partialErrors = [gmail.error, calendar.error, drive.error].filter((value): value is string => Boolean(value));

  // A partial failure (one source errored, others succeeded) still leaves
  // real synced data in place, so the account moves to "needs_attention"
  // rather than wiping progress with a hard "error" status.
  await finishAccountSync(user.userId, "google", {
    status: partialErrors.length > 0 ? "needs_attention" : "connected",
    errorMessage: partialErrors.length > 0 ? partialErrors.join(" | ") : null,
  });
  await completeSyncJob(jobId, {
    status: "complete",
    total,
    processed: total,
    errorMessage: partialErrors.length > 0 ? partialErrors.join(" | ") : null,
  });

  return NextResponse.json({
    ok: true,
    counts,
    partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
  });
}
