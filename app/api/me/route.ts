import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    user,
    signInUrl: "/signin-with-chatgpt?return_to=%2F",
    signOutUrl: "/signout-with-chatgpt?return_to=%2F",
  });
}
