import { NextResponse } from "next/server";
import { getConnectionRows, requireCurrentUser, searchLife } from "../../lib/server/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  if (!user) return NextResponse.json({ mode: "demo", results: [] });

  const { query } = (await request.json().catch(() => ({ query: "" }))) as { query?: string };
  const connections = await getConnectionRows(user.userId);
  const hasConnectedSource = connections.some((connection) =>
    ["syncing", "indexing", "connected", "needs_attention"].includes(connection.status ?? ""),
  );

  if (!hasConnectedSource) {
    return NextResponse.json({
      mode: "demo",
      results: [],
      answer:
        "Connected Mode has no indexed sources yet. Connect Google or GitHub before asking about real data.",
    });
  }

  const results = query ? await searchLife(user.userId, query) : [];
  return NextResponse.json({
    mode: "connected",
    results,
    answer:
      results.length > 0
        ? `Found ${results.length} source-backed objects.`
        : "I could not find enough evidence in connected sources for that question.",
  });
}
