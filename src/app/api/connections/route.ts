import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getConnectedServices } from "@/lib/auth0-management";

/**
 * GET /api/connections
 * Returns which third-party services the logged-in user has connected.
 * Used by the frontend to show connection status badges.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connected = await getConnectedServices(session.user.sub);
  return NextResponse.json({ connected });
}
