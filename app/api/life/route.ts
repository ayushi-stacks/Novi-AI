import { NextResponse } from "next/server";
import { getConnectionRows, getNormalizedLife, requireCurrentUser } from "../../lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ mode: "demo", entities: [], relationships: [] });

  const connections = await getConnectionRows(user.userId);
  const hasConnectedSource = connections.some((connection) =>
    ["syncing", "indexing", "connected", "needs_attention"].includes(connection.status ?? ""),
  );
  if (!hasConnectedSource) {
    return NextResponse.json({ mode: "demo", entities: [], relationships: [] });
  }

  const life = await getNormalizedLife(user.userId);
  return NextResponse.json({ mode: "connected", ...life });
}
