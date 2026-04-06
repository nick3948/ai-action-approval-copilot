import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";

/**
 * /auth/github
 */
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();

  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("returnTo", "/");
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in — initiate GitHub account linking
  // Store the primary user ID in a cookie to link them after returning
  const cookieStore = await cookies();
  cookieStore.set("link_primary_userid", session.user.sub, { path: "/", maxAge: 60 * 10 });

  const linkUrl = new URL("/auth/login", req.url);
  linkUrl.searchParams.set("connection", "github");
  linkUrl.searchParams.set("connection_scope", "repo");
  linkUrl.searchParams.set("returnTo", "/auth/callback-link");
  linkUrl.searchParams.set("prompt", "login");

  return NextResponse.redirect(linkUrl);
}