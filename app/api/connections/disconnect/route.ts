import { NextResponse } from "next/server";
import { db, requireCurrentUser } from "../../../lib/server/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { provider?: string } | null;
  const provider = body?.provider === "google" || body?.provider === "github" ? body.provider : null;
  if (!provider) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });

  const timestamp = new Date().toISOString();
  await db()
    .prepare(
      `UPDATE connected_accounts
       SET status = 'disconnected',
           encrypted_access_token = NULL,
           encrypted_refresh_token = NULL,
           token_expires_at = NULL,
           error_message = NULL,
           updated_at = ?
       WHERE user_id = ? AND provider = ?`,
    )
    .bind(timestamp, user.userId, provider)
    .run();

  return NextResponse.json({ ok: true });
}
