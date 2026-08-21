import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session-edge";

const publicRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  // Server actions handle their own auth via requireSession() → redirect().
  // A 307 from here would replay the POST at /login and produce a 405.
  const isServerAction = request.headers.get("next-action") !== null;

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  if (!session && !isPublicRoute && !isServerAction) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
