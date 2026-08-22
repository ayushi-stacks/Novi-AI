import { NextResponse } from "next/server";
import { createId, db, nowIso, requireCurrentUser } from "../../../lib/server/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload?.provider || !payload?.actionType) {
    return NextResponse.json({ error: "provider and actionType are required." }, { status: 400 });
  }

  const timestamp = nowIso();
  const id = createId("action");
  await db()
    .prepare(
      `INSERT INTO action_history (id, user_id, provider, action_type, status, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'proposed', ?, ?, ?)`,
    )
    .bind(id, user.userId, payload.provider, payload.actionType, JSON.stringify(payload), timestamp, timestamp)
    .run();

  return NextResponse.json({
    id,
    status: "proposed",
    requiresConfirmation: true,
  });
}
