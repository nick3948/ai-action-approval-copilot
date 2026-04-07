import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === "/auth/callback" && url.searchParams.has("error")) {
    console.log(`[Middleware Intercept] Auth0 error caught: ${url.searchParams.get("error")}`);
    return NextResponse.redirect(new URL("/integrations", request.url));
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
