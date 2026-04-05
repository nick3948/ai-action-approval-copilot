import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * /auth/github
 *
 * Initiates GitHub account linking for an already-logged-in user.
 */
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();

  // If not logged in at all, just redirect to regular login first
  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("returnTo", "/");
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in — initiate GitHub account linking
  // The Auth0 SDK's /auth/login with connection=github will:
  // 1. Redirect user to GitHub OAuth
  // 2. On callback, Auth0 detects existing session and LINKS (not replaces) the identity
  // This works because Auth0 uses the existing session cookie to link accounts
  const linkUrl = new URL("/auth/login", req.url);
  linkUrl.searchParams.set("connection", "github");
  linkUrl.searchParams.set("returnTo", "/");
  linkUrl.searchParams.set("prompt", "login");

  return NextResponse.redirect(linkUrl);
}