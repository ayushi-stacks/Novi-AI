import { NextResponse } from "next/server";
import { requireCurrentUser, upsertConnection } from "../../../lib/server/data";
import { githubAuthorizeUrl } from "../../../lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/signin-with-chatgpt?return_to=/", request.url));

  try {
    await upsertConnection({ userId: user.userId, provider: "github", status: "authorizing" });
    return NextResponse.redirect(githubAuthorizeUrl(request, user.userId));
  } catch (error) {
    await upsertConnection({
      userId: user.userId,
      provider: "github",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "GitHub connection failed.",
    });
    return NextResponse.redirect(new URL("/?connection_error=github", request.url));
  }
}
