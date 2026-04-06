import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { linkAccountsInAuth0 } from "@/lib/auth0-management";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.redirect(new URL("/integrations", req.url));

  const cookieStore = await cookies();
  const linkPrimaryUserId = cookieStore.get("link_primary_userid")?.value;

  if (linkPrimaryUserId && linkPrimaryUserId !== session.user.sub) {
    try {
      console.log(`[callback-link] Linking ${session.user.sub} into ${linkPrimaryUserId}`);
      await linkAccountsInAuth0(linkPrimaryUserId, session.user.sub);
    } catch (err) {
      console.error("[callback-link] Linking failed", err);
    }
    const res = NextResponse.redirect(new URL("/auth/login?returnTo=/integrations", req.url));
    res.cookies.delete("link_primary_userid");
    return res;
  }

  const res = NextResponse.redirect(new URL("/integrations", req.url));
  res.cookies.delete("link_primary_userid");
  return res;
}
