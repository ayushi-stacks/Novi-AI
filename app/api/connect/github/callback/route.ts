import { NextResponse } from "next/server";
import { requireCurrentUser, upsertConnection } from "../../../../lib/server/data";
import { encryptSecret, exchangeGithubCode, parseOauthState } from "../../../../lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/signin-with-chatgpt?return_to=/", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !(await parseOauthState(state, "github", user.userId))) {
    await upsertConnection({
      userId: user.userId,
      provider: "github",
      status: "error",
      errorMessage: error ?? "GitHub OAuth state validation failed.",
    });
    return NextResponse.redirect(new URL("/?connection_error=github", request.url));
  }

  try {
    const token = await exchangeGithubCode(request, code);
    await upsertConnection({
      userId: user.userId,
      provider: "github",
      status: "connected",
      scopes: token.scope ?? null,
      encryptedAccessToken: await encryptSecret(token.access_token),
    });
    return NextResponse.redirect(new URL("/?connected=github&sync=1", request.url));
  } catch (error) {
    await upsertConnection({
      userId: user.userId,
      provider: "github",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "GitHub token exchange failed.",
    });
    return NextResponse.redirect(new URL("/?connection_error=github", request.url));
  }
}
