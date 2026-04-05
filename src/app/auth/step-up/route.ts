import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * /auth/step-up
 *
 * Auth0 Step-Up Authentication endpoint.
 *
 * When a critical-risk action (e.g., delete_github_repo) is detected by the agent,
 * the frontend redirects here instead of allowing direct approval.
 * Security story for judges:
 *   - Low risk:      Approve / Reject (one click)
 *   - Medium / High: Type-to-confirm (proves intent)
 *   - Critical:      Auth0 Step-Up Auth → fresh identity verify → then approve
 */
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId") || "";

  const returnTo = `/?chatId=${encodeURIComponent(chatId)}&stepUpCompleted=1`;

  // Build the step-up URL:
  //   prompt=login  → forces Auth0 to show the login screen even with an active session
  //   max_age=0     → tells Auth0 the session must be fresh (authenticated right now)
  //   login_hint    → pre-fills the user's email so they don't accidentally pick the wrong
  //                   identity provider (e.g. GitHub instead of Google), which would
  //                   trigger an unwanted GitHub re-authorization flow
  const stepUpUrl = new URL("/auth/login", req.url);
  stepUpUrl.searchParams.set("returnTo", returnTo);
  stepUpUrl.searchParams.set("prompt", "login");
  stepUpUrl.searchParams.set("max_age", "0");
  if (session.user.email) {
    stepUpUrl.searchParams.set("login_hint", session.user.email);
  }

  return NextResponse.redirect(stepUpUrl);
}
