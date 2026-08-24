import { NextResponse } from "next/server";
import { queueSyncJob, requireCurrentUser, upsertConnection } from "../../../../lib/server/data";
import { encryptSecret, exchangeGoogleCode, parseOauthState } from "../../../../lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/signin-with-chatgpt?return_to=/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !parseOauthState(state, "google", user.userId)) {
    await upsertConnection({
      userId: user.userId,
      provider: "google",
      status: "error",
      errorMessage: error ?? "Google OAuth state validation failed.",
    });
    return NextResponse.redirect(new URL("/?connection_error=google", request.url));
  }

  try {
    const token = await exchangeGoogleCode(request, code);
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;
    await upsertConnection({
      userId: user.userId,
      provider: "google",
      status: "syncing",
      scopes: token.scope ?? null,
      encryptedAccessToken: await encryptSecret(token.access_token),
      encryptedRefreshToken: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
      tokenExpiresAt: expiresAt,
    });
    await queueSyncJob(user.userId, "google", "initial");
    return NextResponse.redirect(new URL("/?connected=google", request.url));
  } catch (error) {
    await upsertConnection({
      userId: user.userId,
      provider: "google",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Google token exchange failed.",
    });
    return NextResponse.redirect(new URL("/?connection_error=google", request.url));
  }
}
