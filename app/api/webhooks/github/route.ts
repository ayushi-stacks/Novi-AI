import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook secret or signature missing." }, { status: 401 });
  }

  const expected = await hmacSha256(secret, body);
  if (!timingSafeEqual(signature, `sha256=${expected}`)) {
    return NextResponse.json({ error: "Invalid GitHub webhook signature." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    queued: true,
    note: "Signature verified. Production sync workers should enqueue repository normalization from this payload.",
  });
}

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}
