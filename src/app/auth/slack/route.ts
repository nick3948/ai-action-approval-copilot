import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";

/**
 * /auth/slack
 *
 * Initiates Slack account linking for an already-logged-in user.
 */
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();

  // If not logged in at all, just redirect to regular login first
  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("returnTo", "/");
    return NextResponse.redirect(loginUrl);
  }

  // Store the primary user ID in a cookie to link them after returning
  const cookieStore = await cookies();
  cookieStore.set("link_primary_userid", session.user.sub, { path: "/", maxAge: 60 * 10 });

  const linkUrl = new URL("/auth/login", req.url);
  linkUrl.searchParams.set("connection", "sign-in-with-slack");
  linkUrl.searchParams.set("returnTo", "/auth/callback-link"); // send them to linking callback
  linkUrl.searchParams.set("prompt", "login");

  return NextResponse.redirect(linkUrl);
}
