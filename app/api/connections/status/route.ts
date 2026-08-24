import { NextResponse } from "next/server";
import { getConnectionRows, requireCurrentUser } from "../../../lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ mode: "demo", providers: [] });
  }

  const rows = await getConnectionRows(user.userId);
  const providers = ["google", "github"].map((provider) => {
    const row = rows.find((item) => item.provider === provider);
    return {
      provider,
      status: row?.status ?? "not_connected",
      displayName: row?.display_name ?? null,
      email: row?.email ?? null,
      lastSyncedAt: row?.last_synced_at ?? null,
      errorMessage: row?.error_message ?? null,
    };
  });

  const connected = providers.some((provider) =>
    ["syncing", "indexing", "connected", "needs_attention"].includes(provider.status),
  );

  return NextResponse.json({ mode: connected ? "connected" : "demo", providers });
}
