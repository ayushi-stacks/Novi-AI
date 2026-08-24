import { upsertSourceEntity } from "./data";

// This module owns the actual Gmail/Calendar/Drive API calls used by
// /api/sync/google. It is split out from the route so the route can stay
// focused on token refresh, job bookkeeping, and error aggregation.
//
// Each sync function is incremental-first: if a provider-supplied cursor is
// available it fetches only what changed since that cursor. If no cursor is
// available (first sync, or the cursor expired) it falls back to a bounded
// initial fetch and establishes a fresh cursor for next time.

export type GoogleCursor = {
  gmailHistoryId?: string;
  calendarSyncToken?: string;
  driveStartPageToken?: string;
};

export function parseCursor(raw: string | null | undefined): GoogleCursor {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GoogleCursor) : {};
  } catch {
    return {};
  }
}

export function serializeCursor(cursor: GoogleCursor) {
  return JSON.stringify(cursor);
}

// Thrown when Google rejects the access token itself (401). The route
// catches this specifically to trigger a refresh-and-retry, as opposed to a
// normal per-source failure which should not abort the other two sources.
export class GoogleAuthError extends Error {}

type HttpError = Error & { status?: number };

async function googleFetch<T>(url: string, accessToken: string): Promise<T> {
  const backoffMs = [300, 900, 2000];
  let attempt = 0;

  while (true) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
    if (response.ok) return response.json() as Promise<T>;

    if (response.status === 401) throw new GoogleAuthError("Google access token was rejected.");

    if ((response.status === 429 || response.status >= 500) && attempt < backoffMs.length) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
      attempt += 1;
      continue;
    }

    const text = await response.text();
    const error = new Error(`Google API request failed (${response.status}): ${text.slice(0, 200)}`) as HttpError;
    error.status = response.status;
    throw error;
  }
}

function header(headers: { name: string; value: string }[] | undefined, name: string) {
  return headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value;
}

type SyncResult = { count: number; error: string | null };

// --- Gmail ---------------------------------------------------------------

type GmailMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

async function upsertGmailMessage(userId: string, accessToken: string, id: string) {
  const message = await googleFetch<GmailMessage>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
    accessToken,
  );
  const headers = message.payload?.headers ?? [];
  const subject = header(headers, "Subject") || "Untitled email";
  const from = header(headers, "From");
  const date = header(headers, "Date");
  await upsertSourceEntity({
    userId,
    type: "email",
    title: subject,
    summary: from ? `Email from ${from}` : "Gmail message",
    body: message.snippet ?? "",
    provider: "google",
    providerId: `gmail:${message.id}`,
    sourceUrl: `https://mail.google.com/mail/u/0/#all/${message.id}`,
    sourceUpdatedAt: date ? new Date(date).toISOString() : null,
    metadata: { threadId: message.threadId, from, to: header(headers, "To"), date },
  });
}

export async function syncGmail(
  userId: string,
  accessToken: string,
  historyId: string | undefined,
): Promise<SyncResult & { historyId?: string }> {
  let count = 0;
  let nextHistoryId = historyId;

  try {
    if (historyId) {
      const messageIds = new Set<string>();
      let pageToken: string | undefined;
      let pages = 0;
      let latestHistoryId = historyId;

      do {
        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
        url.searchParams.set("startHistoryId", historyId);
        url.searchParams.set("historyTypes", "messageAdded");
        url.searchParams.set("maxResults", "50");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const page = await googleFetch<{
          history?: { messagesAdded?: { message: { id: string } }[] }[];
          historyId?: string;
          nextPageToken?: string;
        }>(url.toString(), accessToken);

        for (const entry of page.history ?? []) {
          for (const added of entry.messagesAdded ?? []) {
            messageIds.add(added.message.id);
          }
        }
        if (page.historyId) latestHistoryId = page.historyId;
        pageToken = page.nextPageToken;
        pages += 1;
      } while (pageToken && pages < 5);

      for (const id of messageIds) {
        await upsertGmailMessage(userId, accessToken, id);
        count += 1;
      }
      nextHistoryId = latestHistoryId;
    } else {
      const list = await googleFetch<{ messages?: { id: string }[] }>(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=newer_than:30d",
        accessToken,
      );
      for (const ref of list.messages ?? []) {
        await upsertGmailMessage(userId, accessToken, ref.id);
        count += 1;
      }
      const profile = await googleFetch<{ historyId?: string }>(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        accessToken,
      );
      nextHistoryId = profile.historyId;
    }
    return { count, historyId: nextHistoryId, error: null };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    const status = (error as HttpError).status;
    if (status === 404 && historyId) {
      // Gmail only retains ~30 days of history; an old startHistoryId 404s.
      // Fall back to a fresh windowed sync and re-establish the baseline.
      return syncGmail(userId, accessToken, undefined);
    }
    return { count, historyId, error: error instanceof Error ? error.message : "Gmail sync failed." };
  }
}

// --- Calendar --------------------------------------------------------------

type CalendarEvent = {
  id: string;
  status?: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  location?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string }[];
};

async function upsertCalendarEvent(userId: string, event: CalendarEvent) {
  await upsertSourceEntity({
    userId,
    type: "event",
    title: event.summary || "Untitled event",
    summary:
      event.start?.dateTime || event.start?.date
        ? `Calendar event at ${event.start.dateTime ?? event.start.date}`
        : "Calendar event",
    body: event.description ?? event.location ?? "",
    provider: "google",
    providerId: `calendar:${event.id}`,
    sourceUrl: event.htmlLink ?? null,
    sourceUpdatedAt: event.updated ?? null,
    metadata: {
      location: event.location,
      attendees: event.attendees?.map((attendee) => attendee.displayName ?? attendee.email),
    },
  });
}

export async function syncCalendar(
  userId: string,
  accessToken: string,
  syncToken: string | undefined,
): Promise<SyncResult & { syncToken?: string }> {
  let count = 0;
  let nextSyncToken = syncToken;

  try {
    let pageToken: string | undefined;
    let pages = 0;
    let latestSyncToken: string | undefined = syncToken;
    const maxPages = syncToken ? 5 : 4;

    do {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("maxResults", "50");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      } else if (syncToken) {
        // Incremental calls may only carry the sync token (no time bounds
        // or orderBy) per the Calendar API's sync semantics.
        url.searchParams.set("syncToken", syncToken);
      } else {
        // First-ever sync: bound the window and order results.
        const now = new Date();
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("timeMin", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
        url.searchParams.set("timeMax", new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString());
      }

      const page = await googleFetch<{
        items?: CalendarEvent[];
        nextPageToken?: string;
        nextSyncToken?: string;
      }>(url.toString(), accessToken);

      for (const event of page.items ?? []) {
        if (event.status === "cancelled") continue;
        await upsertCalendarEvent(userId, event);
        count += 1;
      }
      if (page.nextSyncToken) latestSyncToken = page.nextSyncToken;
      pageToken = page.nextPageToken;
      pages += 1;
    } while (pageToken && pages < maxPages);

    nextSyncToken = latestSyncToken;
    return { count, syncToken: nextSyncToken, error: null };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    const status = (error as HttpError).status;
    if (status === 410 && syncToken) {
      // Sync token expired or invalid; Google requires a full resync.
      return syncCalendar(userId, accessToken, undefined);
    }
    return { count, syncToken, error: error instanceof Error ? error.message : "Calendar sync failed." };
  }
}

// --- Drive -------------------------------------------------------------

type DriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  modifiedTime?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
};

async function upsertDriveFile(userId: string, file: DriveFile) {
  await upsertSourceEntity({
    userId,
    type: "document",
    title: file.name || "Untitled Drive file",
    summary: file.mimeType ? `Drive file: ${file.mimeType}` : "Drive file",
    body: `Owner: ${file.owners?.map((owner) => owner.displayName ?? owner.emailAddress).join(", ") ?? "unknown"}`,
    provider: "google",
    providerId: `drive:${file.id}`,
    sourceUrl: file.webViewLink ?? null,
    sourceUpdatedAt: file.modifiedTime ?? null,
    metadata: { mimeType: file.mimeType, owners: file.owners },
  });
}

export async function syncDrive(
  userId: string,
  accessToken: string,
  startPageToken: string | undefined,
): Promise<SyncResult & { startPageToken?: string }> {
  let count = 0;
  let nextStartPageToken = startPageToken;

  try {
    if (startPageToken) {
      let pageToken: string | undefined = startPageToken;
      let pages = 0;
      let latestToken = startPageToken;

      do {
        const url = new URL("https://www.googleapis.com/drive/v3/changes");
        url.searchParams.set("pageToken", pageToken);
        url.searchParams.set("pageSize", "50");
        url.searchParams.set(
          "fields",
          "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,webViewLink,modifiedTime,owners(displayName,emailAddress)))",
        );

        const page = await googleFetch<{
          changes?: { fileId: string; removed?: boolean; file?: DriveFile }[];
          nextPageToken?: string;
          newStartPageToken?: string;
        }>(url.toString(), accessToken);

        for (const change of page.changes ?? []) {
          if (change.removed || !change.file) continue;
          await upsertDriveFile(userId, change.file);
          count += 1;
        }
        if (page.newStartPageToken) latestToken = page.newStartPageToken;
        pageToken = page.nextPageToken;
        pages += 1;
      } while (pageToken && pages < 5);

      nextStartPageToken = latestToken;
    } else {
      const list = await googleFetch<{ files?: DriveFile[] }>(
        "https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,mimeType,webViewLink,modifiedTime,owners(displayName,emailAddress))",
        accessToken,
      );
      for (const file of list.files ?? []) {
        await upsertDriveFile(userId, file);
        count += 1;
      }
      const start = await googleFetch<{ startPageToken?: string }>(
        "https://www.googleapis.com/drive/v3/changes/startPageToken",
        accessToken,
      );
      nextStartPageToken = start.startPageToken;
    }
    return { count, startPageToken: nextStartPageToken, error: null };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    const status = (error as HttpError).status;
    if ((status === 404 || status === 400) && startPageToken) {
      // Invalid/expired page token; fall back to a fresh listing + baseline.
      return syncDrive(userId, accessToken, undefined);
    }
    return { count, startPageToken, error: error instanceof Error ? error.message : "Drive sync failed." };
  }
}
